import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().startsWith("sk-ant-"),
  ANTHROPIC_MODEL: z.string().min(1).default("claude-sonnet-5"),
  STRIPE_SECRET_KEY: z.string().regex(/^(sk|rk)_(test|live)_/),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  STRIPE_PRICE_ID_REPORT: z.string().startsWith("price_"),
  STRIPE_PRICE_ID_PRO: z.string().startsWith("price_"),
  ADMIN_EMAILS: z
    .string()
    .min(1)
    .transform((v) => v.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

// Lazy so `next build` doesn't fail when secrets are only present at runtime.
export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Ongeldige of ontbrekende environment variables: ${missing}`);
  }
  cached = parsed.data;
  return cached;
}
