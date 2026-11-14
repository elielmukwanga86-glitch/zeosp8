import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { publicEnv } from '@/lib/env';
import { serverEnv } from '@/lib/env.server';
import { sendSms } from '@/lib/notifications';

interface AgentRow {
  id: string;
  org_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  status: string;
}

/**
 * Crée (si besoin) le compte de connexion d'un agent et son appartenance « agent ».
 * Le compte utilise une adresse technique jamais contactée : la connexion se fait
 * uniquement par lien magique envoyé par SMS.
 */
export async function ensureAgentUser(agent: AgentRow): Promise<{ userId: string; email: string }> {
  const admin = createAdminClient();
  const email = `${agent.id}@${serverEnv().AGENT_EMAIL_DOMAIN}`;

  let userId = agent.user_id;
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: `${agent.first_name} ${agent.last_name}`, kind: 'agent' },
    });
    if (error || !data.user) throw new Error(`Création du compte agent impossible : ${error?.message}`);
    userId = data.user.id;
    const { error: linkError } = await admin.from('agents').update({ user_id: userId }).eq('id', agent.id).eq('org_id', agent.org_id);
    if (linkError) throw new Error(`Liaison du compte agent impossible : ${linkError.message}`);
  }

  const { error: memberError } = await admin
    .from('memberships')
    .upsert({ org_id: agent.org_id, user_id: userId, role: 'agent', status: 'active' }, { onConflict: 'org_id,user_id', ignoreDuplicates: true });
  if (memberError) throw new Error(`Création de l'accès agent impossible : ${memberError.message}`);

  return { userId, email };
}

/** Génère un lien magique Supabase et l'envoie par SMS à l'agent. */
export async function sendAgentAccessLink(agent: AgentRow, orgName: string): Promise<boolean> {
  if (!agent.phone || agent.status !== 'active') return false;
  const { email } = await ensureAgentUser(agent);
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (error || !data.properties?.hashed_token) throw new Error(`Génération du lien impossible : ${error?.message}`);

  const url = new URL('/auth/confirm', publicEnv.NEXT_PUBLIC_APP_URL);
  url.searchParams.set('token_hash', data.properties.hashed_token);
  url.searchParams.set('type', 'magiclink');
  url.searchParams.set('next', '/agent');

  // SMS court, sans accent superflu (1 SMS = 160 caractères GSM).
  return sendSms(agent.phone, `${orgName} - Vacatio : votre lien de connexion (valable 1 h) ${url.toString()}`);
}

/**
 * Demande de lien depuis /agent/connexion : envoie un lien pour chaque fiche agent
 * active portant ce numéro (un agent peut travailler pour plusieurs entreprises).
 */
export async function requestAgentLinkByPhone(phone: string): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('agents')
    .select('id, org_id, user_id, first_name, last_name, phone, status, organization:organizations!inner(name, deleted_at)')
    .eq('phone', phone)
    .eq('status', 'active')
    .is('organization.deleted_at', null)
    .limit(3);
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    const org = row.organization as unknown as { name: string };
    await sendAgentAccessLink(row as AgentRow, org.name);
  }
}
