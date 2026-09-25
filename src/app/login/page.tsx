import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { safeNextPath } from "@/lib/safe-redirect";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Inloggen — Niche Doc Scanner",
};

const errorMessages: Record<string, string> = {
  auth: "De inloglink is ongeldig of verlopen. Vraag een nieuwe aan.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  const error = typeof params.error === "string" ? errorMessages[params.error] : undefined;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Inloggen</CardTitle>
            <CardDescription>Geen wachtwoord nodig — we mailen je een veilige inloglink.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {error && (
              <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <LoginForm next={next} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
