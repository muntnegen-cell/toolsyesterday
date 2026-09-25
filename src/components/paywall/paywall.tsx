"use client";

import { useState } from "react";
import { Check, Loader2, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PRICING } from "@/lib/pricing";
import { cn, formatEuro } from "@/lib/utils";
import { UserFacingError } from "@/lib/errors";
import type { CheckoutPlan, CheckoutRequest, CheckoutResponse } from "@/types/analysis";

const PLANS: {
  plan: CheckoutPlan;
  cta: string;
  features: string[];
  highlighted: boolean;
}[] = [
  {
    plan: "report",
    cta: `Ontgrendel Volledig Rapport (${formatEuro(PRICING.report.amountCents)})`,
    features: [
      "Alle clausules met rood/geel-markering",
      "Uitleg per risico in begrijpelijke taal",
      "Concrete verbetervoorstellen om te onderhandelen",
      "Ontbrekende bepalingen en onderhandelingstips",
    ],
    highlighted: false,
  },
  {
    plan: "pro",
    cta: `Start Pro Abonnement (${formatEuro(PRICING.pro.amountCents)}/maand)`,
    features: [
      "Dit rapport direct ontgrendeld",
      "Onbeperkt contracten scannen (fair use)",
      "Alle volledige rapporten inbegrepen",
      "Maandelijks opzegbaar",
    ],
    highlighted: true,
  },
];

export function Paywall({ documentId, hiddenCount }: { documentId: string; hiddenCount: number }) {
  const [pending, setPending] = useState<CheckoutPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkout(plan: CheckoutPlan) {
    setPending(plan);
    setError(null);
    try {
      const body: CheckoutRequest = { documentId, plan };
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as CheckoutResponse | null;
      if (!res.ok || !json || "error" in json) {
        throw new UserFacingError(json && "error" in json ? json.error : "Afrekenen is nu niet mogelijk.");
      }
      window.location.assign(json.url);
    } catch (err) {
      setError(err instanceof UserFacingError ? err.message : "Er ging iets mis. Probeer het opnieuw.");
      setPending(null);
    }
  }

  return (
    <section aria-labelledby="paywall-title" className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Lock className="size-5" aria-hidden />
        </span>
        <h2 id="paywall-title" className="text-2xl font-bold tracking-tight text-balance">
          Bekijk wat er in {hiddenCount === 1 ? "deze clausule" : `deze ${hiddenCount} clausules`} staat
        </h2>
        <p className="max-w-lg text-muted-foreground text-balance">
          Ontgrendel de volledige analyse met letterlijke citaten, uitleg en kant-en-klare verbetervoorstellen.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {PLANS.map(({ plan, cta, features, highlighted }) => {
          const price = PRICING[plan];
          return (
            <Card key={plan} className={cn("relative", highlighted && "border-primary shadow-md")}>
              {highlighted && (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  <Sparkles className="size-3" aria-hidden />
                  Voordeligst
                </span>
              )}
              <CardHeader>
                <CardTitle>{price.label}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground tabular-nums">
                    {formatEuro(price.amountCents)}
                  </span>{" "}
                  {price.cadence}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="flex flex-col gap-2 text-sm">
                  {features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-risk-low" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full whitespace-normal"
                  size="lg"
                  variant={highlighted ? "default" : "outline"}
                  disabled={pending !== null}
                  onClick={() => checkout(plan)}
                >
                  {pending === plan && <Loader2 className="animate-spin" aria-hidden />}
                  {cta}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      )}
      <p className="text-center text-xs text-muted-foreground">
        Veilig afrekenen via Stripe. Je wordt na betaling direct teruggestuurd naar je rapport.
      </p>
    </section>
  );
}
