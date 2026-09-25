import "server-only";
import { z } from "zod";

// One schema per service, parsed lazily: a route only needs the secrets it uses,
// and `next build` never needs runtime secrets.
const schemas = {
  app: z.object({
    NEXT_PUBLIC_APP_URL: z.url(),
  }),
  supabase: z.object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    SUPABASE_SECRET_KEY: z.string().min(1),
  }),
  anthropic: z.object({
    ANTHROPIC_API_KEY: z.string().startsWith("sk-ant-"),
    ANTHROPIC_MODEL: z.string().min(1).default("claude-opus-5"),
  }),
  stripe: z.object({
    STRIPE_SECRET_KEY: z.string().regex(/^(sk|rk)_(test|live)_/),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
    STRIPE_PRICE_ID_REPORT: z.string().startsWith("price_"),
    STRIPE_PRICE_ID_PRO: z.string().startsWith("price_"),
  }),
  admin: z.object({
    ADMIN_EMAILS: z
      .string()
      .min(1)
      .transform((v) =>
        v
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean),
      ),
  }),
};

type Schemas = typeof schemas;
type Section = keyof Schemas;

const cache = new Map<Section, unknown>();

function load<K extends Section>(section: K): z.infer<Schemas[K]> {
  if (cache.has(section)) return cache.get(section) as z.infer<Schemas[K]>;
  const parsed = schemas[section].safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Ongeldige of ontbrekende environment variables (${section}): ${missing}`);
  }
  cache.set(section, parsed.data);
  return parsed.data as z.infer<Schemas[K]>;
}

export const env = {
  app: () => load("app"),
  supabase: () => load("supabase"),
  anthropic: () => load("anthropic"),
  stripe: () => load("stripe"),
  admin: () => load("admin"),
};
