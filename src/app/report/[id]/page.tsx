import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AnalysisPending } from "@/components/report/analysis-pending";
import { FullReport } from "@/components/report/full-report";
import { ReportHeader } from "@/components/report/report-header";
import { TeaserFindings } from "@/components/report/teaser-findings";
import { Paywall } from "@/components/paywall/paywall";
import { SaveAccessBanner } from "@/components/paywall/save-access-banner";
import { fulfillCheckoutSession } from "@/lib/billing/fulfillment";
import { createClient } from "@/lib/supabase/server";
import { fullReportSchema, teaserSchema } from "@/types/analysis";

export const metadata: Metadata = {
  title: "Contractrapport — Niche Doc Scanner",
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STALE_AFTER_MS = 5 * 60 * 1000;

export default async function ReportPage({ params, searchParams }: PageProps<"/report/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const checkout = typeof query.checkout === "string" ? query.checkout : null;
  const sessionId = typeof query.session_id === "string" ? query.session_id : null;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const doc = await getDocument(supabase, id);
  if (!doc) notFound();

  if ((doc.status === "uploaded" || doc.status === "analyzing") && !doc.stale) {
    return (
      <ReportShell>
        <AnalysisPending message={`We analyseren "${doc.file_name}"…`} />
      </ReportShell>
    );
  }

  const teaser = teaserSchema.safeParse(doc.teaser);
  if (doc.status !== "analyzed" || !teaser.success) {
    return (
      <ReportShell>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
            <AlertCircle className="size-10 text-destructive" aria-hidden />
            <div className="space-y-1">
              <p className="font-semibold">De analyse is niet gelukt</p>
              <p className="text-sm text-muted-foreground">
                {doc.error_message ??
                  "Controleer of de PDF selecteerbare tekst bevat (geen scan of foto) en probeer het opnieuw."}
              </p>
            </div>
            <Button asChild>
              <Link href="/">Probeer een ander bestand</Link>
            </Button>
          </CardContent>
        </Card>
      </ReportShell>
    );
  }

  let reportRow = await getReport(supabase, id);

  // Back from Stripe before the webhook arrived: fulfil now from the session itself (idempotent).
  let paymentState: "none" | "processing" | "awaiting" = "none";
  if (!reportRow && checkout === "success" && sessionId?.startsWith("cs_")) {
    const result = await fulfillCheckoutSession(sessionId).catch((err) => {
      console.error("Fulfillment on return from checkout failed", err);
      return null;
    });
    reportRow = await getReport(supabase, id);
    if (!reportRow) paymentState = result && !result.fulfilled && result.reason === "unpaid" ? "awaiting" : "processing";
  }
  const report = reportRow ? fullReportSchema.safeParse(reportRow.report) : null;

  const { data: auth } = await supabase.auth.getClaims();
  const isAnonymous = Boolean(auth?.claims?.is_anonymous);

  const header = (
    <ReportHeader
      fileName={doc.file_name}
      contractType={teaser.data.contractType}
      safetyScore={teaser.data.safetyScore}
      verdict={teaser.data.verdict}
      counts={teaser.data.counts}
    />
  );

  if (report) {
    return (
      <ReportShell>
        {checkout === "success" && (
          <Notice tone="success">Betaling gelukt — je volledige rapport staat hieronder.</Notice>
        )}
        {isAnonymous && <SaveAccessBanner next={`/report/${id}`} />}
        {header}
        {report.success ? (
          <FullReport report={report.data} />
        ) : (
          // Never show a paying customer the paywall because of a malformed row.
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Je rapport is ontgrendeld maar kon niet worden weergegeven. Neem contact met ons op, dan lossen we het
            direct op.
          </p>
        )}
      </ReportShell>
    );
  }

  if (paymentState === "processing") {
    return (
      <ReportShell>
        {header}
        <AnalysisPending message="Je betaling wordt verwerkt. Je rapport verschijnt zo automatisch…" />
      </ReportShell>
    );
  }

  return (
    <ReportShell>
      {paymentState === "awaiting" && (
        <Notice tone="info">
          Je betaling is nog niet bevestigd door je bank. Je rapport wordt automatisch ontgrendeld zodra de betaling
          binnen is; je kunt deze pagina later opnieuw openen.
        </Notice>
      )}
      {checkout === "cancelled" && (
        <Notice tone="info">De betaling is geannuleerd. Er is niets afgeschreven.</Notice>
      )}
      {header}
      <section aria-labelledby="findings-title" className="flex flex-col gap-4">
        <h2 id="findings-title" className="text-lg font-semibold">
          Gevonden clausules
        </h2>
        <TeaserFindings findings={teaser.data.findings} />
      </section>
      <Paywall documentId={doc.id} hiddenCount={teaser.data.findings.length} />
    </ReportShell>
  );
}

async function getReport(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  // RLS only returns this row after payment for this document or with an active Pro subscription.
  const { data } = await supabase.from("document_reports").select("report").eq("document_id", id).maybeSingle();
  return data;
}

function Notice({ tone, children }: { tone: "success" | "info"; children: React.ReactNode }) {
  return (
    <p
      role="status"
      className={
        tone === "success"
          ? "flex items-center gap-2 rounded-lg border border-risk-low/30 bg-risk-low/10 p-3 text-sm"
          : "flex items-center gap-2 rounded-lg border bg-muted p-3 text-sm"
      }
    >
      {tone === "success" ? (
        <CheckCircle2 className="size-4 shrink-0 text-risk-low" aria-hidden />
      ) : (
        <Info className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      )}
      {children}
    </p>
  );
}

async function getDocument(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  // RLS returns nothing for documents of other users, so this doubles as the ownership check.
  const { data } = await supabase
    .from("documents")
    .select("id, file_name, status, teaser, error_message, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  // An analysis that hasn't finished after 5 minutes has crashed; stop polling and show the error state.
  return { ...data, stale: Date.now() - new Date(data.updated_at).getTime() > STALE_AFTER_MS };
}

function ReportShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Nieuw contract scannen
      </Link>
      {children}
    </main>
  );
}
