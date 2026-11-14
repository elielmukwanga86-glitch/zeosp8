-- =============================================================================
-- Vacatio — 0003 : opérations (A1 clients/sites, A2 agents, A3 planning,
--                  A4 pointage, A5 absences/remplacements)
-- Toutes les tables portent org_id ; les clés étrangères composites
-- (org_id, id) garantissent qu'une ligne ne référence jamais une autre entreprise.
-- =============================================================================

-- ---------------------------------------------------------------- A1 clients --
create table public.clients (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.organizations (id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 160),
  kind              text not null default 'entreprise'
                    check (kind in ('entreprise', 'copropriete', 'collectivite', 'particulier', 'autre')),
  siret             text check (siret is null or siret ~ '^[0-9]{14}$'),
  vat_number        text,
  billing_email     text,
  billing_address   text,
  billing_postal_code text,
  billing_city      text,
  payment_terms_days integer check (payment_terms_days between 0 and 60),
  notes             text,
  archived_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (org_id, id)
);
create index clients_org_name_idx on public.clients (org_id, name);

create table public.client_contacts (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null,
  client_id   uuid not null,
  full_name   text not null,
  role        text,
  email       text,
  phone       text,
  receives_reports  boolean not null default true,
  receives_invoices boolean not null default false,
  created_at  timestamptz not null default now(),
  foreign key (org_id, client_id) references public.clients (org_id, id) on delete cascade
);
create index client_contacts_client_idx on public.client_contacts (client_id);

create table public.sites (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null,
  client_id        uuid not null,
  zone_id          uuid,
  name             text not null check (char_length(name) between 1 and 160),
  address_line1    text,
  postal_code      text,
  city             text,
  latitude         double precision check (latitude between -90 and 90),
  longitude        double precision check (longitude between -180 and 180),
  geofence_radius_m integer not null default 150 check (geofence_radius_m between 20 and 2000),
  instructions     text,              -- consignes générales
  opening_hours    jsonb not null default '[]'::jsonb,
  surface_m2       numeric(10,2),
  archived_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (org_id, id),
  foreign key (org_id, client_id) references public.clients (org_id, id) on delete restrict,
  foreign key (org_id, zone_id) references public.zones (org_id, id) on delete set null (zone_id)
);
create index sites_org_idx on public.sites (org_id) where archived_at is null;
create index sites_zone_idx on public.sites (zone_id);
create index sites_client_idx on public.sites (client_id);

-- Codes d'accès (alarme, boîte à clés) : table séparée, lecture restreinte.
create table public.site_access_codes (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null,
  site_id     uuid not null,
  label       text not null,
  secret      text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  foreign key (org_id, site_id) references public.sites (org_id, id) on delete cascade
);
create index site_access_codes_site_idx on public.site_access_codes (site_id);

-- Zones du site (bureaux, sanitaires…) pour le cahier des charges et la qualité.
create table public.site_areas (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null,
  site_id     uuid not null,
  name        text not null,
  position    integer not null default 0,
  unique (org_id, id),
  foreign key (org_id, site_id) references public.sites (org_id, id) on delete cascade
);
create index site_areas_site_idx on public.site_areas (site_id);

-- Cahier des charges : tâche par zone et fréquence.
create table public.site_tasks (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null,
  site_id     uuid not null,
  area_id     uuid,
  label       text not null,
  frequency   text not null check (frequency in
              ('quotidienne', 'hebdomadaire', 'bimensuelle', 'mensuelle', 'trimestrielle', 'annuelle', 'ponctuelle')),
  days_of_week smallint[] check (days_of_week <@ array[1,2,3,4,5,6,7]::smallint[]),
  position    integer not null default 0,
  foreign key (org_id, site_id) references public.sites (org_id, id) on delete cascade,
  foreign key (org_id, area_id) references public.site_areas (org_id, id) on delete set null (area_id)
);
create index site_tasks_site_idx on public.site_tasks (site_id);

-- Contrat de prestation : heures vendues et prix pour un site.
create table public.service_contracts (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null,
  site_id               uuid not null,
  reference             text,
  starts_on             date not null,
  ends_on               date,
  hours_sold_per_month  numeric(8,2) check (hours_sold_per_month >= 0),
  pricing_mode          text not null default 'hourly' check (pricing_mode in ('hourly', 'flat_monthly')),
  hourly_price_cents    integer check (hourly_price_cents >= 0),
  monthly_price_cents   integer check (monthly_price_cents >= 0),
  vat_rate              numeric(5,2) not null default 20.00,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (org_id, id),
  foreign key (org_id, site_id) references public.sites (org_id, id) on delete cascade,
  check (ends_on is null or ends_on >= starts_on)
);
create index service_contracts_site_idx on public.service_contracts (site_id);

-- Créneaux récurrents du contrat → génèrent les vacations du planning.
create table public.contract_schedules (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null,
  contract_id   uuid not null,
  day_of_week   smallint not null check (day_of_week between 1 and 7),   -- 1 = lundi (ISO)
  start_time    time not null,
  end_time      time not null,     -- si end_time <= start_time : la vacation finit le lendemain
  agents_needed smallint not null default 1 check (agents_needed between 1 and 50),
  week_parity   text not null default 'all' check (week_parity in ('all', 'even', 'odd')),
  default_agent_id uuid,
  unique (org_id, id),
  foreign key (org_id, contract_id) references public.service_contracts (org_id, id) on delete cascade
);
create index contract_schedules_contract_idx on public.contract_schedules (contract_id);

-- ----------------------------------------------------------------- A2 agents --
create table public.agents (
  id                     uuid primary key default gen_random_uuid(),
  org_id                 uuid not null references public.organizations (id) on delete cascade,
  user_id                uuid references auth.users (id) on delete set null,
  first_name             text not null check (char_length(first_name) between 1 and 80),
  last_name              text not null check (char_length(last_name) between 1 and 80),
  phone                  text check (phone is null or phone ~ '^\+[1-9][0-9]{6,14}$'),
  email                  text,
  language               public.agent_language not null default 'fr',
  employee_number        text,
  contract_type          public.contract_type not null default 'cdi',
  contract_start         date,
  contract_end           date,
  weekly_contract_hours  numeric(5,2) not null check (weekly_contract_hours between 0 and 48),
  -- Date d'ancienneté dans la branche (reprise article 7 incluse) → prime d'expérience.
  seniority_date         date,
  qualification          text,         -- AS1, AS2, AQS1… (classification IDCC 3043)
  hourly_rate_cents      integer check (hourly_rate_cents >= 0),
  has_driving_licence    boolean not null default false,
  home_postal_code       text,
  home_latitude          double precision,
  home_longitude         double precision,
  status                 public.agent_status not null default 'active',
  transferred_from       text,          -- ancien employeur (article 7)
  notes                  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (org_id, id),
  unique (org_id, user_id),
  check (contract_end is null or contract_start is null or contract_end >= contract_start)
);
create index agents_org_active_idx on public.agents (org_id, last_name) where status = 'active';
create index agents_user_idx on public.agents (user_id);

alter table public.contract_schedules
  add foreign key (org_id, default_agent_id) references public.agents (org_id, id) on delete set null (default_agent_id);

create table public.agent_documents (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null,
  agent_id     uuid not null,
  doc_type     text not null check (doc_type in
               ('contrat', 'avenant', 'titre_sejour', 'piece_identite', 'carte_vitale', 'visite_medicale',
                'habilitation', 'diplome', 'rib', 'autre')),
  label        text,
  file_path    text,                    -- bucket « agent-documents », préfixe {org_id}/
  expires_on   date,
  created_at   timestamptz not null default now(),
  foreign key (org_id, agent_id) references public.agents (org_id, id) on delete cascade
);
create index agent_documents_expiry_idx on public.agent_documents (org_id, expires_on) where expires_on is not null;

create table public.agent_availabilities (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null,
  agent_id     uuid not null,
  day_of_week  smallint not null check (day_of_week between 1 and 7),
  start_time   time not null,
  end_time     time not null,
  foreign key (org_id, agent_id) references public.agents (org_id, id) on delete cascade
);
create index agent_availabilities_agent_idx on public.agent_availabilities (agent_id);

create table public.agent_usual_sites (
  org_id    uuid not null,
  agent_id  uuid not null,
  site_id   uuid not null,
  primary key (agent_id, site_id),
  foreign key (org_id, agent_id) references public.agents (org_id, id) on delete cascade,
  foreign key (org_id, site_id) references public.sites (org_id, id) on delete cascade
);
create index agent_usual_sites_site_idx on public.agent_usual_sites (site_id);

-- --------------------------------------------------------------- A3 planning --
create table public.shifts (
  id                   uuid primary key default gen_random_uuid(),
  org_id               uuid not null references public.organizations (id) on delete cascade,
  site_id              uuid not null,
  agent_id             uuid,                       -- null = vacation à pourvoir
  starts_at            timestamptz not null,
  ends_at              timestamptz not null,
  break_minutes        smallint not null default 0 check (break_minutes between 0 and 240),
  status               public.shift_status not null default 'draft',
  source               public.shift_source not null default 'manual',
  contract_schedule_id uuid,
  replaces_shift_id    uuid,
  absence_id           uuid,
  billable             boolean not null default true,
  notes                text,
  compliance_warnings  jsonb not null default '[]'::jsonb,
  published_at         timestamptz,
  created_by           uuid,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (org_id, id),
  check (ends_at > starts_at),
  check (ends_at - starts_at <= interval '13 hours'),
  foreign key (org_id, site_id) references public.sites (org_id, id) on delete restrict,
  foreign key (org_id, agent_id) references public.agents (org_id, id) on delete set null (agent_id),
  foreign key (org_id, contract_schedule_id) references public.contract_schedules (org_id, id)
    on delete set null (contract_schedule_id),
  foreign key (org_id, replaces_shift_id) references public.shifts (org_id, id)
    on delete set null (replaces_shift_id),
  -- Interdit physiquement la double affectation d'un agent sur des créneaux qui se chevauchent.
  constraint shifts_no_double_booking exclude using gist (
    agent_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (agent_id is not null and status <> 'cancelled')
);
create index shifts_org_time_idx on public.shifts (org_id, starts_at);
create index shifts_agent_time_idx on public.shifts (agent_id, starts_at);
create index shifts_site_time_idx on public.shifts (site_id, starts_at);
-- Empêche de générer deux fois la même vacation récurrente.
create unique index shifts_unique_recurrence
  on public.shifts (contract_schedule_id, starts_at, coalesce(agent_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where contract_schedule_id is not null and status <> 'cancelled';

-- Historique des modifications publiées (pour notifier les agents).
create table public.shift_changes (
  id          bigint generated always as identity primary key,
  org_id      uuid not null,
  shift_id    uuid not null,
  agent_id    uuid,
  change      text not null check (change in ('created', 'updated', 'cancelled', 'reassigned')),
  before      jsonb,
  after       jsonb,
  notified_at timestamptz,
  created_at  timestamptz not null default now(),
  foreign key (org_id, shift_id) references public.shifts (org_id, id) on delete cascade
);
create index shift_changes_pending_idx on public.shift_changes (org_id) where notified_at is null;

create table public.schedule_publications (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations (id) on delete cascade,
  period_start  date not null,
  period_end    date not null,
  published_by  uuid,
  shifts_count  integer not null default 0,
  created_at    timestamptz not null default now()
);

-- --------------------------------------------------------------- A4 pointage --
-- Point de pointage d'un site : QR code imprimé et/ou étiquette NFC.
create table public.site_checkpoints (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null,
  site_id     uuid not null,
  label       text not null default 'Entrée',
  qr_token    text not null unique,                -- jeton aléatoire encodé dans le QR
  nfc_uid     text unique,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (org_id, id),
  foreign key (org_id, site_id) references public.sites (org_id, id) on delete cascade
);
create index site_checkpoints_site_idx on public.site_checkpoints (site_id);

-- Pointages. La position n'est enregistrée qu'à l'instant du pointage (CNIL).
create table public.time_entries (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations (id) on delete cascade,
  shift_id        uuid,
  agent_id        uuid not null,
  site_id         uuid not null,
  checkpoint_id   uuid,
  kind            public.time_entry_kind not null,
  occurred_at     timestamptz not null default now(),
  method          public.time_entry_method not null,
  latitude        double precision,
  longitude       double precision,
  accuracy_m      real,
  distance_m      real,                 -- distance au site calculée au pointage
  recorded_by     uuid,                 -- utilisateur ayant saisi (chef en mode secours)
  device_label    text,                 -- téléphone partagé sur site
  flagged         boolean not null default false,
  flag_reason     text,
  created_at      timestamptz not null default now(),
  foreign key (org_id, shift_id) references public.shifts (org_id, id) on delete set null (shift_id),
  foreign key (org_id, agent_id) references public.agents (org_id, id) on delete cascade,
  foreign key (org_id, site_id) references public.sites (org_id, id) on delete cascade,
  foreign key (org_id, checkpoint_id) references public.site_checkpoints (org_id, id) on delete set null (checkpoint_id)
);
create index time_entries_shift_idx on public.time_entries (shift_id);
create index time_entries_agent_time_idx on public.time_entries (agent_id, occurred_at);
create index time_entries_org_time_idx on public.time_entries (org_id, occurred_at);
-- Un seul pointage d'entrée et un seul de sortie par vacation.
create unique index time_entries_one_per_kind on public.time_entries (shift_id, kind) where shift_id is not null;

-- Appareils partagés sur site (mode secours sans smartphone personnel).
create table public.shared_devices (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null,
  site_id      uuid not null,
  label        text not null,
  token_hash   text not null unique,
  last_seen_at timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now(),
  foreign key (org_id, site_id) references public.sites (org_id, id) on delete cascade
);

-- ---------------------------------------------------- A5 absences/remplacements --
create table public.absences (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations (id) on delete cascade,
  agent_id       uuid not null,
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  reason         public.absence_reason not null,
  status         public.absence_status not null default 'declared',
  comment        text,
  proof_path     text,
  declared_by    uuid,
  reviewed_by    uuid,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (org_id, id),
  check (ends_at > starts_at),
  foreign key (org_id, agent_id) references public.agents (org_id, id) on delete cascade
);
create index absences_agent_time_idx on public.absences (agent_id, starts_at);
create index absences_org_time_idx on public.absences (org_id, starts_at);

alter table public.shifts
  add foreign key (org_id, absence_id) references public.absences (org_id, id) on delete set null (absence_id);

-- Propositions de remplacement envoyées aux candidats (acceptation en un clic par SMS).
create table public.replacement_offers (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null,
  shift_id        uuid not null,                 -- vacation à couvrir
  candidate_id    uuid not null,                 -- agent sollicité
  score           numeric(6,2),                  -- score de suggestion (proximité, conformité…)
  status          public.replacement_status not null default 'proposed',
  token_hash      text not null unique,          -- jeton du lien SMS
  expires_at      timestamptz not null,
  responded_at    timestamptz,
  created_by      uuid,
  created_at      timestamptz not null default now(),
  foreign key (org_id, shift_id) references public.shifts (org_id, id) on delete cascade,
  foreign key (org_id, candidate_id) references public.agents (org_id, id) on delete cascade
);
create index replacement_offers_shift_idx on public.replacement_offers (shift_id);
create unique index replacement_offers_one_accepted
  on public.replacement_offers (shift_id) where status = 'accepted';

-- Alertes opérationnelles et financières affichées au tableau de bord.
create table public.alerts (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  kind         public.alert_kind not null,
  severity     text not null default 'warning' check (severity in ('info', 'warning', 'critical')),
  title        text not null,
  body         text,
  ref_table    text,
  ref_id       uuid,
  site_id      uuid,
  dedupe_key   text,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index alerts_open_idx on public.alerts (org_id, created_at desc) where resolved_at is null;
create unique index alerts_dedupe on public.alerts (org_id, dedupe_key) where resolved_at is null and dedupe_key is not null;

-- ------------------------------------------------------------- déclencheurs --
do $$
declare t text;
begin
  foreach t in array array['clients', 'sites', 'site_access_codes', 'service_contracts', 'agents', 'shifts', 'absences']
  loop
    execute format('create trigger %I_touch before update on public.%I for each row execute function app.touch_updated_at()', t, t);
  end loop;
  foreach t in array array['clients', 'client_contacts', 'sites', 'site_access_codes', 'site_areas', 'site_tasks',
    'service_contracts', 'contract_schedules', 'agents', 'agent_documents', 'agent_availabilities', 'shifts',
    'time_entries', 'site_checkpoints', 'shared_devices', 'absences', 'replacement_offers', 'alerts']
  loop
    execute format('create trigger %I_org_immutable before update on public.%I for each row execute function app.forbid_org_change()', t, t);
  end loop;
end $$;
