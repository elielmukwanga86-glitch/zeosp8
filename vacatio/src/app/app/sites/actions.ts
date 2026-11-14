'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { friendlyError, parseForm } from '@/lib/actions';
import { geocodeAddress } from '@/lib/geocode';
import { generateToken, hashToken } from '@/lib/tokens';
import { accessCodeSchema, areaSchema, contractSchema, scheduleSchema, siteSchema, taskSchema } from '@/lib/validation/operations';
import type { FormState } from '@/lib/validation/auth';

const path = (siteId: string) => `/app/sites/${siteId}`;

export async function updateSiteAction(_p: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireRole('gerant', 'chef_equipe');
  const id = z.uuid().parse(formData.get('id'));
  const parsed = parseForm(siteSchema, formData);
  if (!parsed.ok) return parsed.state;
  const supabase = await createClient();
  const { data: before } = await supabase.from('sites').select('address_line1, postal_code, city, latitude').eq('id', id).single();
  const addressChanged = before && (before.address_line1 !== parsed.data.address_line1 || before.postal_code !== parsed.data.postal_code || before.city !== parsed.data.city);
  const coords = (addressChanged || before?.latitude == null) && parsed.data.address_line1
    ? await geocodeAddress(parsed.data.address_line1, parsed.data.postal_code, parsed.data.city) : null;
  // Le chef d'équipe ne peut pas déplacer un site vers une autre zone.
  const update: Partial<typeof parsed.data> = { ...parsed.data };
  delete update.client_id;
  if (ctx.role !== 'gerant') delete update.zone_id;
  const { error } = await supabase.from('sites').update({ ...update, ...(coords ?? (addressChanged ? { latitude: null, longitude: null } : {})) })
    .eq('id', id).eq('org_id', ctx.org.id);
  if (error) return friendlyError(error);
  revalidatePath(path(id));
  return { ok: true, message: coords || !addressChanged ? 'Site enregistré.' : 'Site enregistré, mais l’adresse n’a pas été localisée.' };
}

export async function archiveSiteAction(formData: FormData) {
  const ctx = await requireRole('gerant');
  const id = z.uuid().parse(formData.get('id'));
  const supabase = await createClient();
  await supabase.from('sites').update({ archived_at: new Date().toISOString() }).eq('id', id).eq('org_id', ctx.org.id);
  revalidatePath(path(id));
}

async function insertAndRevalidate(table: string, row: Record<string, unknown>, siteId: string, message: string): Promise<FormState> {
  const ctx = await requireRole('gerant', 'chef_equipe');
  const supabase = await createClient();
  const { error } = await supabase.from(table).insert({ ...row, org_id: ctx.org.id });
  if (error) return friendlyError(error);
  revalidatePath(path(siteId));
  return { ok: true, message };
}

export async function addAccessCodeAction(_p: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(accessCodeSchema, formData);
  if (!parsed.ok) return parsed.state;
  return insertAndRevalidate('site_access_codes', parsed.data, parsed.data.site_id, 'Code enregistré.');
}

export async function addAreaAction(_p: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(areaSchema, formData);
  if (!parsed.ok) return parsed.state;
  return insertAndRevalidate('site_areas', parsed.data, parsed.data.site_id, 'Zone ajoutée.');
}

export async function addTaskAction(_p: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(taskSchema, formData);
  if (!parsed.ok) return parsed.state;
  return insertAndRevalidate('site_tasks', parsed.data, parsed.data.site_id, 'Tâche ajoutée.');
}

export async function addContractAction(_p: FormState, formData: FormData): Promise<FormState> {
  await requireRole('gerant');
  const parsed = parseForm(contractSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { hourly_price, monthly_price, ...rest } = parsed.data;
  return insertAndRevalidate('service_contracts', { ...rest, hourly_price_cents: hourly_price, monthly_price_cents: monthly_price }, rest.site_id, 'Contrat enregistré.');
}

export async function addScheduleAction(_p: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireRole('gerant');
  const parsed = parseForm(scheduleSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { days, site_id, ...rest } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from('contract_schedules').insert(days.map((d) => ({ ...rest, day_of_week: d, org_id: ctx.org.id })));
  if (error) return friendlyError(error);
  revalidatePath(path(site_id));
  return { ok: true, message: `${days.length} créneau${days.length > 1 ? 'x' : ''} récurrent${days.length > 1 ? 's' : ''} ajouté${days.length > 1 ? 's' : ''}.` };
}

/** Suppression générique d'une ligne liée au site (RLS : gérant ou chef de la zone). */
export async function deleteSiteItemAction(formData: FormData) {
  const ctx = await requireRole('gerant', 'chef_equipe');
  const table = z.enum(['site_access_codes', 'site_areas', 'site_tasks', 'service_contracts', 'contract_schedules', 'site_checkpoints', 'shared_devices', 'agent_usual_sites'])
    .parse(formData.get('table'));
  const siteId = z.uuid().parse(formData.get('site_id'));
  const supabase = await createClient();
  if (table === 'agent_usual_sites') {
    await supabase.from(table).delete().eq('site_id', siteId).eq('agent_id', z.uuid().parse(formData.get('id'))).eq('org_id', ctx.org.id);
  } else if (table === 'site_checkpoints' || table === 'shared_devices') {
    // On désactive plutôt que supprimer (les pointages passés y font référence).
    const update = table === 'site_checkpoints' ? { active: false } : { revoked_at: new Date().toISOString() };
    await supabase.from(table).update(update).eq('id', z.uuid().parse(formData.get('id'))).eq('org_id', ctx.org.id);
  } else {
    await supabase.from(table).delete().eq('id', z.uuid().parse(formData.get('id'))).eq('org_id', ctx.org.id);
  }
  revalidatePath(path(siteId));
}

export async function addCheckpointAction(formData: FormData) {
  const ctx = await requireRole('gerant', 'chef_equipe');
  const siteId = z.uuid().parse(formData.get('site_id'));
  const label = z.string().trim().min(1).max(60).catch('Entrée').parse(formData.get('label'));
  const supabase = await createClient();
  const { error } = await supabase.from('site_checkpoints').insert({ org_id: ctx.org.id, site_id: siteId, label, qr_token: generateToken(18) });
  if (error) throw new Error(friendlyError(error).error);
  revalidatePath(path(siteId));
}

/** Crée un appareil partagé (borne) ; le lien n'est affiché qu'une seule fois. */
export async function addSharedDeviceAction(_p: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireRole('gerant', 'chef_equipe');
  const siteId = z.uuid().parse(formData.get('site_id'));
  const label = z.string().trim().min(1, 'Nom requis').max(60).safeParse(formData.get('label'));
  if (!label.success) return { fieldErrors: { label: 'Nom requis' } };
  const token = generateToken();
  const supabase = await createClient();
  const { error } = await supabase.from('shared_devices').insert({ org_id: ctx.org.id, site_id: siteId, label: label.data, token_hash: hashToken(token) });
  if (error) return friendlyError(error);
  revalidatePath(path(siteId));
  return { ok: true, message: `/borne/${token}` };
}

export async function addUsualAgentAction(formData: FormData) {
  const ctx = await requireRole('gerant');
  const siteId = z.uuid().parse(formData.get('site_id'));
  const agentId = z.uuid().safeParse(formData.get('agent_id'));
  if (!agentId.success) return;
  const supabase = await createClient();
  await supabase.from('agent_usual_sites').upsert({ org_id: ctx.org.id, site_id: siteId, agent_id: agentId.data }, { ignoreDuplicates: true });
  revalidatePath(path(siteId));
}
