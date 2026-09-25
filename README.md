# Niche Doc Scanner

Micro-SaaS voor freelancers en zzp'ers: upload een PDF-contract, krijg een AI-risicoscan
(Anthropic Claude), ontgrendel het volledige rapport via Stripe (€19 eenmalig of €9/maand Pro).

**Stack:** Next.js 16 (App Router, TypeScript) · Tailwind CSS v4 · Shadcn UI · Supabase · Stripe · pdf-parse · Anthropic API · Vercel

## Vereisten

- Node.js **≥ 22.3** (vereist door pdf-parse v2)
- Accounts: Supabase, Stripe, Anthropic, Vercel
- [Stripe CLI](https://docs.stripe.com/stripe-cli) voor lokale webhooks

## Supabase instellen

1. Maak een project aan op [supabase.com](https://supabase.com) (regio: `eu-central-1` Frankfurt, i.v.m. AVG).
2. **SQL Editor → New query** → voer de bestanden in `supabase/migrations/` één voor één uit, op volgorde van naam:
   `20260925000000_init.sql`, daarna `20260926000000_analysis_limits.sql`.
3. **Authentication → Sign In / Providers**:
   - **Email**: aan (magic link).
   - **Allow anonymous sign-ins**: aan (bezoekers kunnen uploaden zonder account).
4. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` (later je productiedomein).
   - Redirect URLs: `http://localhost:3000/auth/callback` en `https://<jouw-domein>/auth/callback`.
5. **Project Settings → API Keys**: kopieer de publishable en secret key naar `.env.local`.
6. Aanbevolen voor productie: **Authentication → Attack Protection → CAPTCHA** (Cloudflare Turnstile) tegen misbruik van anonieme sessies.

## Lokaal starten

```bash
npm install
cp .env.example .env.local   # vul alle waarden in
npm run dev                  # http://localhost:3000
```

Stripe-webhooks lokaal doorsturen (in een tweede terminal):

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhook
# kopieer de getoonde whsec_... naar STRIPE_WEBHOOK_SECRET
```

## Scripts

| Script              | Doel                        |
| ------------------- | --------------------------- |
| `npm run dev`       | Development server          |
| `npm run build`     | Productie-build             |
| `npm run lint`      | ESLint                      |
| `npm run typecheck` | TypeScript-controle         |

## Mappenstructuur

```
.
├── supabase/migrations/          # SQL-schema (fase 2)
├── src/
│   ├── proxy.ts                  # Supabase sessie-refresh + /admin guard (fase 2, Next 16: vervangt middleware.ts)
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Landing + drag-and-drop upload (fase 3)
│   │   ├── globals.css           # Tailwind v4 + Shadcn theme + risk-kleuren
│   │   ├── login/                # Magic-link login (fase 2)
│   │   ├── auth/callback/        # Supabase auth callback (fase 2)
│   │   ├── report/[id]/          # Teaser / volledig rapport (fase 3 + 5)
│   │   ├── admin/                # MRR, abonnees, transactie-feed (fase 6)
│   │   └── api/
│   │       ├── analyze/          # PDF → tekst → Claude → JSON (fase 4)
│   │       ├── checkout/         # Stripe Checkout Session (fase 5)
│   │       └── webhook/          # Stripe webhook → Supabase (fase 5)
│   ├── components/
│   │   ├── ui/                   # Shadcn UI primitives
│   │   ├── upload/ report/ paywall/ admin/
│   ├── lib/
│   │   ├── env.ts                # Zod-gevalideerde server env
│   │   ├── utils.ts              # cn() + formatEuro()
│   │   └── supabase/             # browser/server/admin clients (fase 2)
│   └── types/                    # Database- en analyse-types
```
