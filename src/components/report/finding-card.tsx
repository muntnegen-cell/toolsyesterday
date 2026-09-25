import { Lightbulb, Quote } from "lucide-react";
import { SEVERITY_META } from "@/lib/severity";
import { cn } from "@/lib/utils";
import type { Finding } from "@/types/analysis";

export function FindingCard({ finding }: { finding: Finding }) {
  const meta = SEVERITY_META[finding.severity];

  return (
    <article className={cn("rounded-xl border border-l-4 p-5", meta.border, meta.bg)}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold leading-snug">{finding.title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {finding.category}
            {finding.location && <> · {finding.location}</>}
          </p>
        </div>
        <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium", meta.badge)}>
          {meta.label}
        </span>
      </header>

      <blockquote
        className={cn(
          "mt-4 flex gap-2 rounded-lg border bg-background/70 p-3 text-sm italic",
          finding.severity === "high" && "border-risk-high/30",
          finding.severity === "medium" && "border-risk-medium/40",
        )}
      >
        <Quote className={cn("mt-0.5 size-4 shrink-0", meta.text)} aria-hidden />
        <span className="whitespace-pre-line">{finding.clause}</span>
      </blockquote>

      <p className="mt-4 text-sm leading-relaxed">{finding.explanation}</p>

      <div className="mt-4 rounded-lg border border-primary/10 bg-background p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Lightbulb className="size-3.5" aria-hidden />
          Verbetervoorstel
        </p>
        <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed">{finding.suggestion}</p>
      </div>
    </article>
  );
}
