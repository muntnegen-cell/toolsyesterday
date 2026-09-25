import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, CreditCard, FileText, Lock, Sparkles, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SaveAccessBanner } from "@/components/paywall/save-access-banner";
import { scoreTone } from "@/lib/severity";
import { createClient } from "@/lib/supabase/server";
import { cn, formatEuro } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Mijn rapporten — Niche Doc Scanner",
  robots: { index: false, follow: false },
};

const dateFormat = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" });

const STATUS_LABEL = {
  uploaded: "Wordt geanalyseerd",
  analyzing: "Wordt geanalyseerd",
  analyzed: null,
  failed: "Mislukt",
} as const;

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect("/login?next=/account");
  const { portal } = await searchParams;

  const [{ data: documents }, { data: subscriptions }] = await Promise.all([
    supabase
      .from("documents")
      .select("id, file_name, status, risk_score, unlocked_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("subscriptions")
      .select("status, amount_cents, current_period_end, cancel_at_period_end")
      .in("status", ["active", "trialing", "past_due"])
      .order("current_period_end", { ascending: false })
      .limit(1),
  ]);
  const subscription = subscriptions?.[0];
  const isPro = subscription && subscription.status !== "past_due";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mijn rapporten</h1>
        {auth.claims.email && <p className="text-sm text-muted-foreground">{auth.claims.email}</p>}
      </div>

      {auth.claims.is_anonymous && (documents?.length ?? 0) > 0 && <SaveAccessBanner next="/account" />}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isPro ? <Sparkles className="size-5" aria-hidden /> : <CreditCard className="size-5" aria-hidden />}
            {isPro ? "Pro Abonnement" : subscription ? "Betaling mislukt" : "Geen abonnement"}
          </CardTitle>
          <CardDescription>
            {subscription?.current_period_end && isPro
              ? `${formatEuro(subscription.amount_cents)} per maand · ${
                  subscription.cancel_at_period_end ? "stopt op" : "verlengt op"
                } ${dateFormat.format(new Date(subscription.current_period_end))}`
              : subscription
                ? "We konden je laatste betaling niet innen. Werk je betaalgegevens bij om Pro te houden."
                : "Met Pro zijn al je rapporten volledig zichtbaar."}
          </CardDescription>
        </CardHeader>
        {subscription && (
          <CardContent className="flex flex-col gap-2">
            <form action="/api/billing/portal" method="post">
              <Button type="submit" variant="outline">
                Abonnement beheren
              </Button>
            </form>
            {portal === "error" && (
              <p role="alert" className="text-sm text-destructive">
                Het klantportaal is nu niet bereikbaar. Probeer het later opnieuw.
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {documents && documents.length > 0 ? (
        <ul className="divide-y rounded-xl border bg-card">
          {documents.map((doc) => {
            const statusLabel = STATUS_LABEL[doc.status];
            const tone = doc.risk_score !== null ? scoreTone(doc.risk_score) : null;
            const unlocked = Boolean(doc.unlocked_at) || Boolean(isPro);
            return (
              <li key={doc.id}>
                <Link
                  href={`/report/${doc.id}`}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
                >
                  <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">{dateFormat.format(new Date(doc.created_at))}</p>
                  </div>
                  {statusLabel ? (
                    <span className="text-xs text-muted-foreground">{statusLabel}</span>
                  ) : (
                    <>
                      {tone && (
                        <span className={cn("text-sm font-semibold tabular-nums", tone.className)}>
                          {doc.risk_score}%
                        </span>
                      )}
                      {unlocked ? (
                        <Unlock className="size-4 text-risk-low" aria-label="Ontgrendeld" />
                      ) : (
                        <Lock className="size-4 text-muted-foreground" aria-label="Vergrendeld" />
                      )}
                    </>
                  )}
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-muted-foreground">Je hebt nog geen contracten gescand.</p>
            <Button asChild>
              <Link href="/#upload">Scan je eerste contract</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
