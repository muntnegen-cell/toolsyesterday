import { Lock } from "lucide-react";
import { SEVERITY_META } from "@/lib/severity";
import { cn } from "@/lib/utils";
import type { Teaser } from "@/types/analysis";

// Placeholder copy only: the real clause text never reaches the browser before payment,
// so un-blurring via devtools reveals nothing.
const PLACEHOLDER = [
  "Deze bepaling legt een verplichting bij jou als opdrachtnemer die verder gaat dan gebruikelijk in de markt en kan financiële gevolgen hebben.",
  "De formulering is eenzijdig in het voordeel van de opdrachtgever. Wij stellen een evenwichtiger alternatief voor dat je direct kunt voorleggen.",
  "Let op de termijn en de voorwaarden in deze clausule; in de huidige vorm kun je je positie moeilijk verdedigen bij een geschil.",
];

export function TeaserFindings({ findings }: { findings: Teaser["findings"] }) {
  if (findings.length === 0) {
    return <p className="text-sm text-muted-foreground">Er zijn geen opvallende clausules gevonden.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {findings.map((finding, i) => {
        const meta = SEVERITY_META[finding.severity];
        return (
          <li key={`${finding.title}-${i}`} className={cn("rounded-xl border-l-4 border bg-card p-4", meta.border)}>
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{finding.title}</p>
              <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium", meta.badge)}>
                {meta.label}
              </span>
            </div>
            <div className="relative mt-2">
              <p aria-hidden className="pointer-events-none select-none text-sm text-muted-foreground blur-[5px]">
                {PLACEHOLDER[i % PLACEHOLDER.length]}
              </p>
              <span className="absolute inset-0 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Lock className="size-3.5" aria-hidden />
                Uitleg en verbetervoorstel vergrendeld
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
