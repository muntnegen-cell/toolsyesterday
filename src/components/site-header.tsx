import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims && !data.claims.is_anonymous);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="size-4" aria-hidden />
          </span>
          Niche Doc Scanner
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/#hoe-het-werkt" className="hidden rounded-md px-3 py-2 text-muted-foreground hover:text-foreground sm:block">
            Hoe het werkt
          </Link>
          <Link href="/#prijzen" className="hidden rounded-md px-3 py-2 text-muted-foreground hover:text-foreground sm:block">
            Prijzen
          </Link>
          {signedIn ? (
            <form action="/auth/signout" method="post">
              <Button variant="ghost" size="sm" type="submit">
                Uitloggen
              </Button>
            </form>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">Inloggen</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
