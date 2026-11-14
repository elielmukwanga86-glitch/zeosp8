-- =============================================================================
-- Vacatio — 0004 : qualité (B), finance (C), RH et logistique (D)
-- =============================================================================

-- ------------------------------------------------------- B1 contrôles qualité --
create table public.quality_grids (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  site_id     uuid,                       -- null = modèle réutilisable
  name        text not null,
  scale_max   smallint not null default 5 check (scale_max between 2 and 10),
  pass_threshold numeric(5,2) not null default 70 check (pass_threshold between 0 and 100),
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (org_id, id),
  foreign key (org_id, site_id) references public.sites (org_id, id) on delete cascade
);

create table public.quality_grid_items (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null,
  grid_id     uuid not null,
  area_label  text not null,             -- zone (bureaux, sanitaires…)
  criterion   text not null,
  weight      numeric(5,2) not null default 1 check (weight > 0),
  position    integer not null default 0,
  unique (org_id, id),
  foreign key (org_id, grid_id) references public.quality_grids (org_id, id) on delete cascade
);
create index quality_grid_items_grid_idx on public.quality_grid_items (grid_id);

create table public.quality_inspections (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.organizations (id) on delete cascade,
  site_id            uuid not null,
  grid_id            uuid,
  inspector_id       uuid,               -- auth.users.id
  inspected_at       timestamptz not null default now(),
  status             public.inspection_status not null default 'draft',
  score_percent      numeric(5,2) check (score_percent between 0 and 100),
  general_comment    text,
  client_signer_name text,
  client_signature_path text,            -- bucket « signatures »
  signed_at          timestamptz,
  report_pdf_path    text,               -- bucket « reports »
  sent_at            timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (org_id, id),
  foreign key (org_id, site_id) references public.sites (org_id, id) on delete cascade,
  foreign key (org_id, grid_id) references public.quality_grids (org_id, id) on delete set null (grid_id)
);
create index quality_inspections_site_idx on public.quality_inspections (site_id, inspected_at desc);
create index quality_inspections_org_idx on public.quality_inspections (org_id, inspected_at desc);

create table public.quality_results (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null,
  inspection_id  uuid not null,
  item_id        uuid,
  area_label     text not null,
  criterion      text not null,
  weight         numeric(5,2) not null default 1,
  score          smallint,               -- null = non applicable
  comment        text,
  unique (org_id, id),
  foreign key (org_id, inspection_id) references public.quality_inspections (org_id, id) on delete cascade,
  foreign key (org_id, item_id) references public.quality_grid_items (org_id, id) on delete set null (item_id)
);
create index quality_results_inspection_idx on public.quality_results (inspection_id);

create table public.quality_photos (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null,
  inspection_id  uuid not null,
  result_id      uuid,
  kind           public.photo_kind not null default 'other',
  file_path      text not null,           -- bucket « quality-photos »
  taken_at       timestamptz not null default now(),
  foreign key (org_id, inspection_id) references public.quality_inspections (org_id, id) on delete cascade,
  foreign key (org_id, result_id) references public.quality_results (org_id, id) on delete set null (result_id)
);
create index quality_photos_inspection_idx on public.quality_photos (inspection_id);

-- ------------------------------------------------- B3 portail client (lien) --
create table public.client_portal_links (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null,
  client_id     uuid not null,
  contact_id    uuid references public.client_contacts (id) on delete set null,
  token_hash    text not null unique,
  label         text,
  expires_at    timestamptz,
  revoked_at    timestamptz,
  last_used_at  timestamptz,
  created_by    uuid,
  created_at    timestamptz not null default now(),
  foreign key (org_id, client_id) references public.clients (org_id, id) on delete cascade
);
create index client_portal_links_client_idx on public.client_portal_links (client_id);

-- --------------------------------------------------------- B2 réclamations --
create table public.complaints (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations (id) on delete cascade,
  number          integer not null,
  site_id         uuid not null,
  client_id       uuid not null,
  portal_link_id  uuid references public.client_portal_links (id) on delete set null,
  reporter_name   text,
  title           text not null check (char_length(title) between 3 and 160),
  description     text not null check (char_length(description) <= 4000),
  status          public.complaint_status not null default 'open',
  priority        public.complaint_priority not null default 'normal',
  assigned_to     uuid,                     -- auth.users.id
  due_at          timestamptz,
  first_response_at timestamptz,
  resolved_at     timestamptz,
  resolution      text,
  created_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (org_id, id),
  unique (org_id, number),
  foreign key (org_id, site_id) references public.sites (org_id, id) on delete cascade,
  foreign key (org_id, client_id) references public.clients (org_id, id) on delete cascade
);
create index complaints_open_idx on public.complaints (org_id, created_at desc) where status in ('open', 'in_progress');
create index complaints_site_idx on public.complaints (site_id);

create table public.complaint_events (
  id            bigint generated always as identity primary key,
  org_id        uuid not null,
  complaint_id  uuid not null,
  actor_id      uuid,
  actor_label   text,
  event         text not null check (event in ('created', 'comment', 'status', 'assigned', 'photo')),
  body          text,
  data          jsonb,
  is_internal   boolean not null default false,  -- non visible du client
  created_at    timestamptz not null default now(),
  foreign key (org_id, complaint_id) references public.complaints (org_id, id) on delete cascade
);
create index complaint_events_complaint_idx on public.complaint_events (complaint_id, created_at);

create table public.complaint_photos (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null,
  complaint_id  uuid not null,
  file_path     text not null,              -- bucket « complaints »
  created_at    timestamptz not null default now(),
  foreign key (org_id, complaint_id) references public.complaints (org_id, id) on delete cascade
);

-- ------------------------------------------------------------- C1 facturation --
-- Numérotation légale : séquence continue, sans trou, par entreprise, type et année.
create table public.document_sequences (
  org_id      uuid not null references public.organizations (id) on delete cascade,
  doc_type    text not null check (doc_type in ('invoice', 'credit_note', 'quote', 'complaint')),
  year        integer not null,
  last_value  integer not null default 0,
  primary key (org_id, doc_type, year)
);

create table public.quotes (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations (id) on delete cascade,
  number          text,                      -- attribué à l'envoi
  client_id       uuid not null,
  site_id         uuid,
  status          public.quote_status not null default 'draft',
  issue_date      date,
  valid_until     date,
  subject         text,
  notes           text,
  total_ht_cents  bigint not null default 0,
  total_vat_cents bigint not null default 0,
  total_ttc_cents bigint not null default 0,
  pdf_path        text,
  created_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (org_id, id),
  unique (org_id, number),
  foreign key (org_id, client_id) references public.clients (org_id, id) on delete restrict,
  foreign key (org_id, site_id) references public.sites (org_id, id) on delete set null (site_id)
);

create table public.quote_lines (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null,
  quote_id         uuid not null,
  position         integer not null default 0,
  label            text not null,
  quantity         numeric(12,3) not null check (quantity >= 0),
  unit             text not null default 'h',
  unit_price_cents bigint not null,
  vat_rate         numeric(5,2) not null,
  total_ht_cents   bigint not null,
  foreign key (org_id, quote_id) references public.quotes (org_id, id) on delete cascade
);
create index quote_lines_quote_idx on public.quote_lines (quote_id);

-- Prestations ponctuelles (remise en état, vitrerie…) à facturer.
create table public.ad_hoc_services (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null,
  client_id        uuid not null,
  site_id          uuid,
  performed_on     date not null,
  label            text not null,
  quantity         numeric(12,3) not null default 1,
  unit             text not null default 'forfait',
  unit_price_cents bigint not null,
  vat_rate         numeric(5,2) not null default 20.00,
  invoice_id       uuid,                    -- renseigné une fois facturée
  created_at       timestamptz not null default now(),
  unique (org_id, id),
  foreign key (org_id, client_id) references public.clients (org_id, id) on delete cascade,
  foreign key (org_id, site_id) references public.sites (org_id, id) on delete set null (site_id)
);

create table public.invoices (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.organizations (id) on delete cascade,
  kind               public.invoice_kind not null default 'invoice',
  number             text,                    -- attribué à l'émission, jamais réutilisé
  client_id          uuid not null,
  credited_invoice_id uuid,                   -- avoir : facture d'origine
  status             public.invoice_status not null default 'draft',
  issue_date         date,
  due_date           date,
  period_start       date,
  period_end         date,
  -- Copie figée des informations légales au moment de l'émission (mentions obligatoires).
  seller_snapshot    jsonb,
  buyer_snapshot     jsonb,
  notes              text,
  total_ht_cents     bigint not null default 0,
  total_vat_cents    bigint not null default 0,
  total_ttc_cents    bigint not null default 0,
  amount_paid_cents  bigint not null default 0,
  pdf_path           text,                    -- bucket « invoices »
  facturx_path       text,                    -- export Factur-X (facture électronique)
  reminders_paused   boolean not null default false,
  issued_at          timestamptz,
  paid_at            timestamptz,
  created_by         uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (org_id, id),
  unique (org_id, number),
  foreign key (org_id, client_id) references public.clients (org_id, id) on delete restrict,
  foreign key (org_id, credited_invoice_id) references public.invoices (org_id, id) on delete restrict,
  check (status = 'draft' or number is not null)
);
create index invoices_org_status_idx on public.invoices (org_id, status, due_date);
create index invoices_client_idx on public.invoices (client_id);

alter table public.ad_hoc_services
  add foreign key (org_id, invoice_id) references public.invoices (org_id, id) on delete set null (invoice_id);

create table public.invoice_lines (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null,
  invoice_id       uuid not null,
  position         integer not null default 0,
  site_id          uuid,
  label            text not null,
  quantity         numeric(12,3) not null,
  unit             text not null default 'h',
  unit_price_cents bigint not null,
  vat_rate         numeric(5,2) not null,
  total_ht_cents   bigint not null,
  source           text not null default 'manual' check (source in ('hours', 'ad_hoc', 'flat', 'manual')),
  foreign key (org_id, invoice_id) references public.invoices (org_id, id) on delete cascade,
  foreign key (org_id, site_id) references public.sites (org_id, id) on delete set null (site_id)
);
create index invoice_lines_invoice_idx on public.invoice_lines (invoice_id);

-- Vacations facturées par une facture (preuve de passage + évite la double facturation).
create table public.invoice_shifts (
  org_id      uuid not null,
  invoice_id  uuid not null,
  shift_id    uuid not null,
  primary key (invoice_id, shift_id),
  foreign key (org_id, invoice_id) references public.invoices (org_id, id) on delete cascade,
  foreign key (org_id, shift_id) references public.shifts (org_id, id) on delete restrict
);
create index invoice_shifts_shift_idx on public.invoice_shifts (shift_id);

create table public.invoice_attachments (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null,
  invoice_id   uuid not null,
  kind         text not null check (kind in ('time_report', 'inspection_report', 'other')),
  file_path    text not null,
  created_at   timestamptz not null default now(),
  foreign key (org_id, invoice_id) references public.invoices (org_id, id) on delete cascade
);

create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null,
  invoice_id    uuid not null,
  paid_on       date not null,
  amount_cents  bigint not null check (amount_cents > 0),
  method        public.payment_method not null default 'virement',
  reference     text,
  created_by    uuid,
  created_at    timestamptz not null default now(),
  foreign key (org_id, invoice_id) references public.invoices (org_id, id) on delete restrict
);
create index payments_invoice_idx on public.payments (invoice_id);

-- C2 : relances envoyées (J+7, J+15, J+30).
create table public.invoice_reminders (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null,
  invoice_id  uuid not null,
  level       smallint not null check (level in (7, 15, 30)),
  sent_to     text not null,
  sent_at     timestamptz not null default now(),
  unique (invoice_id, level),
  foreign key (org_id, invoice_id) references public.invoices (org_id, id) on delete cascade
);

-- C4 : exports de paie générés.
create table public.payroll_exports (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations (id) on delete cascade,
  period_start  date not null,
  period_end    date not null,
  format        text not null default 'generic' check (format in ('generic', 'silae', 'sage', 'ebp', 'payfit')),
  file_path     text,
  generated_by  uuid,
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------- D1 article 7 (transfert) --
create table public.transfer_dossiers (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations (id) on delete cascade,
  direction     public.transfer_direction not null,
  site_id       uuid,
  counterpart   text,                  -- entreprise sortante / entrante
  transfer_date date not null,
  file_path     text,
  data          jsonb not null default '{}'::jsonb,
  created_by    uuid,
  created_at    timestamptz not null default now(),
  unique (org_id, id),
  foreign key (org_id, site_id) references public.sites (org_id, id) on delete set null (site_id)
);

create table public.transfer_dossier_agents (
  org_id       uuid not null,
  dossier_id   uuid not null,
  agent_id     uuid not null,
  snapshot     jsonb not null,          -- ancienneté, horaires, salaire, contrat au moment du transfert
  primary key (dossier_id, agent_id),
  foreign key (org_id, dossier_id) references public.transfer_dossiers (org_id, id) on delete cascade,
  foreign key (org_id, agent_id) references public.agents (org_id, id) on delete cascade
);

-- ------------------------------------------------------------- D2 stocks --
create table public.products (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations (id) on delete cascade,
  name          text not null,
  category      text not null default 'produit' check (category in ('produit', 'consommable', 'materiel', 'epi')),
  unit          text not null default 'unité',
  unit_cost_cents integer check (unit_cost_cents >= 0),
  supplier      text,
  archived_at   timestamptz,
  created_at    timestamptz not null default now(),
  unique (org_id, id)
);

create table public.site_stock (
  org_id        uuid not null,
  site_id       uuid not null,
  product_id    uuid not null,
  quantity      numeric(10,2) not null default 0,
  min_quantity  numeric(10,2) not null default 0,
  updated_at    timestamptz not null default now(),
  primary key (site_id, product_id),
  foreign key (org_id, site_id) references public.sites (org_id, id) on delete cascade,
  foreign key (org_id, product_id) references public.products (org_id, id) on delete cascade
);

create table public.stock_requests (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations (id) on delete cascade,
  site_id       uuid not null,
  product_id    uuid not null,
  quantity      numeric(10,2) not null default 1 check (quantity > 0),
  requested_by_agent uuid,
  status        public.stock_request_status not null default 'requested',
  comment       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  foreign key (org_id, site_id) references public.sites (org_id, id) on delete cascade,
  foreign key (org_id, product_id) references public.products (org_id, id) on delete cascade,
  foreign key (org_id, requested_by_agent) references public.agents (org_id, id) on delete set null (requested_by_agent)
);
create index stock_requests_open_idx on public.stock_requests (org_id, created_at desc) where status in ('requested', 'ordered');

create table public.stock_movements (
  id          bigint generated always as identity primary key,
  org_id      uuid not null,
  site_id     uuid not null,
  product_id  uuid not null,
  delta       numeric(10,2) not null,
  reason      text not null check (reason in ('delivery', 'consumption', 'inventory', 'transfer')),
  created_by  uuid,
  created_at  timestamptz not null default now(),
  foreign key (org_id, site_id) references public.sites (org_id, id) on delete cascade,
  foreign key (org_id, product_id) references public.products (org_id, id) on delete cascade
);
create index stock_movements_site_idx on public.stock_movements (site_id, created_at desc);

-- -------------------------------------------------------- D3 messagerie --
create table public.messages (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  author_id    uuid,
  title        text not null check (char_length(title) between 1 and 160),
  body         text not null check (char_length(body) <= 2000),
  channels     public.message_channel[] not null default array['in_app']::public.message_channel[],
  audience     jsonb not null default '{"type":"all"}'::jsonb,   -- all | site | zone | agents
  sent_at      timestamptz,
  created_at   timestamptz not null default now(),
  unique (org_id, id)
);

create table public.message_recipients (
  org_id       uuid not null,
  message_id   uuid not null,
  agent_id     uuid not null,
  delivered_via public.message_channel[] not null default '{}',
  read_at      timestamptz,
  primary key (message_id, agent_id),
  foreign key (org_id, message_id) references public.messages (org_id, id) on delete cascade,
  foreign key (org_id, agent_id) references public.agents (org_id, id) on delete cascade
);
create index message_recipients_agent_idx on public.message_recipients (agent_id) where read_at is null;

-- ------------------------------------------------------------- déclencheurs --
do $$
declare t text;
begin
  foreach t in array array['quality_inspections', 'complaints', 'quotes', 'invoices', 'stock_requests']
  loop
    execute format('create trigger %I_touch before update on public.%I for each row execute function app.touch_updated_at()', t, t);
  end loop;
  foreach t in array array['quality_grids', 'quality_grid_items', 'quality_inspections', 'quality_results',
    'quality_photos', 'client_portal_links', 'complaints', 'complaint_photos', 'quotes', 'quote_lines',
    'ad_hoc_services', 'invoices', 'invoice_lines', 'invoice_attachments', 'payments', 'payroll_exports',
    'transfer_dossiers', 'products', 'stock_requests', 'messages']
  loop
    execute format('create trigger %I_org_immutable before update on public.%I for each row execute function app.forbid_org_change()', t, t);
  end loop;
end $$;

-- Une facture émise est figée (obligation légale) : seuls le statut, les paiements,
-- les chemins de PDF et la pause des relances peuvent encore évoluer.
create or replace function app.protect_issued_invoice()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'Une facture émise ne peut pas être supprimée ; émettre un avoir.' using errcode = '42501';
    end if;
    return old;
  end if;
  if old.status <> 'draft' and (
       new.number is distinct from old.number
    or new.client_id is distinct from old.client_id
    or new.kind is distinct from old.kind
    or new.issue_date is distinct from old.issue_date
    or new.due_date is distinct from old.due_date
    or new.total_ht_cents is distinct from old.total_ht_cents
    or new.total_vat_cents is distinct from old.total_vat_cents
    or new.total_ttc_cents is distinct from old.total_ttc_cents
    or new.seller_snapshot is distinct from old.seller_snapshot
    or new.buyer_snapshot is distinct from old.buyer_snapshot
    or new.status = 'draft'
  ) then
    raise exception 'Une facture émise est non modifiable ; émettre un avoir.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger invoices_protect_issued
  before update or delete on public.invoices
  for each row execute function app.protect_issued_invoice();

create or replace function app.protect_issued_invoice_lines()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status public.invoice_status;
begin
  select status into v_status from public.invoices
   where id = coalesce(new.invoice_id, old.invoice_id);
  if v_status is not null and v_status <> 'draft' then
    raise exception 'Les lignes d''une facture émise sont non modifiables.' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger invoice_lines_protect_issued
  before insert or update or delete on public.invoice_lines
  for each row execute function app.protect_issued_invoice_lines();
