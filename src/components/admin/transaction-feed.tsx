import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { TIME_ZONE } from "@/lib/admin/metrics";
import { cn, formatEuro } from "@/lib/utils";
import type { Tables } from "@/types/database";

export type FeedPayment = Pick<
  Tables<"payments">,
  "id" | "kind" | "amount_cents" | "status" | "customer_email" | "created_at"
>;

const timeFormat = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

const PRODUCT = { report: "Rapport", subscription: "Pro" } as const;

const STATUS = {
  succeeded: { label: "Geslaagd", icon: CheckCircle2, className: "text-risk-low" },
  refunded: { label: "Terugbetaald", icon: RotateCcw, className: "text-muted-foreground" },
  failed: { label: "Mislukt", icon: XCircle, className: "text-destructive" },
} as const;

export function TransactionFeed({ payments }: { payments: FeedPayment[] }) {
  if (payments.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Nog geen transacties.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b">
            <th scope="col" className="py-2 pr-3 font-medium">Tijd</th>
            <th scope="col" className="hidden py-2 pr-3 font-medium sm:table-cell">Klant</th>
            <th scope="col" className="hidden py-2 pr-3 font-medium sm:table-cell">Product</th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">Bedrag</th>
            <th scope="col" className="py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {payments.map((p) => {
            const status = STATUS[p.status];
            const Icon = status.icon;
            return (
              <tr key={p.id}>
                <td className="whitespace-nowrap py-2.5 pr-3 text-muted-foreground">
                  {timeFormat.format(new Date(p.created_at))}
                </td>
                <td className="hidden max-w-[220px] truncate py-2.5 pr-3 sm:table-cell">{p.customer_email ?? "—"}</td>
                <td className="hidden py-2.5 pr-3 sm:table-cell">{PRODUCT[p.kind]}</td>
                <td className="whitespace-nowrap py-2.5 pr-3 text-right tabular-nums">
                  <span className={cn(p.status === "refunded" && "text-muted-foreground line-through")}>
                    {formatEuro(p.amount_cents)}
                  </span>
                  <span className="block text-xs text-muted-foreground sm:hidden">{PRODUCT[p.kind]}</span>
                </td>
                <td className="py-2.5">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <Icon className={cn("size-4", status.className)} aria-hidden />
                    {status.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
