"use client";

import { useEffect, useRef, useState } from "react";
import { formatEuro } from "@/lib/utils";
import type { DailyRevenue } from "@/lib/admin/metrics";

const PLOT_HEIGHT = 180;
const MARGIN = { top: 22, right: 8, bottom: 28, left: 56 };
const MAX_BAR = 24;
const GAP = 2;
const RADIUS = 4;

const shortDate = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" });
const euroAxis = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

// "YYYY-MM-DD" parsed as UTC midnight and formatted in UTC, so the label is the bucket's own date.
const parseDay = (d: string) => new Date(`${d}T00:00:00Z`);

function niceMax(cents: number) {
  if (cents <= 0) return 10_000;
  const euros = cents / 100;
  const magnitude = 10 ** Math.floor(Math.log10(euros));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * magnitude * 4 >= euros)! * magnitude;
  return step * 4 * 100;
}

// Rounded 4px data-end on top, square at the baseline.
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(RADIUS, w / 2, h);
  const base = y + h;
  return `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${base}Z`;
}

export function RevenueChart({ data }: { data: DailyRevenue[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const total = data.reduce((s, d) => s + d.cents, 0);
  const maxCents = Math.max(0, ...data.map((d) => d.cents));
  const yMax = niceMax(maxCents);
  const ticks = [0, 1, 2, 3, 4].map((i) => (yMax / 4) * i);
  const maxIndex = maxCents > 0 ? data.findIndex((d) => d.cents === maxCents) : -1;

  const plotW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const slot = data.length ? plotW / data.length : 0;
  const barW = Math.max(2, Math.min(MAX_BAR, slot - GAP));
  const y = (cents: number) => MARGIN.top + PLOT_HEIGHT - (cents / yMax) * PLOT_HEIGHT;
  const labelEvery = width < 480 ? 10 : 7;
  const height = MARGIN.top + PLOT_HEIGHT + MARGIN.bottom;

  // Labels near the right edge anchor to their end so they never run off the chart.
  const anchorFor = (cx: number) => (cx > width - 28 ? { x: Math.min(cx + barW / 2, width - 2), anchor: "end" as const } : { x: cx, anchor: "middle" as const });

  const activeDay = active !== null ? data[active] : null;
  const activeX = active !== null ? MARGIN.left + active * slot + slot / 2 : 0;

  return (
    <div className="flex flex-col gap-4">
      <div ref={ref} className="relative w-full" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={`Omzet per dag, laatste ${data.length} dagen`}>
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={MARGIN.left}
                  x2={width - MARGIN.right}
                  y1={y(t)}
                  y2={y(t)}
                  className="stroke-border"
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                />
                <text
                  x={MARGIN.left - 8}
                  y={y(t)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-muted-foreground text-[11px] tabular-nums"
                >
                  {euroAxis.format(t / 100)}
                </text>
              </g>
            ))}

            {data.map((d, i) => {
              const x = MARGIN.left + i * slot + (slot - barW) / 2;
              const top = y(d.cents);
              const h = MARGIN.top + PLOT_HEIGHT - top;
              const showLabel = (data.length - 1 - i) % labelEvery === 0;
              return (
                <g key={d.date}>
                  {h > 0 && (
                    <path
                      d={barPath(x, top, barW, h)}
                      className="fill-chart-bar transition-opacity"
                      opacity={active === null || active === i ? 1 : 0.55}
                    />
                  )}
                  {i === maxIndex && (
                    <text
                      x={anchorFor(x + barW / 2).x}
                      y={top - 6}
                      textAnchor={anchorFor(x + barW / 2).anchor}
                      className="fill-foreground text-[11px] font-medium"
                    >
                      {formatEuro(d.cents)}
                    </text>
                  )}
                  {showLabel && (
                    <text
                      x={anchorFor(x + barW / 2).x}
                      y={MARGIN.top + PLOT_HEIGHT + 18}
                      textAnchor={anchorFor(x + barW / 2).anchor}
                      className="fill-muted-foreground text-[11px]"
                    >
                      {shortDate.format(parseDay(d.date))}
                    </text>
                  )}
                  {/* Hit target: the whole column, wider and taller than the painted bar. */}
                  <rect
                    x={MARGIN.left + i * slot}
                    y={MARGIN.top}
                    width={slot}
                    height={PLOT_HEIGHT}
                    fill="transparent"
                    tabIndex={0}
                    role="img"
                    aria-label={`${longDate.format(parseDay(d.date))}: ${formatEuro(d.cents)}`}
                    className="cursor-default outline-none focus-visible:stroke-ring"
                    onPointerEnter={() => setActive(i)}
                    onPointerLeave={() => setActive(null)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                  />
                </g>
              );
            })}
          </svg>
        )}

        {total === 0 && width > 0 && (
          <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-muted-foreground">
            Nog geen omzet in deze periode
          </p>
        )}

        {activeDay && (
          <div
            role="status"
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md"
            style={{
              left: Math.min(Math.max(activeX, 70), width - 70),
              top: Math.max(0, y(activeDay.cents) - 52),
            }}
          >
            <p className="text-sm font-semibold text-popover-foreground">{formatEuro(activeDay.cents)}</p>
            <p className="text-muted-foreground">{longDate.format(parseDay(activeDay.date))}</p>
          </div>
        )}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Toon als tabel</summary>
        <div className="mt-3 max-h-64 overflow-y-auto rounded-md border">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Datum</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Omzet</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[...data].reverse().map((d) => (
                <tr key={d.date}>
                  <td className="px-3 py-1.5">{longDate.format(parseDay(d.date))}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatEuro(d.cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
