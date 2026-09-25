import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

// Visitors upload before creating an account; an anonymous session gives them a real
// auth.uid() so RLS and storage policies apply. Linking an email later keeps the same id.
export async function ensureSession(supabase = createClient()) {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;

  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error || !anon.session) {
    throw new Error(error?.message ?? "Kon geen sessie starten. Probeer het opnieuw.");
  }
  return anon.session;
}
