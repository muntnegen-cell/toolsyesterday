-- =====================================================================
-- Niche Doc Scanner — initieel schema
-- Uitvoeren in: Supabase Dashboard → SQL Editor → New query → Run
-- (of via de Supabase CLI: `supabase db push`)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles: 1-op-1 met auth.users (ook anonieme gebruikers)
-- ---------------------------------------------------------------------
create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  email              text,
  stripe_customer_id text unique,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Maakt automatisch een profiel aan bij elke nieuwe (ook anonieme) gebruiker.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Houdt profiles.email gelijk wanneer een anonieme gebruiker een e-mailadres koppelt.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------
-- documents: geüploade contracten + teaser (géén volledig rapport)
-- ---------------------------------------------------------------------
create type public.document_status as enum ('uploaded', 'analyzing', 'analyzed', 'failed');

create table public.documents (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  file_name       text not null check (char_length(file_name) between 1 and 255),
  storage_path    text not null unique,
  file_size_bytes integer not null check (file_size_bytes > 0),
  page_count      integer check (page_count > 0),
  status          public.document_status not null default 'uploaded',
  risk_score      smallint check (risk_score between 0 and 100),
  teaser          jsonb,
  error_message   text,
  unlocked_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index documents_user_id_created_at_idx on public.documents (user_id, created_at desc);

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- document_reports: het betaalde volledige rapport, apart opgeslagen
-- zodat RLS het pas vrijgeeft na betaling of met een actief Pro-abonnement.
-- ---------------------------------------------------------------------
create table public.document_reports (
  document_id uuid primary key references public.documents (id) on delete cascade,
  report      jsonb not null,
  model       text not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- subscriptions: gespiegeld vanuit Stripe via de webhook
-- ---------------------------------------------------------------------
create table public.subscriptions (
  id                   text primary key, -- Stripe subscription id (sub_...)
  user_id              uuid not null references public.profiles (id) on delete cascade,
  status               text not null check (status in (
                         'incomplete', 'incomplete_expired', 'trialing', 'active',
                         'past_due', 'canceled', 'unpaid', 'paused')),
  price_id             text not null,
  amount_cents         integer not null check (amount_cents >= 0),
  currency             text not null default 'eur',
  interval             text not null default 'month' check (interval in ('day', 'week', 'month', 'year')),
  cancel_at_period_end boolean not null default false,
  current_period_start timestamptz,
  current_period_end   timestamptz,
  canceled_at          timestamptz,
  ended_at             timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index subscriptions_user_id_idx on public.subscriptions (user_id);
create index subscriptions_status_idx on public.subscriptions (status);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- payments: elke geslaagde/terugbetaalde transactie (admin live feed)
-- ---------------------------------------------------------------------
create table public.payments (
  id                         text primary key, -- Stripe payment_intent (pi_...) of invoice (in_...)
  user_id                    uuid references public.profiles (id) on delete set null,
  document_id                uuid references public.documents (id) on delete set null,
  subscription_id            text references public.subscriptions (id) on delete set null,
  kind                       text not null check (kind in ('report', 'subscription')),
  amount_cents               integer not null check (amount_cents >= 0),
  currency                   text not null default 'eur',
  status                     text not null check (status in ('succeeded', 'refunded', 'failed')),
  customer_email             text,
  stripe_checkout_session_id text unique,
  created_at                 timestamptz not null default now()
);

create index payments_created_at_idx on public.payments (created_at desc);
create index payments_user_id_idx on public.payments (user_id);

-- ---------------------------------------------------------------------
-- stripe_events: idempotentie voor de webhook (Stripe kan events herhalen)
-- ---------------------------------------------------------------------
create table public.stripe_events (
  id           text primary key, -- Stripe event id (evt_...)
  type         text not null,
  processed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Toegangsfuncties (gebruikt door RLS en de app)
-- ---------------------------------------------------------------------
create or replace function public.has_active_subscription(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.user_id = uid
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

create or replace function public.can_view_full_report(doc_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.documents d
    where d.id = doc_id
      and d.user_id = auth.uid()
      and (d.unlocked_at is not null or public.has_active_subscription(d.user_id))
  );
$$;

revoke execute on function public.has_active_subscription(uuid) from public, anon;
revoke execute on function public.can_view_full_report(uuid) from public, anon;
grant execute on function public.has_active_subscription(uuid) to authenticated, service_role;
grant execute on function public.can_view_full_report(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Row Level Security
-- Clients mogen alleen LEZEN. Alle schrijfacties (analyse, betaling,
-- ontgrendelen) lopen server-side via de secret key, die RLS omzeilt.
-- ---------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.documents        enable row level security;
alter table public.document_reports enable row level security;
alter table public.subscriptions    enable row level security;
alter table public.payments         enable row level security;
alter table public.stripe_events    enable row level security;

create policy "Eigen profiel lezen"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Eigen documenten lezen"
  on public.documents for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Volledig rapport lezen na betaling of met Pro"
  on public.document_reports for select to authenticated
  using (public.can_view_full_report(document_id));

create policy "Eigen abonnementen lezen"
  on public.subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Eigen betalingen lezen"
  on public.payments for select to authenticated
  using ((select auth.uid()) = user_id);

-- stripe_events: bewust geen policies → alleen de service role heeft toegang.

-- ---------------------------------------------------------------------
-- Storage: privé bucket voor PDF's, max 10 MB, alleen application/pdf.
-- Pad-conventie: {user_id}/{uuid}.pdf
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contracts', 'contracts', false, 10485760, array['application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Contract uploaden in eigen map"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'contracts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Eigen contracten lezen"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'contracts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
