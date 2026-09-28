import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { daysAgo } from "./metrics";

export const WINDOW_DAYS = 30;

export async function loadDashboard() {
  const admin = createAdminClient();
  const since = daysAgo(WINDOW_DAYS);

  const [subscriptions, payments, documents, feed] = await Promise.all([
    admin.from("subscriptions").select("status, amount_cents, interval").in("status", ["active", "past_due", "trialing"]),
    admin
      .from("payments")
      .select("amount_cents, status, user_id, created_at")
      .gte("created_at", since)
      .limit(10_000),
    admin.from("documents").select("user_id, status, created_at").gte("created_at", since).limit(10_000),
    admin
      .from("payments")
      .select("id, kind, amount_cents, status, customer_email, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  const failed = [subscriptions, payments, documents, feed].find((r) => r.error);
  if (failed?.error) throw failed.error;

  return {
    subscriptions: subscriptions.data ?? [],
    payments: payments.data ?? [],
    documents: documents.data ?? [],
    feed: feed.data ?? [],
    renderedAt: new Date(),
  };
}
