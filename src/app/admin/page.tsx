import type { Metadata } from "next";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { StatTile } from "@/components/admin/stat-tile";
import { TransactionFeed } from "@/components/admin/transaction-feed";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadDashboard, WINDOW_DAYS } from "@/lib/admin/dashboard";
import { TIME_ZONE, computeConversion, computeMrr, dailyRevenue, sumRevenue } from "@/lib/admin/metrics";
import { requireAdmin } from "@/lib/auth";
import { formatEuro } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Beheer — Addertje",
  robots: { index: false, follow: false },
};

const percent = new Intl.NumberFormat("nl-NL", { style: "percent", maximumFractionDigits: 1 });
const count = new Intl.NumberFormat("nl-NL");
const clock = new Intl.DateTimeFormat("nl-NL", { timeStyle: "medium", timeZone: TIME_ZONE });

export default async function AdminPage() {
  await requireAdmin();
  const { subscriptions, payments, documents, feed, renderedAt } = await loadDashboard();

  const { mrrCents, activeSubscribers } = computeMrr(subscriptions);
  const revenue = sumRevenue(payments);
  const scans = documents.filter((d) => d.status === "analyzed").length;
  const conversion = computeConversion(documents, payments);
  const daily = dailyRevenue(payments, WINDOW_DAYS, renderedAt);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10">
      <AutoRefresh />
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Beheer</h1>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-risk-low opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-risk-low" />
          </span>
          Live · bijgewerkt om {clock.format(renderedAt)}
        </p>
      </div>

      <Card className="gap-0 py-6">
        <CardContent className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Monthly recurring revenue</p>
          <p className="text-5xl font-semibold tracking-tight">{formatEuro(mrrCents)}</p>
          <p className="text-sm text-muted-foreground">
            uit {count.format(activeSubscribers)} {activeSubscribers === 1 ? "betalend abonnement" : "betalende abonnementen"}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Actieve abonnees" value={count.format(activeSubscribers)} context="Pro, incl. betaling in behandeling" />
        <StatTile label="Omzet" value={formatEuro(revenue)} context={`Laatste ${WINDOW_DAYS} dagen, excl. terugbetalingen`} />
        <StatTile label="Scans" value={count.format(scans)} context={`Geslaagde analyses, ${WINDOW_DAYS} dagen`} />
        <StatTile
          label="Conversie"
          value={conversion.rate === null ? "—" : percent.format(conversion.rate)}
          context={`${count.format(conversion.payers)} van ${count.format(conversion.scanners)} scanners betaalden`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Omzet per dag</CardTitle>
          <CardDescription>Laatste {WINDOW_DAYS} dagen · rapporten en abonnementen · Nederlandse tijd</CardDescription>
        </CardHeader>
        <CardContent>
          <RevenueChart data={daily} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transacties</CardTitle>
          <CardDescription>De laatste 25 betalingen, ververst elke 15 seconden</CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionFeed payments={feed} />
        </CardContent>
      </Card>
    </main>
  );
}
