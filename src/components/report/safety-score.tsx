import { cn } from "@/lib/utils";
import { scoreTone } from "@/lib/severity";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function SafetyScore({
  score,
  size = "md",
  className,
}: {
  score: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const tone = scoreTone(score);
  const offset = CIRCUMFERENCE * (1 - score / 100);

  return (
    <div className={cn("relative shrink-0", size === "md" ? "size-36" : "size-24", className)}>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="10" className="stroke-muted" />
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className={cn(tone.stroke, "transition-[stroke-dashoffset] duration-700")}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-bold tabular-nums", size === "md" ? "text-3xl" : "text-xl")}>{score}%</span>
        <span className={cn("font-medium", size === "md" ? "text-sm" : "text-xs", tone.className)}>{tone.label}</span>
      </div>
      <span className="sr-only">
        Veiligheidsscore {score} van 100: {tone.label}
      </span>
    </div>
  );
}
