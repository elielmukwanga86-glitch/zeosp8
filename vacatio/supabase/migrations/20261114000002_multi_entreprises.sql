-- =============================================================================
-- Vacatio — 0002 : multi-entreprises, utilisateurs, rôles, abonnement
-- =============================================================================

-- Profil applicatif d'un utilisateur Supabase Auth (gérant, chef, agent).
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 120),
  phone       text check (phone is null or phone ~ '^\+[1-9][0-9]{6,14}$'),
  locale      public.agent_language not null default 'fr',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Entreprise cliente de Vacatio (le « tenant »).
create table public.organizations (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null check (char_length(name) between 2 and 120),
  slug                    text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  legal_name              text check (char_length(legal_name) <= 160),
  siret                   text check (siret is null or siret ~ '^[0-9]{14}$'),
  vat_number              text check (vat_number is null or vat_number ~ '^FR[0-9A-Z]{2}[0-9]{9}$'),
  legal_form              text,                     -- SAS, SARL, EI…
  share_capital_cents     bigint check (share_capital_cents >= 0),
  rcs_city                text,
  address_line1           text,
  address_line2           text,
  postal_code             text check (postal_code is null or postal_code ~ '^[0-9]{5}$'),
  city                    text,
  country                 text not null default 'FR',
  phone                   text,
  email                   text,
  logo_path               text,
  timezone                text not null default 'Europe/Paris',
  -- Coefficient de charges patronales appliqué au taux horaire brut (rentabilité C3).
  employer_charge_rate    numeric(5,4) not null default 0.4200 check (employer_charge_rate between 0 and 2),
  default_vat_rate        numeric(5,2) not null default 20.00 check (default_vat_rate between 0 and 100),
  payment_terms_days      integer not null default 30 check (payment_terms_days between 0 and 60),
  late_penalty_rate       numeric(5,2) not null default 10.00,   -- taux des pénalités de retard (%)
  invoice_prefix          text not null default 'F' check (invoice_prefix ~ '^[A-Z0-9-]{1,8}$'),
  quote_prefix            text not null default 'D' check (quote_prefix ~ '^[A-Z0-9-]{1,8}$'),
  -- Surcharges éventuelles des règles de conformité (voir src/config/conformite).
  compliance_overrides    jsonb not null default '{}'::jsonb,
  settings                jsonb not null default '{}'::jsonb,
  onboarding              jsonb not null default '{}'::jsonb,  -- étapes F4 terminées
  -- Abonnement (miroir de Stripe ; source de vérité : webhooks Stripe).
  plan                    public.plan_code not null default 'pro',
  subscription_status     public.subscription_status not null default 'trialing',
  billing_interval        public.billing_interval,
  trial_ends_at           timestamptz,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean not null default false,
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  promo_code              text,
  is_demo                 boolean not null default false,
  deleted_at              timestamptz,               -- suppression RGPD différée
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- Zones géographiques confiées à un chef d'équipe.
create table public.zones (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  created_at  timestamptz not null default now(),
  unique (org_id, id),
  unique (org_id, name)
);

-- Appartenance d'un utilisateur à une entreprise, avec son rôle.
create table public.memberships (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        public.app_role not null,
  status      public.membership_status not null default 'active',
  is_owner    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (org_id, user_id),
  unique (org_id, id)
);
create index memberships_user_idx on public.memberships (user_id) where status = 'active';
-- Un seul propriétaire par entreprise.
create unique index memberships_one_owner on public.memberships (org_id) where is_owner;

-- Zones gérées par un chef d'équipe.
create table public.zone_managers (
  org_id         uuid not null,
  zone_id        uuid not null,
  membership_id  uuid not null,
  primary key (zone_id, membership_id),
  foreign key (org_id, zone_id) references public.zones (org_id, id) on delete cascade,
  foreign key (org_id, membership_id) references public.memberships (org_id, id) on delete cascade
);
create index zone_managers_membership_idx on public.zone_managers (membership_id);

-- Invitations envoyées par e-mail aux gérants et chefs d'équipe.
create table public.invitations (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  email        text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role         public.app_role not null check (role in ('gerant', 'chef_equipe')),
  token_hash   text not null unique,          -- SHA-256 du jeton envoyé ; le jeton n'est jamais stocké
  invited_by   uuid references auth.users (id) on delete set null,
  expires_at   timestamptz not null default now() + interval '7 days',
  accepted_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index invitations_org_idx on public.invitations (org_id);
create unique index invitations_pending_email
  on public.invitations (org_id, lower(email)) where accepted_at is null;

-- Équipe Vacatio (super-admin F10).
create table public.platform_admins (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- Code promo (FONDATEUR : -40 % à vie, 10 premiers clients).
create table public.promo_codes (
  code              text primary key check (code ~ '^[A-Z0-9_-]{3,32}$'),
  percent_off       integer not null check (percent_off between 1 and 100),
  max_redemptions   integer check (max_redemptions > 0),
  redeemed_count    integer not null default 0 check (redeemed_count >= 0),
  stripe_coupon_id  text,
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  check (max_redemptions is null or redeemed_count <= max_redemptions)
);

-- Événements Stripe déjà traités (idempotence des webhooks).
create table public.stripe_events (
  id            text primary key,
  type          text not null,
  processed_at  timestamptz not null default now()
);

-- Journal d'audit (toutes les écritures sensibles).
create table public.audit_log (
  id          bigint generated always as identity primary key,
  org_id      uuid references public.organizations (id) on delete cascade,
  actor_id    uuid,                    -- auth.users.id, null si système
  action      text not null,           -- insert / update / delete / login_as…
  table_name  text,
  row_id      uuid,
  diff        jsonb,
  ip          inet,
  created_at  timestamptz not null default now()
);
create index audit_log_org_created_idx on public.audit_log (org_id, created_at desc);

-- File d'envoi des e-mails / SMS / WhatsApp (traitée par une Edge Function cron).
create table public.notification_outbox (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid references public.organizations (id) on delete cascade,
  channel       public.message_channel not null,
  recipient     text not null,
  template      text not null,
  payload       jsonb not null default '{}'::jsonb,
  status        public.outbox_status not null default 'pending',
  attempts      integer not null default 0,
  last_error    text,
  send_after    timestamptz not null default now(),
  sent_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index notification_outbox_pending_idx
  on public.notification_outbox (send_after) where status = 'pending';

-- Limitation de débit (rate limiting) côté base : fenêtre fixe par clé.
create table public.rate_limits (
  key           text not null,
  window_start  timestamptz not null,
  hits          integer not null default 1,
  primary key (key, window_start)
);

-- Demandes RGPD (export / suppression).
create table public.gdpr_requests (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations (id) on delete cascade,
  requested_by  uuid references auth.users (id) on delete set null,
  kind          text not null check (kind in ('export', 'delete')),
  status        text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  file_path     text,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);

-- Prospects du site vitrine (formulaire de démo, F1). Pas d'org.
create table public.demo_requests (
  id            uuid primary key default gen_random_uuid(),
  company_name  text not null check (char_length(company_name) <= 160),
  contact_name  text not null check (char_length(contact_name) <= 120),
  email         text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone         text,
  agents_count  integer check (agents_count between 0 and 10000),
  message       text check (char_length(message) <= 2000),
  source        text,
  created_at    timestamptz not null default now()
);

-- Jours fériés (France métropolitaine ; Alsace-Moselle via colonne region).
create table public.public_holidays (
  day     date not null,
  label   text not null,
  region  text not null default 'FR',
  primary key (day, region)
);

-- -----------------------------------------------------------------------------
-- Déclencheurs
-- -----------------------------------------------------------------------------
create trigger profiles_touch before update on public.profiles
  for each row execute function app.touch_updated_at();
create trigger organizations_touch before update on public.organizations
  for each row execute function app.touch_updated_at();
create trigger memberships_touch before update on public.memberships
  for each row execute function app.touch_updated_at();
create trigger memberships_org_immutable before update on public.memberships
  for each row execute function app.forbid_org_change();

-- Création automatique du profil à l'inscription.
create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();
