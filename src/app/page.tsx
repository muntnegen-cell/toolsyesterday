import Link from "next/link";
import {
  Ban,
  CalendarClock,
  Check,
  Clock,
  Copyright,
  FileSearch,
  Gavel,
  Lock,
  Scale,
  ShieldAlert,
  Sparkles,
  Upload,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FindingCard } from "@/components/report/finding-card";
import { SafetyScore } from "@/components/report/safety-score";
import { UploadZone } from "@/components/upload/upload-zone";
import { PRICING } from "@/lib/pricing";
import { formatEuro } from "@/lib/utils";
import type { Finding } from "@/types/analysis";

const STEPS = [
  {
    icon: Upload,
    title: "Upload je contract",
    text: "Sleep je PDF in het uploadvak. Geen account nodig.",
  },
  {
    icon: FileSearch,
    title: "AI scant elke clausule",
    text: "Binnen een minuut zie je je veiligheidsscore en hoeveel risico's er in je contract staan.",
  },
  {
    icon: ShieldAlert,
    title: "Onderhandel met argumenten",
    text: "Het volledige rapport markeert risico's in rood en geel, met concrete tekstvoorstellen.",
  },
];

const CHECKS = [
  { icon: Ban, title: "Concurrentie- en relatiebeding", text: "Mag je na de opdracht nog voor klanten of concurrenten werken?" },
  { icon: Scale, title: "Aansprakelijkheid", text: "Onbeperkte aansprakelijkheid of vrijwaringen die je bedrijf kunnen raken." },
  { icon: Copyright, title: "Intellectueel eigendom", text: "Draag je al je rechten over, ook op eerder werk en eigen tools?" },
  { icon: Wallet, title: "Betaling & boetes", text: "Lange betaaltermijnen, eenzijdige kortingen en boeteclausules." },
  { icon: CalendarClock, title: "Opzegging & looptijd", text: "Kan de opdrachtgever direct stoppen, terwijl jij vastzit?" },
  { icon: Gavel, title: "Schijnzelfstandigheid", text: "Signalen van gezagsverhouding die je zzp-status in gevaar brengen." },
];

// Illustrative sample shown on the landing page — clearly labelled as an example.
const SAMPLE_FINDINGS: Finding[] = [
  {
    id: "sample-1",
    severity: "high",
    title: "Onbeperkte aansprakelijkheid",
    category: "Aansprakelijkheid",
    location: "Artikel 9.1",
    clause: "Opdrachtnemer is aansprakelijk voor alle schade die opdrachtgever lijdt als gevolg van de werkzaamheden.",
    explanation:
      "Er is geen maximum afgesproken. Eén fout kan je een schadeclaim opleveren die vele malen hoger is dan je opdrachtwaarde.",
    suggestion:
      "Stel voor: \"De aansprakelijkheid van opdrachtnemer is beperkt tot het bedrag dat in de betreffende opdracht is gefactureerd, met een maximum van € 25.000, behoudens opzet of bewuste roekeloosheid.\"",
  },
  {
    id: "sample-2",
    severity: "medium",
    title: "Betaaltermijn van 60 dagen",
    category: "Betaling",
    location: "Artikel 5.3",
    clause: "Facturen worden binnen 60 dagen na ontvangst voldaan.",
    explanation:
      "Voor grote bedrijven die met zzp'ers werken geldt wettelijk een maximale betaaltermijn van 30 dagen. Een langere termijn drukt op je cashflow.",
    suggestion: "Vraag om een betaaltermijn van 14 dagen, of maximaal 30 dagen, na factuurdatum.",
  },
];

const FAQ = [
  {
    q: "Is dit juridisch advies?",
    a: "Nee. Niche Doc Scanner is een geautomatiseerde eerste check die je helpt risico's te herkennen en betere vragen te stellen. Bij grote belangen of twijfel raden we altijd een jurist aan.",
  },
  {
    q: "Wat gebeurt er met mijn contract?",
    a: "Je PDF wordt privé opgeslagen en is alleen toegankelijk voor jouw account. De tekst wordt voor de analyse verwerkt door onze AI-leverancier (Anthropic) en niet gebruikt om modellen te trainen.",
  },
  {
    q: "Welke contracten kan ik scannen?",
    a: "Opdrachtovereenkomsten, raamovereenkomsten, algemene voorwaarden, NDA's en andere zakelijke contracten in het Nederlands of Engels. De PDF moet selecteerbare tekst bevatten, dus geen scan of foto.",
  },
  {
    q: "Wat is het verschil tussen €19 en Pro?",
    a: "Met €19 ontgrendel je het volledige rapport van één contract. Met Pro (€9 per maand, maandelijks opzegbaar) ontgrendel je alle rapporten van al je contracten zolang je abonnement loopt.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,oklch(0.627_0.194_149.214/0.12),transparent)]"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:py-20 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5" aria-hidden />
              Voor freelancers en zzp&apos;ers
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              Teken geen contract dat je later <span className="text-risk-high">duur</span> komt te staan.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground text-pretty">
              Upload je opdrachtovereenkomst en zie binnen een minuut welke clausules risicovol zijn, van
              onbeperkte aansprakelijkheid tot een verborgen concurrentiebeding.
            </p>
            <ul className="flex flex-col gap-2 text-sm sm:flex-row sm:gap-5">
              {["Gratis risicoscore", "Geen account nodig", "Resultaat in ~1 minuut"].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <Check className="size-4 text-risk-low" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div id="upload" className="scroll-mt-24">
            <UploadZone />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="hoe-het-werkt" className="scroll-mt-16 border-b">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight">Hoe het werkt</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="flex flex-col gap-3 rounded-xl border bg-card p-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">Stap {i + 1}</span>
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* What we check */}
      <section className="border-b bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Waar we op letten</h2>
            <p className="mt-3 text-muted-foreground">
              De clausules die freelancers in de praktijk het vaakst geld, klanten of rechten kosten.
            </p>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CHECKS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4 rounded-xl border bg-card p-5">
                <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
                <div>
                  <h3 className="font-medium">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Sample report */}
      <section className="border-b">
        <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 py-16 lg:grid-cols-[1fr_1.4fr]">
          <div className="flex flex-col gap-4 lg:sticky lg:top-24">
            <span className="w-fit rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
              Voorbeeld van een rapport
            </span>
            <h2 className="text-3xl font-bold tracking-tight">Precies weten wat je moet aanpassen</h2>
            <p className="text-muted-foreground">
              Elke bevinding bevat het letterlijke citaat uit je contract, een uitleg in gewone taal en een
              verbetervoorstel dat je direct aan je opdrachtgever kunt sturen.
            </p>
            <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
              <SafetyScore score={58} size="sm" />
              <p className="text-sm text-muted-foreground">
                Rood = risicovol, geel = aandachtspunt, groen = in orde.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {SAMPLE_FINDINGS.map((f) => (
              <FindingCard key={f.id} finding={f} />
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="prijzen" className="scroll-mt-16 border-b bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Eenvoudige prijzen</h2>
            <p className="mt-3 text-muted-foreground">De risicoscore is altijd gratis. Betaal alleen voor de details.</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <PriceCard
              title="Gratis scan"
              price={formatEuro(0)}
              cadence="per contract"
              features={["Veiligheidsscore", "Aantal risico's en aandachtspunten", "Titels van gevonden clausules"]}
            />
            <PriceCard
              title={PRICING.report.label}
              price={formatEuro(PRICING.report.amountCents)}
              cadence={PRICING.report.cadence}
              features={[
                "Alles uit de gratis scan",
                "Letterlijke citaten met rood/geel-markering",
                "Concrete verbetervoorstellen",
                "Onderhandelingstips",
              ]}
            />
            <PriceCard
              highlighted
              title={PRICING.pro.label}
              price={formatEuro(PRICING.pro.amountCents)}
              cadence={PRICING.pro.cadence}
              features={[
                "Alle rapporten volledig ontgrendeld",
                "Onbeperkt contracten scannen (fair use)",
                "Maandelijks opzegbaar",
              ]}
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight">Veelgestelde vragen</h2>
          <div className="mt-10 divide-y rounded-xl border bg-card">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {q}
                  <span className="text-xl leading-none text-muted-foreground transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section>
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-4 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-balance">Weet waar je voor tekent</h2>
          <p className="text-muted-foreground">Gratis risicoscore in ongeveer een minuut. Geen account nodig.</p>
          <Button size="lg" asChild>
            <Link href="#upload">Scan je contract gratis</Link>
          </Button>
          <p className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Lock className="size-3" aria-hidden /> Privé opgeslagen
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" aria-hidden /> ~1 minuut
            </span>
          </p>
        </div>
      </section>
    </main>
  );
}

function PriceCard({
  title,
  price,
  cadence,
  features,
  highlighted = false,
}: {
  title: string;
  price: string;
  cadence: string;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <Card className={highlighted ? "border-primary shadow-md" : undefined}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          <span className="text-3xl font-bold text-foreground tabular-nums">{price}</span> {cadence}
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
        <Button className="w-full" variant={highlighted ? "default" : "outline"} asChild>
          <Link href="#upload">Scan je contract</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
