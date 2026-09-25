import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { CheckoutResponse } from "@/types/analysis";

const bodySchema = z.object({
  documentId: z.uuid(),
  plan: z.enum(["report", "pro"]),
});

function json(body: CheckoutResponse, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Ongeldig verzoek." }, 400);
  const { documentId, plan } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Je sessie is verlopen. Vernieuw de pagina en probeer het opnieuw." }, 401);

  // RLS doubles as the ownership check.
  const { data: doc } = await supabase
    .from("documents")
    .select("id, status, unlocked_at")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) return json({ error: "Rapport niet gevonden." }, 404);
  if (doc.status !== "analyzed") return json({ error: "Dit rapport is nog niet klaar." }, 409);

  const appUrl = env.app().NEXT_PUBLIC_APP_URL;
  const reportUrl = `${appUrl}/report/${documentId}`;
  const admin = createAdminClient();

  const { data: isPro } = await admin.rpc("has_active_subscription", { uid: user.id });
  if (doc.unlocked_at || isPro) return json({ url: reportUrl });

  try {
    const customerId = await getOrCreateCustomer(admin, user.id, user.is_anonymous ? null : (user.email ?? null));
    const { STRIPE_PRICE_ID_REPORT, STRIPE_PRICE_ID_PRO } = env.stripe();
    const metadata = { user_id: user.id, document_id: documentId, plan };

    const session = await getStripe().checkout.sessions.create({
      mode: plan === "report" ? "payment" : "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: plan === "report" ? STRIPE_PRICE_ID_REPORT : STRIPE_PRICE_ID_PRO, quantity: 1 }],
      metadata,
      ...(plan === "report"
        ? { payment_intent_data: { metadata } }
        : { subscription_data: { metadata } }),
      allow_promotion_codes: true,
      locale: "nl",
      success_url: `${reportUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${reportUrl}?checkout=cancelled`,
    });

    if (!session.url) throw new Error("Checkout session without url");
    return json({ url: session.url });
  } catch (err) {
    console.error("Checkout session creation failed", err);
    return json({ error: "Afrekenen is nu niet mogelijk. Probeer het over een paar minuten opnieuw." }, 502);
  }
}

async function getOrCreateCustomer(admin: ReturnType<typeof createAdminClient>, userId: string, email: string | null) {
  const { data: profile } = await admin.from("profiles").select("stripe_customer_id").eq("id", userId).single();
  if (profile?.stripe_customer_id) return profile.stripe_customer_id;

  // Idempotency key: two quick clicks must not create two Stripe customers for one user.
  const customer = await getStripe().customers.create(
    { email: email ?? undefined, metadata: { user_id: userId } },
    { idempotencyKey: `customer-${userId}` },
  );
  await admin.from("profiles").update({ stripe_customer_id: customer.id }).eq("id", userId).is("stripe_customer_id", null);

  // Re-read: if a concurrent request won the race, use its customer id.
  const { data: fresh } = await admin.from("profiles").select("stripe_customer_id").eq("id", userId).single();
  return fresh?.stripe_customer_id ?? customer.id;
}
