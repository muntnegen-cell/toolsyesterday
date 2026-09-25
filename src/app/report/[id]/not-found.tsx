import Link from "next/link";
import { FileX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReportNotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <FileX className="size-10 text-muted-foreground" aria-hidden />
      <h1 className="text-xl font-semibold">Rapport niet gevonden</h1>
      <p className="text-sm text-muted-foreground">
        Dit rapport bestaat niet of hoort bij een ander account. Log in met het e-mailadres waarmee je hebt
        betaald om je rapporten terug te zien.
      </p>
      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href="/login">Inloggen</Link>
        </Button>
        <Button asChild>
          <Link href="/">Contract scannen</Link>
        </Button>
      </div>
    </main>
  );
}
