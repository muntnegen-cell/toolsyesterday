import Link from "next/link";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";

// Anonymous sessions live in one browser's cookies; linking an email keeps paid reports reachable.
export function SaveAccessBanner({ next }: { next: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <KeyRound className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="text-sm">
          <p className="font-medium">Bewaar je toegang</p>
          <p className="text-muted-foreground">
            Je bent niet ingelogd. Koppel je e-mailadres, anders ben je je rapporten kwijt als je cookies wist of
            een ander apparaat gebruikt.
          </p>
        </div>
      </div>
      <Button asChild size="sm" className="shrink-0">
        <Link href={`/login?next=${encodeURIComponent(next)}`}>E-mailadres koppelen</Link>
      </Button>
    </div>
  );
}
