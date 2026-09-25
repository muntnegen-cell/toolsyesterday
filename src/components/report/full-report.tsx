import { AlertTriangle, CheckCircle2, FileQuestion, Handshake } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SEVERITY_META } from "@/lib/severity";
import type { FullReport as FullReportData, Severity } from "@/types/analysis";
import { FindingCard } from "./finding-card";

const SECTIONS: { severity: Severity; title: string; icon: typeof AlertTriangle }[] = [
  { severity: "high", title: "Risicovolle clausules", icon: AlertTriangle },
  { severity: "medium", title: "Aandachtspunten", icon: AlertTriangle },
  { severity: "low", title: "In orde", icon: CheckCircle2 },
];

export function FullReport({ report }: { report: FullReportData }) {
  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Samenvatting</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{report.summary}</p>
        </CardContent>
      </Card>

      {SECTIONS.map(({ severity, title, icon: Icon }) => {
        const findings = report.findings.filter((f) => f.severity === severity);
        if (findings.length === 0) return null;
        return (
          <section key={severity} aria-labelledby={`section-${severity}`} className="flex flex-col gap-4">
            <h2 id={`section-${severity}`} className="flex items-center gap-2 text-lg font-semibold">
              <Icon className={`size-5 ${SEVERITY_META[severity].text}`} aria-hidden />
              {title}
              <span className="text-sm font-normal text-muted-foreground">({findings.length})</span>
            </h2>
            {findings.map((finding) => (
              <FindingCard key={finding.id} finding={finding} />
            ))}
          </section>
        );
      })}

      {report.missingClauses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileQuestion className="size-5" aria-hidden />
              Ontbrekende bepalingen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {report.missingClauses.map((item) => (
                <li key={item.title} className="text-sm">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-muted-foreground">{item.why}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {report.negotiationTips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Handshake className="size-5" aria-hidden />
              Onderhandelingstips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
              {report.negotiationTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
