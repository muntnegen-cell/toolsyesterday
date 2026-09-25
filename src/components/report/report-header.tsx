import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SEVERITY_META } from "@/lib/severity";
import type { Severity } from "@/types/analysis";
import { SafetyScore } from "./safety-score";

export function ReportHeader({
  fileName,
  contractType,
  safetyScore,
  verdict,
  counts,
}: {
  fileName: string;
  contractType: string;
  safetyScore: number;
  verdict: string;
  counts: Record<Severity, number>;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <SafetyScore score={safetyScore} />
        <div className="flex w-full min-w-0 flex-1 flex-col gap-3 text-center sm:text-left">
          <div className="flex min-w-0 flex-col items-center gap-1 text-sm text-muted-foreground sm:flex-row sm:gap-2">
            <span className="flex max-w-full min-w-0 items-center gap-2">
              <FileText className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{fileName}</span>
            </span>
            <span aria-hidden className="hidden sm:inline">·</span>
            <span>{contractType}</span>
          </div>
          <p className="text-lg font-semibold leading-snug text-balance">{verdict}</p>
          <ul className="flex flex-wrap justify-center gap-2 sm:justify-start">
            {(["high", "medium", "low"] as const).map((s) => (
              <li
                key={s}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${SEVERITY_META[s].badge}`}
              >
                <span className={`size-1.5 rounded-full ${SEVERITY_META[s].dot}`} aria-hidden />
                {counts[s]} {SEVERITY_META[s].label.toLowerCase()}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
