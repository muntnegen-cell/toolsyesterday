-- =====================================================================
-- Fase 4: misbruiklimieten voor gratis analyses
-- Uitvoeren na 20260925000000_init.sql (SQL Editor → New query → Run)
-- =====================================================================

-- Gehashte (gezouten SHA-256) IP-adressen: genoeg om per netwerk te limiteren,
-- zonder het IP-adres zelf op te slaan.
alter table public.documents add column ip_hash text;

create index documents_ip_hash_created_at_idx on public.documents (ip_hash, created_at desc)
  where ip_hash is not null;

comment on column public.documents.risk_score is
  'Veiligheidsscore 0-100: hoger = veiliger (85 = "85% veilig").';
