-- =============================================================================
-- Vacatio — 0008 : RPC publiques en lecture pour l'interface
-- =============================================================================

-- Indique si l'utilisateur courant fait partie de l'équipe Vacatio (super-admin).
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select app.is_platform_admin();
$$;

-- Forfait effectif de l'entreprise (essai expiré → Découverte).
create or replace function public.effective_plan(p_org uuid)
returns public.plan_code language sql stable security definer set search_path = '' as $$
  select case when app.is_member(p_org) then app.effective_plan(p_org) end;
$$;

-- Préférence de langue de l'utilisateur courant (interface agent).
create or replace function public.set_my_locale(p_locale public.agent_language)
returns void language sql security definer set search_path = '' as $$
  update public.profiles set locale = p_locale where id = auth.uid();
  update public.agents set language = p_locale where user_id = auth.uid();
$$;

revoke execute on function public.is_platform_admin() from public, anon;
revoke execute on function public.effective_plan(uuid) from public, anon;
revoke execute on function public.set_my_locale(public.agent_language) from public, anon;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.effective_plan(uuid) to authenticated;
grant execute on function public.set_my_locale(public.agent_language) to authenticated;
