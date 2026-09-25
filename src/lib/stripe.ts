import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

let stripe: Stripe | undefined;

// API version is pinned by the SDK (2026-08-26.dahlia for stripe@22); types match that version.
export function getStripe() {
  stripe ??= new Stripe(env.stripe().STRIPE_SECRET_KEY, {
    maxNetworkRetries: 2,
    appInfo: { name: "Niche Doc Scanner" },
  });
  return stripe;
}
