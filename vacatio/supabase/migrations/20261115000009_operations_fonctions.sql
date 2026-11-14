-- =============================================================================
-- Vacatio — 0009 : fonctions du module A (planning, pointage, remplacements,
--                  alertes) et suivi des changements de planning
-- =============================================================================

-- ------------------------------------------------------------- vacations --
-- Plusieurs agents sur un même créneau récurrent : « slot » les distingue.
alter table public.shifts add column slot smallint not null default 1 check (slot between 1 and 50);
drop index public.shifts_unique_recurrence;
create unique index shifts_unique_recurrence
  on public.shifts (contract_schedule_id, starts_at, slot)
  where contract_schedule_id is not null and status <> 'cancelled';

-- Génère les vacations (brouillons) à partir des créneaux récurrents des contrats
-- actifs, entre deux dates incluses. Les horaires sont en heure de Paris : le passage
-- à l'heure d'été/hiver est géré par PostgreSQL. Idempotent (rien n'est créé en double).
-- L'agent habituel n'est affecté que s'il n'est ni absent ni déjà pris sur ce créneau.
create or replace function public.generate_contract_shifts(p_org uuid, p_from date, p_to date)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_tz text;
  v_count integer := 0;
  v_rows integer;
  r record;
begin
  if not app.is_staff(p_org) and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if p_to < p_from or p_to - p_from > 62 then
    raise exception 'Période invalide (62 jours maximum)' using errcode = '22023';
  end if;
  select timezone into v_tz from public.organizations where id = p_org;

  for r in
    select cs.id as schedule_id, cs.start_time, cs.end_time, cs.agents_needed, cs.default_agent_id,
           sc.site_id, d::date as day,
           ((d::date + cs.start_time) at time zone v_tz) as starts_at,
           ((d::date + cs.end_time + case when cs.end_time <= cs.start_time then interval '1 day' else interval '0' end)
             at time zone v_tz) as ends_at
      from public.contract_schedules cs
      join public.service_contracts sc on sc.id = cs.contract_id and sc.org_id = p_org
      join public.sites s on s.id = sc.site_id and s.archived_at is null
      cross join generate_series(p_from, p_to, interval '1 day') d
     where cs.org_id = p_org
       and extract(isodow from d) = cs.day_of_week
       and d::date >= sc.starts_on and (sc.ends_on is null or d::date <= sc.ends_on)
       and (cs.week_parity = 'all'
            or (cs.week_parity = 'even' and extract(week from d)::int % 2 = 0)
            or (cs.week_parity = 'odd' and extract(week from d)::int % 2 = 1))
       and (app.can_manage_site(p_org, sc.site_id) or coalesce(auth.role(), '') = 'service_role')
  loop
    for v_slot in 1 .. r.agents_needed loop
      insert into public.shifts (org_id, site_id, agent_id, starts_at, ends_at, status, source, contract_schedule_id, slot, created_by)
      values (
        p_org, r.site_id,
        case when v_slot = 1 and r.default_agent_id is not null
              and not exists (select 1 from public.absences a
                               where a.agent_id = r.default_agent_id and a.status in ('declared', 'approved')
                                 and tstzrange(a.starts_at, a.ends_at) && tstzrange(r.starts_at, r.ends_at))
              and not exists (select 1 from public.shifts x
                               where x.agent_id = r.default_agent_id and x.status <> 'cancelled'
                                 and tstzrange(x.starts_at, x.ends_at) && tstzrange(r.starts_at, r.ends_at))
             then r.default_agent_id end,
        r.starts_at, r.ends_at, 'draft', 'contract', r.schedule_id, v_slot, auth.uid())
      on conflict do nothing;
      get diagnostics v_rows = row_count;
      v_count := v_count + v_rows;
    end loop;
  end loop;
  return v_count;
end;
$$;

-- Duplique les vacations d'une semaine vers une autre (brouillons).
-- Les vacations qui créeraient une double affectation sont ignorées.
create or replace function public.duplicate_week(p_org uuid, p_source_monday date, p_target_monday date)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_tz text;
  v_shift interval;
  v_count integer := 0;
  v_rows integer;
  r record;
begin
  if not app.is_staff(p_org) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if extract(isodow from p_source_monday) <> 1 or extract(isodow from p_target_monday) <> 1 then
    raise exception 'Les dates doivent être des lundis' using errcode = '22023';
  end if;
  select timezone into v_tz from public.organizations where id = p_org;
  v_shift := (p_target_monday - p_source_monday) * interval '1 day';
  for r in
    select * from public.shifts s
     where s.org_id = p_org and s.status <> 'cancelled'
       and s.starts_at >= (p_source_monday::timestamp at time zone v_tz)
       and s.starts_at < ((p_source_monday + 7)::timestamp at time zone v_tz)
       and app.can_manage_site(p_org, s.site_id)
  loop
    begin
      insert into public.shifts (org_id, site_id, agent_id, starts_at, ends_at, break_minutes, status, source,
                                 contract_schedule_id, slot, billable, notes, created_by)
      values (p_org, r.site_id, r.agent_id,
              -- Recalcul en heure locale : une vacation à 6 h reste à 6 h après un changement d'heure.
              ((r.starts_at at time zone v_tz) + v_shift) at time zone v_tz,
              ((r.ends_at at time zone v_tz) + v_shift) at time zone v_tz,
              r.break_minutes, 'draft', case when r.source = 'contract' then 'contract'::public.shift_source else 'manual' end,
              r.contract_schedule_id, r.slot, r.billable, r.notes, auth.uid())
      on conflict do nothing;
      get diagnostics v_rows = row_count;
      v_count := v_count + v_rows;
    exception when exclusion_violation then
      null; -- agent déjà pris : vacation ignorée
    end;
  end loop;
  return v_count;
end;
$$;

-- Publie les brouillons d'une période : ils deviennent visibles des agents.
create or replace function public.publish_shifts(p_org uuid, p_from date, p_to date)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_tz text;
  v_count integer;
begin
  if not app.is_staff(p_org) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  select timezone into v_tz from public.organizations where id = p_org;
  update public.shifts s
     set status = 'published', published_at = now()
   where s.org_id = p_org and s.status = 'draft'
     and s.starts_at >= (p_from::timestamp at time zone v_tz)
     and s.starts_at < ((p_to + 1)::timestamp at time zone v_tz)
     and app.can_manage_site(p_org, s.site_id);
  get diagnostics v_count = row_count;
  insert into public.schedule_publications (org_id, period_start, period_end, published_by, shifts_count)
  values (p_org, p_from, p_to, auth.uid(), v_count);
  return v_count;
end;
$$;

-- Trace chaque changement d'une vacation publiée (pour prévenir les agents concernés).
create or replace function app.track_shift_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_snapshot jsonb;
begin
  if tg_op = 'INSERT' then
    if new.status = 'published' then
      insert into public.shift_changes (org_id, shift_id, agent_id, change, after)
      values (new.org_id, new.id, new.agent_id, 'created', jsonb_build_object('starts_at', new.starts_at, 'ends_at', new.ends_at, 'site_id', new.site_id));
    end if;
    return new;
  end if;

  -- Publication d'un brouillon.
  if old.status = 'draft' and new.status = 'published' then
    insert into public.shift_changes (org_id, shift_id, agent_id, change, after)
    values (new.org_id, new.id, new.agent_id, 'created', jsonb_build_object('starts_at', new.starts_at, 'ends_at', new.ends_at, 'site_id', new.site_id));
    return new;
  end if;
  if old.status <> 'published' then return new; end if;

  v_snapshot := jsonb_build_object('starts_at', old.starts_at, 'ends_at', old.ends_at, 'site_id', old.site_id);
  if new.status = 'cancelled' then
    insert into public.shift_changes (org_id, shift_id, agent_id, change, before)
    values (new.org_id, new.id, old.agent_id, 'cancelled', v_snapshot);
  elsif new.agent_id is distinct from old.agent_id then
    -- L'ancien agent perd la vacation, le nouveau la reçoit.
    if old.agent_id is not null then
      insert into public.shift_changes (org_id, shift_id, agent_id, change, before)
      values (new.org_id, new.id, old.agent_id, 'reassigned', v_snapshot);
    end if;
    if new.agent_id is not null then
      insert into public.shift_changes (org_id, shift_id, agent_id, change, after)
      values (new.org_id, new.id, new.agent_id, 'created', jsonb_build_object('starts_at', new.starts_at, 'ends_at', new.ends_at, 'site_id', new.site_id));
    end if;
  elsif new.starts_at <> old.starts_at or new.ends_at <> old.ends_at or new.site_id <> old.site_id then
    insert into public.shift_changes (org_id, shift_id, agent_id, change, before, after)
    values (new.org_id, new.id, new.agent_id, 'updated', v_snapshot,
            jsonb_build_object('starts_at', new.starts_at, 'ends_at', new.ends_at, 'site_id', new.site_id));
  end if;
  return new;
end;
$$;

create trigger shifts_track_change after insert or update on public.shifts
  for each row execute function app.track_shift_change();

-- ------------------------------------------------------------- pointage --
create or replace function app.distance_m(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
returns double precision language sql immutable set search_path = '' as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2), 2)));
$$;

-- Pointage par l'agent connecté. p_qr_token : jeton du QR code / de l'étiquette NFC
-- (null = pointage par géolocalisation seule, signalé pour contrôle).
-- La position n'est lue qu'à cet instant précis et n'est jamais suivie en continu.
create or replace function public.clock(
  p_org uuid, p_kind public.time_entry_kind, p_qr_token text default null, p_shift uuid default null,
  p_lat double precision default null, p_lng double precision default null, p_accuracy real default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_agent uuid := app.my_agent_id(p_org);
  v_checkpoint public.site_checkpoints;
  v_shift public.shifts;
  v_site public.sites;
  v_distance real;
  v_flagged boolean := false;
  v_reason text;
  v_id uuid;
begin
  if v_agent is null then
    raise exception 'Accès réservé aux agents' using errcode = '42501';
  end if;

  if p_qr_token is not null then
    select * into v_checkpoint from public.site_checkpoints
     where qr_token = p_qr_token and org_id = p_org and active;
    if not found then
      raise exception 'QR_INCONNU' using errcode = 'P0002';
    end if;
  end if;

  -- Vacation concernée : celle désignée, sinon la plus proche dans le temps (fenêtre ± 2 h).
  select * into v_shift from public.shifts s
   where s.org_id = p_org and s.agent_id = v_agent and s.status = 'published'
     and (p_shift is null or s.id = p_shift)
     and (v_checkpoint.id is null or s.site_id = v_checkpoint.site_id)
     and now() between s.starts_at - interval '2 hours' and s.ends_at + interval '2 hours'
     and not exists (select 1 from public.time_entries t where t.shift_id = s.id and t.kind = p_kind)
   order by abs(extract(epoch from (case when p_kind = 'in' then s.starts_at else s.ends_at end) - now()))
   limit 1;
  if not found then
    raise exception 'AUCUNE_VACATION' using errcode = 'P0002';
  end if;

  select * into v_site from public.sites where id = v_shift.site_id;
  if p_lat is not null and p_lng is not null and v_site.latitude is not null then
    v_distance := app.distance_m(p_lat, p_lng, v_site.latitude, v_site.longitude);
    if v_distance > v_site.geofence_radius_m + coalesce(least(p_accuracy, 500), 0) then
      v_flagged := true;
      v_reason := format('Pointage à %s m du site', round(v_distance));
    end if;
  elsif v_checkpoint.id is null then
    v_flagged := true;
    v_reason := 'Pointage sans QR code ni position';
  end if;

  insert into public.time_entries (org_id, shift_id, agent_id, site_id, checkpoint_id, kind, method,
                                   latitude, longitude, accuracy_m, distance_m, recorded_by, flagged, flag_reason)
  values (p_org, v_shift.id, v_agent, v_shift.site_id, v_checkpoint.id, p_kind,
          case when v_checkpoint.id is not null then 'qr'::public.time_entry_method else 'gps_only' end,
          p_lat, p_lng, p_accuracy, v_distance, auth.uid(), v_flagged, v_reason)
  returning id into v_id;

  -- L'arrivée résout l'alerte de non-pointage éventuelle.
  if p_kind = 'in' then
    update public.alerts set resolved_at = now()
     where org_id = p_org and kind = 'no_show' and ref_id = v_shift.id and resolved_at is null;
  end if;

  return jsonb_build_object('id', v_id, 'shift_id', v_shift.id, 'site', v_site.name, 'flagged', v_flagged, 'reason', v_reason);
end;
$$;

-- ---------------------------------------------------------- remplacements --
-- Acceptation d'une proposition de remplacement depuis le lien SMS (sans connexion).
-- Appelée par le serveur (service_role) après hachage du jeton.
create or replace function public.respond_replacement(p_token_hash text, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_offer public.replacement_offers;
  v_shift public.shifts;
begin
  select * into v_offer from public.replacement_offers where token_hash = p_token_hash for update;
  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;
  if v_offer.status <> 'proposed' then
    return jsonb_build_object('status', v_offer.status::text);
  end if;
  if v_offer.expires_at < now() then
    update public.replacement_offers set status = 'expired' where id = v_offer.id;
    return jsonb_build_object('status', 'expired');
  end if;
  if not p_accept then
    update public.replacement_offers set status = 'declined', responded_at = now() where id = v_offer.id;
    return jsonb_build_object('status', 'declined');
  end if;

  select * into v_shift from public.shifts where id = v_offer.shift_id for update;
  if v_shift.agent_id is not null or v_shift.status = 'cancelled' then
    update public.replacement_offers set status = 'expired', responded_at = now() where id = v_offer.id;
    return jsonb_build_object('status', 'taken');
  end if;

  begin
    update public.shifts
       set agent_id = v_offer.candidate_id, source = 'replacement', billable = true,
           status = 'published', published_at = coalesce(published_at, now())
     where id = v_shift.id;
  exception when exclusion_violation then
    update public.replacement_offers set status = 'expired', responded_at = now() where id = v_offer.id;
    return jsonb_build_object('status', 'conflict');
  end;

  update public.replacement_offers set status = 'accepted', responded_at = now() where id = v_offer.id;
  update public.replacement_offers set status = 'expired'
   where shift_id = v_shift.id and id <> v_offer.id and status = 'proposed';
  update public.alerts set resolved_at = now()
   where org_id = v_shift.org_id and kind = 'uncovered_absence' and ref_id = v_shift.id and resolved_at is null;
  return jsonb_build_object('status', 'accepted', 'shift_id', v_shift.id, 'org_id', v_shift.org_id);
end;
$$;

-- Une absence validée ou déclarée libère les vacations concernées (à remplacer).
create or replace function public.release_absence_shifts(p_absence uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_abs public.absences;
  v_count integer;
begin
  select * into v_abs from public.absences where id = p_absence;
  if not found or (not app.is_staff(v_abs.org_id) and coalesce(auth.role(), '') <> 'service_role') then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  with freed as (
    update public.shifts s
       set agent_id = null, absence_id = v_abs.id
     where s.agent_id = v_abs.agent_id and s.status <> 'cancelled'
       and tstzrange(s.starts_at, s.ends_at) && tstzrange(v_abs.starts_at, v_abs.ends_at)
       and s.ends_at > now()
    returning s.id, s.org_id, s.site_id, s.starts_at
  )
  insert into public.alerts (org_id, kind, severity, title, ref_table, ref_id, site_id, dedupe_key)
  select f.org_id, 'uncovered_absence', 'critical', 'Vacation à remplacer', 'shifts', f.id, f.site_id, 'uncovered:' || f.id
    from freed f
  on conflict do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------- alertes --
-- Non-pointage : vacation publiée commencée depuis plus de 15 min sans pointage d'arrivée.
-- Appelée toutes les 5 minutes par la tâche planifiée (service_role).
create or replace function public.detect_no_shows()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  with missing as (
    select s.id, s.org_id, s.site_id, s.agent_id, s.starts_at
      from public.shifts s
      join public.organizations o on o.id = s.org_id and o.deleted_at is null
     where s.status = 'published' and s.agent_id is not null
       and s.starts_at between now() - interval '3 hours' and now() - interval '15 minutes'
       and not exists (select 1 from public.time_entries t where t.shift_id = s.id and t.kind = 'in')
       and not exists (select 1 from public.alerts a where a.dedupe_key = 'no_show:' || s.id)
  ), inserted as (
    insert into public.alerts (org_id, kind, severity, title, body, ref_table, ref_id, site_id, dedupe_key)
    select m.org_id, 'no_show', 'critical',
           'Non-pointage : ' || a.first_name || ' ' || a.last_name,
           'Vacation sur ' || st.name || ' prévue à ' || to_char(m.starts_at at time zone 'Europe/Paris', 'HH24:MI'),
           'shifts', m.id, m.site_id, 'no_show:' || m.id
      from missing m
      join public.agents a on a.id = m.agent_id
      join public.sites st on st.id = m.site_id
    on conflict do nothing
    returning org_id, title, body
  )
  insert into public.notification_outbox (org_id, channel, recipient, template, payload)
  select i.org_id, 'email', u.email, 'no_show', jsonb_build_object('title', i.title, 'body', i.body)
    from inserted i
    join public.memberships mb on mb.org_id = i.org_id and mb.role = 'gerant' and mb.status = 'active'
    join auth.users u on u.id = mb.user_id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Documents RH qui expirent dans les 30 jours (titre de séjour, visite médicale…). Quotidien.
create or replace function public.detect_expiring_documents()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  insert into public.alerts (org_id, kind, severity, title, body, ref_table, ref_id, dedupe_key)
  select d.org_id, 'document_expiring',
         case when d.expires_on < current_date then 'critical' else 'warning' end,
         'Document à renouveler : ' || a.first_name || ' ' || a.last_name,
         coalesce(d.label, d.doc_type) || ' — expire le ' || to_char(d.expires_on, 'DD/MM/YYYY'),
         'agent_documents', d.id, 'doc:' || d.id || ':' || d.expires_on
    from public.agent_documents d
    join public.agents a on a.id = d.agent_id and a.status = 'active'
   where d.expires_on is not null and d.expires_on <= current_date + 30
  on conflict do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- --------------------------------------------------------------- droits --
revoke execute on function public.generate_contract_shifts(uuid, date, date) from public, anon;
revoke execute on function public.duplicate_week(uuid, date, date) from public, anon;
revoke execute on function public.publish_shifts(uuid, date, date) from public, anon;
revoke execute on function public.clock(uuid, public.time_entry_kind, text, uuid, double precision, double precision, real) from public, anon;
revoke execute on function public.release_absence_shifts(uuid) from public, anon;
revoke execute on function public.respond_replacement(text, boolean) from public, anon, authenticated;
revoke execute on function public.detect_no_shows() from public, anon, authenticated;
revoke execute on function public.detect_expiring_documents() from public, anon, authenticated;
grant execute on function public.generate_contract_shifts(uuid, date, date) to authenticated, service_role;
grant execute on function public.duplicate_week(uuid, date, date) to authenticated;
grant execute on function public.publish_shifts(uuid, date, date) to authenticated;
grant execute on function public.clock(uuid, public.time_entry_kind, text, uuid, double precision, double precision, real) to authenticated;
grant execute on function public.release_absence_shifts(uuid) to authenticated, service_role;
grant execute on function public.respond_replacement(text, boolean) to service_role;
grant execute on function public.detect_no_shows() to service_role;
grant execute on function public.detect_expiring_documents() to service_role;
