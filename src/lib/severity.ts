import type { Severity } from "@/types/analysis";

export const SEVERITY_META: Record<
  Severity,
  { label: string; badge: string; border: string; bg: string; text: string; dot: string }
> = {
  high: {
    label: "Risicovol",
    badge: "bg-risk-high/10 text-risk-high border-risk-high/30",
    border: "border-risk-high/40",
    bg: "bg-risk-high/5",
    text: "text-risk-high",
    dot: "bg-risk-high",
  },
  medium: {
    label: "Aandachtspunt",
    badge: "bg-risk-medium/15 text-amber-700 border-risk-medium/40 dark:text-risk-medium",
    border: "border-risk-medium/50",
    bg: "bg-risk-medium/5",
    text: "text-amber-700 dark:text-risk-medium",
    dot: "bg-risk-medium",
  },
  low: {
    label: "In orde",
    badge: "bg-risk-low/10 text-risk-low border-risk-low/30",
    border: "border-risk-low/40",
    bg: "bg-risk-low/5",
    text: "text-risk-low",
    dot: "bg-risk-low",
  },
};

export function scoreTone(score: number) {
  if (score >= 75) return { label: "Veilig", className: "text-risk-low", stroke: "stroke-risk-low" };
  if (score >= 50) return { label: "Let op", className: "text-amber-600", stroke: "stroke-risk-medium" };
  return { label: "Risicovol", className: "text-risk-high", stroke: "stroke-risk-high" };
}
