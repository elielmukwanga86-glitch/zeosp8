'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { friendlyError, parseForm } from '@/lib/actions';
import { geocodeAddress } from '@/lib/geocode';
import { markOnboarding } from '@/lib/onboarding';
import { rateLimit } from '@/lib/rate-limit';
import { sendAgentAccessLink } from '@/lib/auth/agent-access';
import { agentSchema, availabilitySchema, documentSchema } from '@/lib/validation/operations';
import type { FormState } from '@/lib/validation/auth';

/** Position approximative du domicile (centre de la commune, via le code postal) : sert au calcul de proximité. */
async function homeCoords(postalCode: string | null) {
  if (!postalCode) return { home_latitude: null, home_longitude: null };
  const c = await geocodeAddress(postalCode, postalCode, null);
  return { home_latitude: c?.latitude ?? null, home_longitude: c?.longitude ?? null };
}

function toRow(data: z.infer<typeof agentSchema>) {
  const { hourly_rate, ...rest } = data;
  return { ...rest, hourly_rate_cents: hourly_rate };
}

export async function createAgentAction(_p: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireRole('gerant');
  const parsed = parseForm(agentSchema, formData);
  if (!parsed.ok) return parsed.state;
  const supabase = await createClient();
  const { data, error } = await supabase.from('agents')
    .insert({ ...toRow(parsed.data), ...(await homeCoords(parsed.data.home_postal_code)), org_id: ctx.org.id }).select('id').single();
  if (error) return friendlyError(error);
  await markOnboarding(ctx, 'agents');
  redirect(`/app/agents/${data.id}`);
}

export async function updateAgentAction(_p: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireRole('gerant');
  const id = z.uuid().parse(formData.get('id'));
  const parsed = parseForm(agentSchema, formData);
  if (!parsed.ok) return parsed.state;
  const supabase = await createClient();
  const { data: before } = await supabase.from('agents').select('home_postal_code').eq('id', id).single();
  const coords = before?.home_postal_code !== parsed.data.home_postal_code ? await homeCoords(parsed.data.home_postal_code) : {};
  const { error } = await supabase.from('agents').update({ ...toRow(parsed.data), ...coords }).eq('id', id).eq('org_id', ctx.org.id);
  if (error) return friendlyError(error);
  revalidatePath(`/app/agents/${id}`);
  return { ok: true, message: 'Fiche enregistrée.' };
}

export async function setAgentStatusAction(formData: FormData) {
  const ctx = await requireRole('gerant');
  const id = z.uuid().parse(formData.get('id'));
  const status = z.enum(['active', 'inactive', 'left']).parse(formData.get('status'));
  const supabase = await createClient();
  const { error } = await supabase.from('agents').update({ status }).eq('id', id).eq('org_id', ctx.org.id);
  if (error) redirect(`/app/agents/${id}?erreur=${encodeURIComponent(friendlyError(error).error ?? '')}`);
  // Un agent inactif ou sorti perd son accès à l'application ; il le retrouve s'il redevient actif.
  const { data: a } = await supabase.from('agents').select('user_id').eq('id', id).single();
  if (a?.user_id) {
    const { data: m } = await supabase.from('memberships').select('id').eq('org_id', ctx.org.id).eq('user_id', a.user_id).maybeSingle();
    if (m) await supabase.rpc('update_member', { p_membership: m.id, p_role: 'agent', p_status: status === 'active' ? 'active' : 'suspended' });
  }
  revalidatePath(`/app/agents/${id}`);
}

export async function sendAccessLinkAction(_p: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireRole('gerant', 'chef_equipe');
  const id = z.uuid().parse(formData.get('id'));
  if (!(await rateLimit(`agent-link:org:${ctx.org.id}`, 100, 86400))) return { error: 'Limite quotidienne d’envois atteinte.' };
  const supabase = await createClient();
  // Lecture via RLS : garantit que l'agent appartient bien à l'entreprise de l'utilisateur.
  const { data: agent } = await supabase.from('agents').select('id, org_id, user_id, first_name, last_name, phone, status').eq('id', id).eq('org_id', ctx.org.id).maybeSingle();
  if (!agent) return { error: 'Agent introuvable.' };
  if (!agent.phone) return { error: 'Renseignez d’abord le numéro de mobile de l’agent.' };
  if (agent.status !== 'active') return { error: 'L’agent n’est pas actif.' };
  try {
    await sendAgentAccessLink(agent, ctx.org.name);
  } catch (error) {
    console.error('[agent-link]', (error as Error).message);
    return { error: 'Envoi impossible pour le moment.' };
  }
  await markOnboarding(ctx, 'invitations');
  return { ok: true, message: `Lien envoyé par SMS au ${agent.phone}.` };
}

export async function addAvailabilityAction(_p: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireRole('gerant');
  const parsed = parseForm(availabilitySchema, formData);
  if (!parsed.ok) return parsed.state;
  const { days, ...rest } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from('agent_availabilities').insert(days.map((d) => ({ ...rest, day_of_week: d, org_id: ctx.org.id })));
  if (error) return friendlyError(error);
  revalidatePath(`/app/agents/${rest.agent_id}`);
  return { ok: true, message: 'Disponibilités ajoutées.' };
}

export async function deleteAgentItemAction(formData: FormData) {
  const ctx = await requireRole('gerant');
  const table = z.enum(['agent_availabilities', 'agent_documents']).parse(formData.get('table'));
  const id = z.uuid().parse(formData.get('id'));
  const agentId = z.uuid().parse(formData.get('agent_id'));
  const supabase = await createClient();
  if (table === 'agent_documents') {
    const { data: doc } = await supabase.from('agent_documents').select('file_path').eq('id', id).single();
    if (doc?.file_path) await supabase.storage.from('agent-documents').remove([doc.file_path]);
  }
  await supabase.from(table).delete().eq('id', id).eq('org_id', ctx.org.id);
  revalidatePath(`/app/agents/${agentId}`);
}

const MAX_FILE = 10 * 1024 * 1024;
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export async function addDocumentAction(_p: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireRole('gerant');
  const parsed = parseForm(documentSchema, formData);
  if (!parsed.ok) return parsed.state;
  const file = formData.get('file');
  const supabase = await createClient();
  let file_path: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE) return { fieldErrors: { file: 'Fichier trop lourd (10 Mo maximum).' } };
    if (!ALLOWED.includes(file.type)) return { fieldErrors: { file: 'Formats acceptés : PDF, JPEG, PNG, WebP.' } };
    const ext = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1];
    file_path = `${ctx.org.id}/${parsed.data.agent_id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('agent-documents').upload(file_path, file, { contentType: file.type });
    if (error) return { error: 'Envoi du fichier impossible.' };
  }
  const { error } = await supabase.from('agent_documents').insert({ ...parsed.data, file_path, org_id: ctx.org.id });
  if (error) return friendlyError(error);
  revalidatePath(`/app/agents/${parsed.data.agent_id}`);
  return { ok: true, message: 'Document ajouté.' };
}

/** Lien de téléchargement temporaire (60 s) d'un document RH. */
export async function openDocumentAction(formData: FormData) {
  const ctx = await requireRole('gerant');
  const id = z.uuid().parse(formData.get('id'));
  const supabase = await createClient();
  const { data: doc } = await supabase.from('agent_documents').select('file_path').eq('id', id).eq('org_id', ctx.org.id).single();
  if (!doc?.file_path) return;
  const { data } = await supabase.storage.from('agent-documents').createSignedUrl(doc.file_path, 60);
  if (data?.signedUrl) redirect(data.signedUrl);
}
