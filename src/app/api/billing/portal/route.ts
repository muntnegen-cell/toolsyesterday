import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

// Form POST from /account → Stripe Customer Portal (cancel, change card, download invoices).
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/account", request.url), { status: 303 });

  const { data: profile } = await supabase.from("profiles").select("stripe_customer_id").eq("id", user.id).single();
  if (!profile?.stripe_customer_id) return NextResponse.redirect(new URL("/account", request.url), { status: 303 });

  try {
    const portal = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      locale: "nl",
      return_url: `${env.app().NEXT_PUBLIC_APP_URL}/account`,
    });
    return NextResponse.redirect(portal.url, { status: 303 });
  } catch (err) {
    console.error("Billing portal session failed", err);
    return NextResponse.redirect(new URL("/account?portal=error", request.url), { status: 303 });
  }
}
