import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { env } from "@/lib/env";
import {
  fulfillCheckoutSession,
  handleRefund,
  recordInvoicePayment,
  syncSubscriptionById,
} from "@/lib/billing/fulfillment";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Handlers re-fetch objects from the API instead of trusting the payload, so they work
// regardless of the API version configured on the webhook endpoint.
async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await fulfillCheckoutSession(event.data.object.id);
      return;

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      await syncSubscriptionById(event.data.object.id);
      return;

    case "invoice.paid": {
      const invoiceId = event.data.object.id;
      if (!invoiceId) return;
      await recordInvoicePayment(await getStripe().invoices.retrieve(invoiceId));
      return;
    }

    case "charge.refunded":
      await handleRefund(await getStripe().charges.retrieve(event.data.object.id));
      return;

    default:
      // Subscribed-to but unhandled events are acknowledged so Stripe stops retrying them.
      return;
  }
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  // The signature is computed over the raw body; parsing it first would break verification.
  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, env.stripe().STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: seen } = await admin.from("stripe_events").select("id").eq("id", event.id).maybeSingle();
  if (seen) return NextResponse.json({ received: true, duplicate: true });

  try {
    await handleEvent(event);
  } catch (err) {
    // 500 makes Stripe retry with backoff; the event is only marked processed after success.
    console.error(`Stripe webhook ${event.type} (${event.id}) failed`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  await admin.from("stripe_events").upsert({ id: event.id, type: event.type }, { onConflict: "id", ignoreDuplicates: true });
  return NextResponse.json({ received: true });
}
