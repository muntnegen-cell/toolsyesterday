// Display prices only — Stripe charges whatever STRIPE_PRICE_ID_* is set to. Keep them in sync.
export const PRICING = {
  report: { amountCents: 1900, label: "Volledig Rapport", cadence: "eenmalig" },
  pro: { amountCents: 900, label: "Pro Abonnement", cadence: "per maand" },
} as const;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
