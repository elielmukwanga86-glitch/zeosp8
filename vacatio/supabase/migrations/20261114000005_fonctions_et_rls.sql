-- =============================================================================
-- Vacatio — 0005 : fonctions d'autorisation, RLS sur TOUTES les tables,
--                  RPC d'inscription / invitation, limites de forfait, audit
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Fonctions d'aide (SECURITY DEFINER, search_path vide, résultats stables)
-- -----------------------------------------------------------------------------
create or replace function app.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

-- Rôle de l'utilisateur courant dans une entreprise (null si non membre actif).
create or replace function app.org_role(p_org uuid)
returns public.app_role language sql stable security definer set search_path = '' as $$
  select m.role
    from public.memberships m
    join public.organizations o on o.id = m.org_id and o.deleted_at is null
   where m.org_id = p_org and m.user_id = auth.uid() and m.status = 'active';
$$;

create or replace function app.is_member(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.org_role(p_org) is not null;
$$;

create or replace function app.is_gerant(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.org_role(p_org) = 'gerant';
$$;

-- Gérant ou chef d'équipe.
create or replace function app.is_staff(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.org_role(p_org) in ('gerant', 'chef_equipe');
$$;

-- Fiche agent liée à l'utilisateur courant dans l'entreprise.
create or replace function app.my_agent_id(p_org uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select a.id from public.agents a
   where a.org_id = p_org and a.user_id = auth.uid() and a.status = 'active'
     and app.org_role(p_org) = 'agent';
$$;

-- Le gérant gère tous les sites ; le chef d'équipe seulement ceux de ses zones.
create or replace function app.can_manage_site(p_org uuid, p_site uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case app.org_role(p_org)
    when 'gerant' then true
    when 'chef_equipe' then exists (
      select 1
        from public.sites s
        join public.zone_managers zm on zm.zone_id = s.zone_id
        join public.memberships m on m.id = zm.membership_id
       where s.id = p_site and s.org_id = p_org
         and m.user_id = auth.uid() and m.status = 'active')
    else false
  end;
$$;

-- L'agent courant a une vacation publiée sur ce site aujourd'hui (± 12 h).
create or replace function app.agent_works_on_site_now(p_org uuid, p_site uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.shifts sh
     where sh.org_id = p_org and sh.site_id = p_site
       and sh.agent_id = app.my_agent_id(p_org)
       and sh.status = 'published'
       and now() between sh.starts_at - interval '12 hours' and sh.ends_at + interval '2 hours');
$$;

-- Forfait effectif : un essai expiré sans abonnement retombe sur « Découverte ».
create or replace function app.effective_plan(p_org uuid)
returns public.plan_code language sql stable security definer set search_path = '' as $$
  select case
    when o.is_demo then 'business'::public.plan_code
    when o.subscription_status = 'trialing' and o.trial_ends_at is not null and o.trial_ends_at < now()
      then 'decouverte'::public.plan_code
    when o.subscription_status in ('canceled', 'unpaid', 'incomplete')
      then 'decouverte'::public.plan_code
    else o.plan
  end
  from public.organizations o where o.id = p_org;
$$;

-- Limites par forfait. DOIT rester alignée sur src/config/plans.ts (test automatique).
create or replace function app.plan_limits(p_plan public.plan_code)
returns jsonb language sql immutable set search_path = '' as $$
  select case p_plan
    when 'decouverte' then '{"agents": 3, "sites": 2, "chefs": 0}'::jsonb
    when 'essentiel'  then '{"agents": 10, "sites": null, "chefs": 1}'::jsonb
    when 'pro'        then '{"agents": 25, "sites": null, "chefs": 1}'::jsonb
    when 'business'   then '{"agents": null, "sites": null, "chefs": null}'::jsonb
  end;
$$;

grant execute on all functions in schema app to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Limites de forfait appliquées côté base (blocage doux affiché par l'appli)
-- -----------------------------------------------------------------------------
create or replace function app.enforce_agent_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_limit integer;
  v_count integer;
begin
  if new.status <> 'active' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'active' then return new; end if;
  v_limit := (app.plan_limits(app.effective_plan(new.org_id)) ->> 'agents')::integer;
  if v_limit is null then return new; end if;
  select count(*) into v_count from public.agents
   where org_id = new.org_id and status = 'active' and id <> new.id;
  if v_count >= v_limit then
    raise exception 'PLAN_LIMIT_AGENTS' using errcode = 'P0001',
      detail = format('Limite de %s agents actifs atteinte pour ce forfait.', v_limit);
  end if;
  return new;
end;
$$;

create trigger agents_plan_limit before insert or update of status on public.agents
  for each row execute function app.enforce_agent_limit();

create or replace function app.enforce_site_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_limit integer;
  v_count integer;
begin
  if new.archived_at is not null then return new; end if;
  if tg_op = 'UPDATE' and old.archived_at is null then return new; end if;
  v_limit := (app.plan_limits(app.effective_plan(new.org_id)) ->> 'sites')::integer;
  if v_limit is null then return new; end if;
  select count(*) into v_count from public.sites
   where org_id = new.org_id and archived_at is null and id <> new.id;
  if v_count >= v_limit then
    raise exception 'PLAN_LIMIT_SITES' using errcode = 'P0001',
      detail = format('Limite de %s sites atteinte pour ce forfait.', v_limit);
  end if;
  return new;
end;
$$;

create trigger sites_plan_limit before insert or update of archived_at on public.sites
  for each row execute function app.enforce_site_limit();

-- -----------------------------------------------------------------------------
-- Journal d'audit générique
-- -----------------------------------------------------------------------------
create or replace function app.audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_diff jsonb;
begin
  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(key, jsonb_build_object('old', v_old -> key, 'new', value)), '{}'::jsonb)
      into v_diff
      from jsonb_each(v_new)
     where key not in ('updated_at') and (v_old -> key) is distinct from value;
    if v_diff = '{}'::jsonb then return new; end if;
  else
    v_diff := coalesce(v_new, v_old);
  end if;
  -- Ne jamais journaliser de secret en clair.
  v_diff := v_diff - 'secret' - 'token_hash';
  insert into public.audit_log (org_id, actor_id, action, table_name, row_id, diff)
  values (
    case when tg_table_name = 'organizations' then coalesce(new.id, old.id)
         else coalesce((v_new ->> 'org_id')::uuid, (v_old ->> 'org_id')::uuid) end,
    auth.uid(), lower(tg_op), tg_table_name,
    coalesce((v_new ->> 'id')::uuid, (v_old ->> 'id')::uuid), v_diff);
  return coalesce(new, old);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['organizations', 'memberships', 'invitations', 'agents', 'agent_documents', 'sites',
    'site_access_codes', 'service_contracts', 'shifts', 'time_entries', 'absences', 'replacement_offers',
    'client_portal_links', 'quality_inspections', 'complaints', 'quotes', 'invoices', 'payments',
    'payroll_exports', 'transfer_dossiers']
  loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I
                    for each row execute function app.audit()', t, t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Activation de la RLS sur TOUTES les tables du schéma public.
-- (Pas de FORCE : les fonctions SECURITY DEFINER, propriété de postgres, doivent
-- pouvoir lire memberships/sites sans récursion de politiques.)
-- -----------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------- socle ------
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid()
  or exists (
    select 1 from public.memberships mine
      join public.memberships theirs on theirs.org_id = mine.org_id
     where mine.user_id = auth.uid() and mine.status = 'active'
       and mine.role in ('gerant', 'chef_equipe') and theirs.user_id = profiles.id)
);
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy organizations_select on public.organizations for select to authenticated
  using (app.is_member(id) or app.is_platform_admin());
create policy organizations_update on public.organizations for update to authenticated
  using (app.is_gerant(id)) with check (app.is_gerant(id));
-- Les colonnes d'abonnement ne sont modifiables que par le serveur (webhooks Stripe).
revoke update on public.organizations from authenticated, anon;
grant update (name, legal_name, siret, vat_number, legal_form, share_capital_cents, rcs_city,
  address_line1, address_line2, postal_code, city, phone, email, logo_path, timezone,
  employer_charge_rate, default_vat_rate, payment_terms_days, late_penalty_rate, invoice_prefix,
  quote_prefix, compliance_overrides, settings, onboarding) on public.organizations to authenticated;

create policy zones_select on public.zones for select to authenticated using (app.is_staff(org_id));
create policy zones_write on public.zones for all to authenticated
  using (app.is_gerant(org_id)) with check (app.is_gerant(org_id));

create policy memberships_select on public.memberships for select to authenticated
  using (user_id = auth.uid() or app.is_staff(org_id));
-- Écritures uniquement via les RPC ci-dessous (security definer).

create policy zone_managers_select on public.zone_managers for select to authenticated using (app.is_staff(org_id));
create policy zone_managers_write on public.zone_managers for all to authenticated
  using (app.is_gerant(org_id)) with check (app.is_gerant(org_id));

create policy invitations_gerant on public.invitations for all to authenticated
  using (app.is_gerant(org_id)) with check (app.is_gerant(org_id));

create policy audit_log_select on public.audit_log for select to authenticated using (app.is_gerant(org_id));
create policy gdpr_requests_gerant on public.gdpr_requests for all to authenticated
  using (app.is_gerant(org_id)) with check (app.is_gerant(org_id) and requested_by = auth.uid());
create policy public_holidays_select on public.public_holidays for select to authenticated, anon using (true);
-- platform_admins, promo_codes, stripe_events, notification_outbox, rate_limits, demo_requests :
-- aucune politique → inaccessibles hors service_role.

-- ------------------------------------------------- tables « gérant seulement » --
do $$
declare t text;
begin
  foreach t in array array['service_contracts', 'agent_documents', 'client_portal_links', 'quotes', 'quote_lines',
    'ad_hoc_services', 'invoices', 'invoice_lines', 'invoice_shifts', 'invoice_attachments', 'payments',
    'invoice_reminders', 'payroll_exports', 'transfer_dossiers', 'transfer_dossier_agents', 'products',
    'document_sequences']
  loop
    execute format('create policy %I on public.%I for all to authenticated
                    using (app.is_gerant(org_id)) with check (app.is_gerant(org_id))', t || '_gerant', t);
  end loop;
end $$;

-- L'agent consulte ses propres documents RH.
create policy agent_documents_own on public.agent_documents for select to authenticated
  using (agent_id = app.my_agent_id(org_id));

-- -------------------------------- tables « lecture équipe, écriture gérant » --
do $$
declare t text;
begin
  foreach t in array array['clients', 'client_contacts', 'agents', 'agent_usual_sites', 'contract_schedules', 'alerts']
  loop
    execute format('create policy %I on public.%I for select to authenticated using (app.is_staff(org_id))', t || '_staff_read', t);
    execute format('create policy %I on public.%I for all to authenticated
                    using (app.is_gerant(org_id)) with check (app.is_gerant(org_id))', t || '_gerant', t);
  end loop;
end $$;

create policy agents_self on public.agents for select to authenticated
  using (user_id = auth.uid() and app.is_member(org_id));
create policy products_staff_read on public.products for select to authenticated using (app.is_member(org_id));

-- ---------------------------------------------- tables liées à un site (zone) --
create policy sites_read on public.sites for select to authenticated using (
  app.is_staff(org_id)
  or exists (select 1 from public.shifts sh where sh.site_id = sites.id
              and sh.agent_id = app.my_agent_id(sites.org_id) and sh.status = 'published'
              and sh.starts_at > now() - interval '35 days')
);
create policy sites_gerant on public.sites for all to authenticated
  using (app.is_gerant(org_id)) with check (app.is_gerant(org_id));
create policy sites_chef_update on public.sites for update to authenticated
  using (app.can_manage_site(org_id, id)) with check (app.can_manage_site(org_id, id));

create policy site_access_codes_manage on public.site_access_codes for all to authenticated
  using (app.can_manage_site(org_id, site_id)) with check (app.can_manage_site(org_id, site_id));
create policy site_access_codes_agent on public.site_access_codes for select to authenticated
  using (app.agent_works_on_site_now(org_id, site_id));

do $$
declare t text;
begin
  foreach t in array array['site_areas', 'site_tasks', 'site_stock']
  loop
    execute format('create policy %I on public.%I for select to authenticated
                    using (app.is_staff(org_id) or app.agent_works_on_site_now(org_id, site_id))', t || '_read', t);
    execute format('create policy %I on public.%I for all to authenticated
                    using (app.can_manage_site(org_id, site_id)) with check (app.can_manage_site(org_id, site_id))', t || '_manage', t);
  end loop;
end $$;
-- Points de pointage et appareils partagés : jamais lisibles par les agents
-- (le jeton du QR code est scanné, pas consulté).
do $$
declare t text;
begin
  foreach t in array array['site_checkpoints', 'shared_devices']
  loop
    execute format('create policy %I on public.%I for select to authenticated using (app.is_staff(org_id))', t || '_read', t);
    execute format('create policy %I on public.%I for all to authenticated
                    using (app.can_manage_site(org_id, site_id)) with check (app.can_manage_site(org_id, site_id))', t || '_manage', t);
  end loop;
end $$;

-- Disponibilités : l'agent gère les siennes.
create policy agent_availabilities_staff on public.agent_availabilities for select to authenticated using (app.is_staff(org_id));
create policy agent_availabilities_gerant on public.agent_availabilities for all to authenticated
  using (app.is_gerant(org_id)) with check (app.is_gerant(org_id));
create policy agent_availabilities_own on public.agent_availabilities for all to authenticated
  using (agent_id = app.my_agent_id(org_id)) with check (agent_id = app.my_agent_id(org_id));

-- ---------------------------------------------------------------- planning --
create policy shifts_staff_read on public.shifts for select to authenticated using (app.is_staff(org_id));
create policy shifts_manage on public.shifts for all to authenticated
  using (app.can_manage_site(org_id, site_id)) with check (app.can_manage_site(org_id, site_id));
create policy shifts_agent_read on public.shifts for select to authenticated
  using (agent_id = app.my_agent_id(org_id) and status <> 'draft');

create policy shift_changes_staff on public.shift_changes for select to authenticated using (app.is_staff(org_id));
create policy shift_changes_agent on public.shift_changes for select to authenticated
  using (agent_id = app.my_agent_id(org_id));
create policy schedule_publications_staff on public.schedule_publications for select to authenticated using (app.is_staff(org_id));

-- ---------------------------------------------------------------- pointage --
create policy time_entries_staff_read on public.time_entries for select to authenticated using (app.is_staff(org_id));
create policy time_entries_manage on public.time_entries for all to authenticated
  using (app.can_manage_site(org_id, site_id)) with check (app.can_manage_site(org_id, site_id));
create policy time_entries_agent_read on public.time_entries for select to authenticated
  using (agent_id = app.my_agent_id(org_id));
-- L'insertion d'un pointage par l'agent passe par la RPC clock_in/clock_out (phase 2),
-- qui valide le QR code et la distance au site : aucune insertion directe.

-- ------------------------------------------------- absences et remplacements --
create policy absences_staff on public.absences for select to authenticated using (app.is_staff(org_id));
create policy absences_gerant on public.absences for all to authenticated
  using (app.is_gerant(org_id)) with check (app.is_gerant(org_id));
create policy absences_chef_insert on public.absences for insert to authenticated
  with check (app.org_role(org_id) = 'chef_equipe' and declared_by = auth.uid());
create policy absences_agent_read on public.absences for select to authenticated
  using (agent_id = app.my_agent_id(org_id));
create policy absences_agent_insert on public.absences for insert to authenticated
  with check (agent_id = app.my_agent_id(org_id) and status = 'declared' and declared_by = auth.uid());

create policy replacement_offers_staff on public.replacement_offers for select to authenticated using (app.is_staff(org_id));
create policy replacement_offers_gerant on public.replacement_offers for all to authenticated
  using (app.is_gerant(org_id)) with check (app.is_gerant(org_id));
create policy replacement_offers_chef on public.replacement_offers for all to authenticated
  using (app.org_role(org_id) = 'chef_equipe' and exists (
    select 1 from public.shifts sh where sh.id = shift_id and app.can_manage_site(sh.org_id, sh.site_id)))
  with check (app.org_role(org_id) = 'chef_equipe' and exists (
    select 1 from public.shifts sh where sh.id = shift_id and app.can_manage_site(sh.org_id, sh.site_id)));
create policy replacement_offers_agent on public.replacement_offers for select to authenticated
  using (candidate_id = app.my_agent_id(org_id));

-- ---------------------------------------------------------------- qualité --
create policy quality_grids_read on public.quality_grids for select to authenticated using (app.is_staff(org_id));
create policy quality_grids_gerant on public.quality_grids for all to authenticated
  using (app.is_gerant(org_id)) with check (app.is_gerant(org_id));
create policy quality_grids_chef on public.quality_grids for all to authenticated
  using (site_id is not null and app.can_manage_site(org_id, site_id))
  with check (site_id is not null and app.can_manage_site(org_id, site_id));
create policy quality_grid_items_read on public.quality_grid_items for select to authenticated using (app.is_staff(org_id));
create policy quality_grid_items_manage on public.quality_grid_items for all to authenticated
  using (exists (select 1 from public.quality_grids g where g.id = grid_id
                 and (app.is_gerant(g.org_id) or (g.site_id is not null and app.can_manage_site(g.org_id, g.site_id)))))
  with check (exists (select 1 from public.quality_grids g where g.id = grid_id
                 and (app.is_gerant(g.org_id) or (g.site_id is not null and app.can_manage_site(g.org_id, g.site_id)))));

create policy quality_inspections_read on public.quality_inspections for select to authenticated using (app.is_staff(org_id));
create policy quality_inspections_manage on public.quality_inspections for all to authenticated
  using (app.can_manage_site(org_id, site_id)) with check (app.can_manage_site(org_id, site_id));
do $$
declare t text;
begin
  foreach t in array array['quality_results', 'quality_photos']
  loop
    execute format('create policy %I on public.%I for select to authenticated using (app.is_staff(org_id))', t || '_read', t);
    execute format('create policy %I on public.%I for all to authenticated
      using (exists (select 1 from public.quality_inspections i where i.id = inspection_id and app.can_manage_site(i.org_id, i.site_id)))
      with check (exists (select 1 from public.quality_inspections i where i.id = inspection_id and app.can_manage_site(i.org_id, i.site_id)))',
      t || '_manage', t);
  end loop;
end $$;

-- ------------------------------------------------------------ réclamations --
create policy complaints_read on public.complaints for select to authenticated using (app.is_staff(org_id));
create policy complaints_manage on public.complaints for all to authenticated
  using (app.can_manage_site(org_id, site_id)) with check (app.can_manage_site(org_id, site_id));
do $$
declare t text;
begin
  foreach t in array array['complaint_events', 'complaint_photos']
  loop
    execute format('create policy %I on public.%I for select to authenticated using (app.is_staff(org_id))', t || '_read', t);
    execute format('create policy %I on public.%I for insert to authenticated
      with check (exists (select 1 from public.complaints c where c.id = complaint_id and app.can_manage_site(c.org_id, c.site_id)))',
      t || '_insert', t);
  end loop;
end $$;
-- Le portail client (sans compte) passe par le serveur avec la clé service_role,
-- après vérification du jeton du lien (client_portal_links).

-- ------------------------------------------------------------------ stocks --
create policy stock_requests_staff on public.stock_requests for select to authenticated using (app.is_staff(org_id));
create policy stock_requests_manage on public.stock_requests for all to authenticated
  using (app.can_manage_site(org_id, site_id)) with check (app.can_manage_site(org_id, site_id));
create policy stock_requests_agent_read on public.stock_requests for select to authenticated
  using (requested_by_agent = app.my_agent_id(org_id));
create policy stock_requests_agent_insert on public.stock_requests for insert to authenticated
  with check (requested_by_agent = app.my_agent_id(org_id) and status = 'requested'
              and app.agent_works_on_site_now(org_id, site_id));
create policy stock_movements_staff on public.stock_movements for select to authenticated using (app.is_staff(org_id));
create policy stock_movements_manage on public.stock_movements for insert to authenticated
  with check (app.can_manage_site(org_id, site_id));

-- -------------------------------------------------------------- messagerie --
create policy messages_staff on public.messages for all to authenticated
  using (app.is_staff(org_id)) with check (app.is_staff(org_id) and author_id = auth.uid());
create policy messages_agent on public.messages for select to authenticated using (
  sent_at is not null and exists (
    select 1 from public.message_recipients r
     where r.message_id = messages.id and r.agent_id = app.my_agent_id(messages.org_id)));
create policy message_recipients_staff on public.message_recipients for all to authenticated
  using (app.is_staff(org_id)) with check (app.is_staff(org_id));
create policy message_recipients_agent_read on public.message_recipients for select to authenticated
  using (agent_id = app.my_agent_id(org_id));
create policy message_recipients_agent_ack on public.message_recipients for update to authenticated
  using (agent_id = app.my_agent_id(org_id)) with check (agent_id = app.my_agent_id(org_id));
revoke update on public.message_recipients from authenticated;
grant update (read_at) on public.message_recipients to authenticated;

-- -----------------------------------------------------------------------------
-- RPC : inscription, invitations, gestion des membres
-- -----------------------------------------------------------------------------

-- Crée une entreprise, rattache l'utilisateur courant comme gérant propriétaire
-- et démarre l'essai gratuit de 14 jours du forfait Pro (sans carte bancaire).
create or replace function public.create_organization(p_name text, p_slug text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_slug text;
  v_base text;
  v_n integer := 0;
begin
  if v_uid is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;
  if char_length(coalesce(trim(p_name), '')) < 2 then
    raise exception 'Nom d''entreprise invalide' using errcode = '22023';
  end if;
  if (select count(*) from public.memberships where user_id = v_uid and is_owner) >= 3 then
    raise exception 'Nombre maximal d''entreprises atteint' using errcode = 'P0001';
  end if;

  v_base := coalesce(nullif(p_slug, ''), p_name);
  v_base := lower(translate(v_base,
    'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝŸŒÆ',
    'aaaaaaceeeeiiiinooooouuuuyyoeaaaaaaceeeeiiiinooooouuuuyyoe'));
  v_base := trim(both '-' from regexp_replace(v_base, '[^a-z0-9]+', '-', 'g'));
  v_base := left(coalesce(nullif(v_base, ''), 'entreprise'), 50);
  if char_length(v_base) < 2 then v_base := v_base || '-pro'; end if;
  v_slug := v_base;
  while exists (select 1 from public.organizations where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  insert into public.organizations (name, slug, plan, subscription_status, trial_ends_at, email)
  values (trim(p_name), v_slug, 'pro', 'trialing', now() + interval '14 days',
          (select email from auth.users where id = v_uid))
  returning id into v_org;

  insert into public.memberships (org_id, user_id, role, status, is_owner)
  values (v_org, v_uid, 'gerant', 'active', true);

  return v_org;
end;
$$;

-- Accepte une invitation : le jeton doit être valide et l'e-mail correspondre au compte.
create or replace function public.accept_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.invitations;
  v_email text;
begin
  if v_uid is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;
  select * into v_inv from public.invitations
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
   for update;
  if not found or v_inv.accepted_at is not null or v_inv.expires_at < now() then
    raise exception 'Invitation invalide ou expirée' using errcode = 'P0002';
  end if;
  select email into v_email from auth.users where id = v_uid;
  if lower(v_email) <> lower(v_inv.email) then
    raise exception 'Cette invitation est destinée à une autre adresse e-mail' using errcode = '42501';
  end if;

  insert into public.memberships (org_id, user_id, role, status)
  values (v_inv.org_id, v_uid, v_inv.role, 'active')
  on conflict (org_id, user_id) do update set role = excluded.role, status = 'active';

  update public.invitations set accepted_at = now() where id = v_inv.id;
  return v_inv.org_id;
end;
$$;

-- Change le rôle ou le statut d'un membre (gérant uniquement, jamais le propriétaire).
create or replace function public.update_member(p_membership uuid, p_role public.app_role, p_status public.membership_status)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_m public.memberships;
begin
  select * into v_m from public.memberships where id = p_membership for update;
  if not found or not app.is_gerant(v_m.org_id) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if v_m.is_owner then
    raise exception 'Le propriétaire du compte ne peut pas être modifié' using errcode = '42501';
  end if;
  update public.memberships set role = p_role, status = p_status where id = p_membership;
end;
$$;

create or replace function public.remove_member(p_membership uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_m public.memberships;
begin
  select * into v_m from public.memberships where id = p_membership for update;
  if not found or not app.is_gerant(v_m.org_id) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if v_m.is_owner then
    raise exception 'Le propriétaire du compte ne peut pas être retiré' using errcode = '42501';
  end if;
  delete from public.memberships where id = p_membership;
end;
$$;

-- Prochain numéro légal (sans trou) : verrouille la ligne de séquence.
-- Réservé au serveur (service_role) : appelé lors de l'émission d'une facture.
create or replace function public.next_document_number(p_org uuid, p_doc_type text, p_year integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_next integer;
begin
  insert into public.document_sequences (org_id, doc_type, year, last_value)
  values (p_org, p_doc_type, p_year, 1)
  on conflict (org_id, doc_type, year)
  do update set last_value = public.document_sequences.last_value + 1
  returning last_value into v_next;
  return v_next;
end;
$$;

-- Limitation de débit : renvoie true si l'appel est autorisé. Réservé au serveur.
create or replace function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.rate_limits (key, window_start, hits) values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  return v_hits <= p_max;
end;
$$;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.create_organization(text, text) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.update_member(uuid, public.app_role, public.membership_status) to authenticated;
grant execute on function public.remove_member(uuid) to authenticated;
revoke execute on function public.next_document_number(uuid, text, integer) from authenticated;
revoke execute on function public.check_rate_limit(text, integer, integer) from authenticated;
grant execute on function public.next_document_number(uuid, text, integer) to service_role;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
