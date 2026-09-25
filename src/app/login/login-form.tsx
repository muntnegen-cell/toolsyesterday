"use client";

import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type State = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; email: string } | { kind: "error"; message: string };

export function LoginForm({ next }: { next: string }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!email) return;

    setState({ kind: "sending" });
    const supabase = createClient();
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    // An anonymous visitor who already uploaded contracts keeps them by linking the email
    // to the same user id. If the email already has an account, fall back to a normal login.
    const { data } = await supabase.auth.getUser();
    if (data.user?.is_anonymous) {
      const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo });
      if (!error) return setState({ kind: "sent", email });
      if (error.code !== "email_exists") return setState({ kind: "error", message: error.message });
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo, shouldCreateUser: true },
    });
    setState(error ? { kind: "error", message: error.message } : { kind: "sent", email });
  }

  if (state.kind === "sent") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <MailCheck className="size-10 text-risk-low" aria-hidden />
        <p className="font-medium">Check je inbox</p>
        <p className="text-sm text-muted-foreground">
          We hebben een inloglink gestuurd naar <span className="font-medium text-foreground">{state.email}</span>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mailadres</Label>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="jij@bedrijf.nl" required />
      </div>
      {state.kind === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={state.kind === "sending"}>
        {state.kind === "sending" && <Loader2 className="animate-spin" aria-hidden />}
        Stuur inloglink
      </Button>
    </form>
  );
}
