import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { AppRole } from '@/config/roles';
import { homeForRole } from '@/config/roles';
import type { MembershipWithOrg, Organization } from '@/types/domain';

export const ORG_COOKIE = 'vacatio_org';

/** Utilisateur connecté (vérifié auprès de Supabase Auth), ou null. Mis en cache par requête. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

/** Entreprises dont l'utilisateur est membre actif. */
export const getMemberships = cache(async (): Promise<MembershipWithOrg[]> => {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('memberships')
    .select('id, role, is_owner, organization:organizations!inner(id, name, slug, plan, subscription_status, trial_ends_at, is_demo, onboarding)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .is('organization.deleted_at', null)
    .order('created_at');
  if (error) throw new Error(`Lecture des appartenances impossible : ${error.message}`);
  return (data ?? []).map((m) => ({
    id: m.id as string,
    role: m.role as AppRole,
    is_owner: m.is_owner as boolean,
    organization: m.organization as unknown as Organization,
  }));
});

export interface AuthContext {
  userId: string;
  email: string | undefined;
  membership: MembershipWithOrg;
  org: Organization;
  role: AppRole;
  memberships: MembershipWithOrg[];
}

/**
 * Contexte de l'entreprise active : cookie `vacatio_org` s'il désigne une entreprise
 * dont l'utilisateur est membre, sinon la première. Redirige si non connecté / sans entreprise.
 */
export const requireContext = cache(async (): Promise<AuthContext> => {
  const user = await getUser();
  if (!user) redirect('/connexion');
  const memberships = await getMemberships();
  if (memberships.length === 0) redirect('/bienvenue');
  const wanted = (await cookies()).get(ORG_COOKIE)?.value;
  const membership = memberships.find((m) => m.organization.id === wanted) ?? memberships[0]!;
  return {
    userId: user.id,
    email: user.email,
    membership,
    org: membership.organization,
    role: membership.role,
    memberships,
  };
});

/** Exige l'un des rôles donnés, sinon renvoie vers l'espace adapté au rôle. */
export async function requireRole(...roles: AppRole[]) {
  const ctx = await requireContext();
  if (!roles.includes(ctx.role)) redirect(homeForRole(ctx.role));
  return ctx;
}

export const isPlatformAdmin = cache(async () => {
  const user = await getUser();
  if (!user) return false;
  const supabase = await createClient();
  // RLS : platform_admins n'est lisible par personne ; on passe par la fonction SQL.
  const { data } = await supabase.rpc('is_platform_admin');
  return data === true;
});
