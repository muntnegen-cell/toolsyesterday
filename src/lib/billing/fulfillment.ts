import "server-only";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionStatus } from "@/types/database";

// Every function here is idempotent: Stripe retries webhooks, and the success page runs the
// same fulfillment, so the same event can arrive several times in any order.

type Admin = ReturnType<typeof createAdminClient>;

function idOf(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : (value?.id ?? null);
}

const INTERVALS = ["day", "week", "month", "year"] as const;
function toInterval(value: string | undefined): (typeof INTERVALS)[number] {
  return INTERVALS.find((i) => i === value) ?? "month";
}

function toIso(unixSeconds: number | null | undefined) {
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;
}

async function linkCustomer(admin: Admin, userId: string, customerId: string | null) {
  if (!customerId) return;
  await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId).is("stripe_customer_id", null);
}

async function userIdForCustomer(admin: Admin, customerId: string | null) {
  if (!customerId) return null;
  const { data } = await admin.from("profiles").select("id").eq("stripe_customer_id", customerId).maybeSingle();
  return data?.id ?? null;
}

export async function fulfillCheckoutSession(sessionId: string) {
  const stripe = getStripe();
  const admin = createAdminClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });

  const userId = session.metadata?.user_id ?? session.client_reference_id;
  if (!userId) throw new Error(`Checkout session ${session.id} has no user_id`);
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return { fulfilled: false as const, reason: session.payment_status };
  }

  await linkCustomer(admin, userId, idOf(session.customer));

  if (session.mode === "payment") {
    const documentId = session.metadata?.document_id;
    const paymentIntentId = idOf(session.payment_intent);
    if (!documentId || !paymentIntentId) throw new Error(`Checkout session ${session.id} is missing metadata`);

    // ignoreDuplicates: a re-delivered event must never flip a refunded payment back to succeeded.
    const { error: paymentError } = await admin.from("payments").upsert(
      {
        id: paymentIntentId,
        user_id: userId,
        document_id: documentId,
        kind: "report",
        amount_cents: session.amount_total ?? 0,
        currency: session.currency ?? "eur",
        status: "succeeded",
        customer_email: session.customer_details?.email ?? null,
        stripe_checkout_session_id: session.id,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
    if (paymentError) throw paymentError;

    const { data: payment } = await admin.from("payments").select("status").eq("id", paymentIntentId).single();
    if (payment?.status === "succeeded") {
      const { error } = await admin
        .from("documents")
        .update({ unlocked_at: new Date().toISOString() })
        .eq("id", documentId)
        .eq("user_id", userId)
        .is("unlocked_at", null);
      if (error) throw error;
    }
    return { fulfilled: true as const };
  }

  if (session.mode === "subscription" && session.subscription && typeof session.subscription !== "string") {
    await syncSubscription(session.subscription, userId);
    return { fulfilled: true as const };
  }

  return { fulfilled: false as const, reason: "unsupported_mode" };
}

export async function syncSubscriptionById(subscriptionId: string) {
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  await syncSubscription(subscription);
}

export async function syncSubscription(subscription: Stripe.Subscription, userIdHint?: string) {
  const admin = createAdminClient();
  const customerId = idOf(subscription.customer);
  const userId =
    subscription.metadata?.user_id ?? userIdHint ?? (await userIdForCustomer(admin, customerId));
  if (!userId) throw new Error(`No user for subscription ${subscription.id}`);

  await linkCustomer(admin, userId, customerId);

  // Since API 2025-03-31 the billing period lives on the subscription item, not the subscription.
  const item = subscription.items.data[0];
  const price = item?.price;
  const { error } = await admin.from("subscriptions").upsert(
    {
      id: subscription.id,
      user_id: userId,
      status: subscription.status as SubscriptionStatus,
      price_id: price?.id ?? "unknown",
      amount_cents: (price?.unit_amount ?? 0) * (item?.quantity ?? 1),
      currency: price?.currency ?? "eur",
      interval: toInterval(price?.recurring?.interval),
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_start: toIso(item?.current_period_start),
      current_period_end: toIso(item?.current_period_end),
      canceled_at: toIso(subscription.canceled_at),
      ended_at: toIso(subscription.ended_at),
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

export async function recordInvoicePayment(invoice: Stripe.Invoice) {
  const subscriptionId = idOf(invoice.parent?.subscription_details?.subscription);
  if (!subscriptionId || invoice.amount_paid <= 0) return;

  // Ensures the subscription row exists first (payments.subscription_id is a foreign key),
  // because invoice.paid can arrive before customer.subscription.created.
  await syncSubscriptionById(subscriptionId);

  const admin = createAdminClient();
  const { data: sub } = await admin.from("subscriptions").select("user_id").eq("id", subscriptionId).single();

  const { error } = await admin.from("payments").upsert(
    {
      id: invoice.id,
      user_id: sub?.user_id ?? null,
      subscription_id: subscriptionId,
      kind: "subscription",
      amount_cents: invoice.amount_paid,
      currency: invoice.currency,
      status: "succeeded",
      customer_email: invoice.customer_email,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) throw error;
}

export async function handleRefund(charge: Stripe.Charge) {
  // Partial refunds keep access; only a full refund re-locks a one-off report.
  if (!charge.refunded) return;
  const paymentIntentId = idOf(charge.payment_intent);
  if (!paymentIntentId) return;

  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .update({ status: "refunded" })
    .eq("id", paymentIntentId)
    .select("kind, document_id")
    .maybeSingle();

  if (payment?.kind === "report" && payment.document_id) {
    await admin.from("documents").update({ unlocked_at: null }).eq("id", payment.document_id);
  }
}
