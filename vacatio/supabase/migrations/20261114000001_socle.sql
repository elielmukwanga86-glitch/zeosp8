-- =============================================================================
-- Vacatio — 0001 : socle (extensions, schéma app, types énumérés, utilitaires)
-- =============================================================================

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

-- Schéma interne : fonctions d'aide aux politiques RLS, jamais exposé par l'API.
create schema if not exists app;
grant usage on schema app to authenticated, anon, service_role;

-- -----------------------------------------------------------------------------
-- Types énumérés
-- -----------------------------------------------------------------------------
create type public.app_role as enum ('gerant', 'chef_equipe', 'agent');
create type public.membership_status as enum ('active', 'invited', 'suspended');
create type public.plan_code as enum ('decouverte', 'essentiel', 'pro', 'business');
create type public.subscription_status as enum
  ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'unpaid', 'free');
create type public.billing_interval as enum ('month', 'year');
create type public.agent_language as enum ('fr', 'en', 'pt', 'es', 'ar');
create type public.contract_type as enum ('cdi', 'cdd', 'interim', 'extra');
create type public.agent_status as enum ('active', 'inactive', 'left');
create type public.shift_status as enum ('draft', 'published', 'cancelled');
create type public.shift_source as enum ('contract', 'manual', 'replacement', 'import', 'ad_hoc');
create type public.time_entry_kind as enum ('in', 'out');
create type public.time_entry_method as enum ('qr', 'nfc', 'manual_chef', 'shared_device', 'gps_only');
create type public.absence_reason as enum
  ('maladie', 'conges_payes', 'absence_injustifiee', 'accident_travail', 'evenement_familial',
   'formation', 'sans_solde', 'autre');
create type public.absence_status as enum ('declared', 'approved', 'rejected', 'cancelled');
create type public.replacement_status as enum ('proposed', 'accepted', 'declined', 'expired', 'cancelled');
create type public.inspection_status as enum ('draft', 'completed', 'signed', 'sent');
create type public.photo_kind as enum ('before', 'after', 'other');
create type public.complaint_status as enum ('open', 'in_progress', 'resolved', 'closed');
create type public.complaint_priority as enum ('low', 'normal', 'high', 'urgent');
create type public.quote_status as enum ('draft', 'sent', 'accepted', 'refused', 'expired');
create type public.invoice_kind as enum ('invoice', 'credit_note');
create type public.invoice_status as enum ('draft', 'issued', 'paid', 'partially_paid', 'cancelled');
create type public.payment_method as enum ('virement', 'prelevement', 'cheque', 'carte', 'especes', 'autre');
create type public.transfer_direction as enum ('outgoing', 'incoming');
create type public.stock_request_status as enum ('requested', 'ordered', 'delivered', 'cancelled');
create type public.message_channel as enum ('in_app', 'sms', 'whatsapp', 'email');
create type public.alert_kind as enum
  ('no_show', 'uncovered_absence', 'document_expiring', 'site_at_loss', 'invoice_overdue',
   'compliance', 'stock_low', 'complaint_open');
create type public.outbox_status as enum ('pending', 'sent', 'failed', 'cancelled');

-- -----------------------------------------------------------------------------
-- Utilitaires
-- -----------------------------------------------------------------------------
create or replace function app.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Empêche de déplacer une ligne d'une entreprise à une autre.
create or replace function app.forbid_org_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.org_id is distinct from old.org_id then
    raise exception 'org_id est immuable' using errcode = '42501';
  end if;
  return new;
end;
$$;
