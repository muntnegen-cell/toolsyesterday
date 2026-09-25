import "server-only";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return env.admin().ADMIN_EMAILS.includes(email.toLowerCase());
}

export async function getUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

// Defense in depth: the proxy also guards /admin, but pages must not rely on it alone.
export async function requireAdmin() {
  const user = await getUser();
  if (!user || user.is_anonymous) redirect("/login?next=/admin");
  if (!isAdminEmail(user.email)) redirect("/");
  return user;
}
