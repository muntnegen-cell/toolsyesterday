# Addertje

Micro-SaaS voor freelancers en zzp'ers: vind het addertje onder het gras voor je tekent.
Upload een PDF-contract, krijg een AI-risicoscan
(Anthropic Claude), ontgrendel het volledige rapport via Stripe (€19 eenmalig of €9/maand Pro).

**Stack:** Next.js 16 (App Router, TypeScript) · Tailwind CSS v4 · Shadcn UI · Supabase · Stripe · pdf-parse · Anthropic API · Docker op Hetzner

## Vereisten

- Node.js **≥ 22.3** (vereist door pdf-parse v2)
- Accounts: Supabase, Stripe, Anthropic; een Hetzner-server met Docker
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

## Stripe instellen

1. **Producten** (Product catalog → Add product, testmodus):
   - "Volledig Rapport": prijs **€19,00 EUR, eenmalig** → kopieer de `price_…` naar `STRIPE_PRICE_ID_REPORT`.
   - "Pro Abonnement": prijs **€9,00 EUR, terugkerend per maand** → `STRIPE_PRICE_ID_PRO`.
2. **Betaalmethoden** (Settings → Payment methods): zet iDEAL, Bancontact en kaarten aan. Checkout toont automatisch wat aan staat.
3. **Klantportaal** (Settings → Billing → Customer portal): activeer het en sta "abonnement opzeggen" en "betaalmethode wijzigen" toe.
4. **Webhook** (Developers → Webhooks → Add endpoint), URL `https://<jouw-domein>/api/webhook`, met deze events:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`,
   `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, `charge.refunded`.
   Kopieer het signing secret (`whsec_…`) naar `STRIPE_WEBHOOK_SECRET` in de `.env` op de server.
5. **E-mails** (Settings → Customer emails): zet bonnetjes voor geslaagde betalingen aan, zodat klanten een betaalbewijs krijgen.

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

## Deployment op Hetzner (`contract.renderyesterday.com`)

De app draait als Docker-container (Next.js standalone) achter Caddy, dat automatisch HTTPS regelt.

### 1. Server voorbereiden (eenmalig)

- Hetzner Cloud-server met Ubuntu 24.04, bij voorkeur in **Falkenstein of Nürnberg** (dicht bij Supabase Frankfurt).
  Zowel x86 (CX/CPX) als ARM (CAX) werkt; minimaal 2 GB RAM voor de build.
- Firewall (Hetzner Cloud Firewall of `ufw`): alleen poort **22, 80 en 443** open.
- Docker installeren: `curl -fsSL https://get.docker.com | sh`

### 2. DNS

Bij de DNS-provider van renderyesterday.com:

| Type | Naam | Waarde |
|---|---|---|
| `A` | `contract` | IPv4-adres van de server |
| `AAAA` | `contract` | IPv6-adres van de server (optioneel) |

### 3. Code en configuratie

```bash
git clone https://github.com/muntnegen-cell/toolsyesterday.git /opt/addertje
cd /opt/addertje
cp .env.example .env
nano .env   # productiewaarden invullen, zie hieronder
chmod 600 .env
```

In `.env` op de server:
- `NEXT_PUBLIC_APP_URL=https://contract.renderyesterday.com`
- de Supabase-, Anthropic- en **live** Stripe-waarden
- `ADMIN_EMAILS` met je eigen e-mailadres

`.env` staat niet in git en komt niet in de image: compose geeft de `NEXT_PUBLIC_*`-waarden als build args door
(ze worden in de JavaScript gebakken) en alle waarden als runtime-omgeving.

### 4. Starten

```bash
docker compose up -d --build
docker compose ps          # app moet "healthy" worden
docker compose logs -f app
```

**Draait er al een reverse proxy op de server** (bijv. voor `secure.renderyesterday.com`)? Start dan alleen de app
(`docker compose up -d --build app`) en laat die proxy doorsturen naar `127.0.0.1:3000`. Is poort 3000 al bezet,
zet dan bijvoorbeeld `APP_PORT=3100` in `.env` en gebruik die poort. Voor nginx:

```nginx
server {
    server_name contract.renderyesterday.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        # $remote_addr (niet $proxy_add_x_forwarded_for): voorkomt dat bezoekers hun IP vervalsen
        # om de limiet op gratis scans te omzeilen.
        proxy_set_header X-Forwarded-For $remote_addr;
        # Een analyse kan tot enkele minuten duren; de standaard van 60 s is te kort.
        proxy_read_timeout 300s;
    }
    # + certbot/Let's Encrypt voor HTTPS
}
```

De meegeleverde Caddy doet dit allemaal standaard goed.

### 5. Updates uitrollen

```bash
cd /opt/addertje && git pull && docker compose up -d --build
```

### 6. Externe diensten koppelen

- **Supabase** → Authentication → URL Configuration: Site URL `https://contract.renderyesterday.com`,
  Redirect URL `https://contract.renderyesterday.com/auth/callback`.
  Stel onder Authentication → Emails een **eigen SMTP-server** in (bijv. Resend of Postmark, afzender `@renderyesterday.com`):
  de ingebouwde mailservice van Supabase verstuurt maar een paar e-mails per uur en is niet bedoeld voor productie.
- **Stripe live**: maak de twee producten opnieuw aan in live mode, en een webhook-endpoint
  `https://contract.renderyesterday.com/api/webhook` met dezelfde events als hierboven. Zet de live keys en het nieuwe
  `whsec_…` in `.env` en voer `docker compose up -d` opnieuw uit.
- **Anthropic**: stel in de console een maandelijks uitgavenlimiet in.

### 7. Rooktest

Scan een contract, betaal €19 met een echte kaart, controleer `/admin`, en betaal terug via Stripe
(het rapport moet weer vergrendelen).

### Vóór je live gaat

- Automatische beveiligingsupdates op de server: `apt install unattended-upgrades`.
- Privacyverklaring (AVG): contracten bevatten persoonsgegevens. Verwerkers: Supabase, Anthropic, Stripe, Hetzner.
- Algemene voorwaarden, en KvK- en btw-nummer in de footer (Stripe vraagt hier ook om).
- Bewaartermijn voor geüploade contracten bepalen en communiceren.
- CAPTCHA aanzetten in Supabase (zie hierboven).
