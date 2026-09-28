import type { Tables } from "@/types/database";

export const TIME_ZONE = "Europe/Amsterdam";
const DAY_MS = 24 * 60 * 60 * 1000;

type Subscription = Pick<Tables<"subscriptions">, "status" | "amount_cents" | "interval">;
type Payment = Pick<Tables<"payments">, "amount_cents" | "status" | "user_id" | "created_at">;
type Document = Pick<Tables<"documents">, "user_id" | "status" | "created_at">;

// Normalised to one month: a yearly plan contributes 1/12 of its price.
const MONTHLY_FACTOR: Record<Subscription["interval"], number> = {
  day: 365 / 12,
  week: 52 / 12,
  month: 1,
  year: 1 / 12,
};

// past_due is still billed (Stripe retries), so it counts toward MRR; trials don't pay yet.
const REVENUE_STATUSES = new Set(["active", "past_due"]);

export function computeMrr(subscriptions: Subscription[]) {
  const paying = subscriptions.filter((s) => REVENUE_STATUSES.has(s.status));
  const mrrCents = Math.round(paying.reduce((sum, s) => sum + s.amount_cents * MONTHLY_FACTOR[s.interval], 0));
  return { mrrCents, activeSubscribers: paying.length };
}

export function sumRevenue(payments: Payment[]) {
  return payments.filter((p) => p.status === "succeeded").reduce((sum, p) => sum + p.amount_cents, 0);
}

// Share of people who scanned a contract and also paid something in the same window.
export function computeConversion(documents: Document[], payments: Payment[]) {
  const scanners = new Set(documents.filter((d) => d.status === "analyzed").map((d) => d.user_id));
  if (scanners.size === 0) return { rate: null, scanners: 0, payers: 0 };
  const payers = new Set(
    payments.filter((p) => p.status === "succeeded" && p.user_id && scanners.has(p.user_id)).map((p) => p.user_id),
  );
  return { rate: payers.size / scanners.size, scanners: scanners.size, payers: payers.size };
}

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

export type DailyRevenue = { date: string; cents: number };

// One bucket per calendar day in Amsterdam time, oldest first, including days without sales.
export function dailyRevenue(payments: Payment[], days: number, now = new Date()): DailyRevenue[] {
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    buckets.set(dayKey.format(new Date(now.getTime() - i * DAY_MS)), 0);
  }
  for (const p of payments) {
    if (p.status !== "succeeded") continue;
    const key = dayKey.format(new Date(p.created_at));
    if (buckets.has(key)) buckets.set(key, buckets.get(key)! + p.amount_cents);
  }
  return [...buckets].map(([date, cents]) => ({ date, cents }));
}

export function daysAgo(days: number, now = new Date()) {
  return new Date(now.getTime() - days * DAY_MS).toISOString();
}
