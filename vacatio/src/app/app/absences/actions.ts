'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { friendlyError, parseForm } from '@/lib/actions';
import { addDays, formatDayLabel, parisDay, parisTime, parisToUtc } from '@/lib/dates';
import { estBloquant } from '@/lib/planning/conformite';
import { checkAgentWithShift, loadRules } from '@/lib/planning/server';
import { generateToken, hashToken } from '@/lib/tokens';
import { sendSms } from '@/lib/notifications';
import { rateLimit } from '@/lib/rate-limit';
import { publicEnv } from '@/lib/env';
import { absenceSchema } from '@/lib/validation/operations';
import type { FormState } from '@/lib/validation/auth';

export async function declareAbsenceAction(_p: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireRole('gerant', 'chef_equipe');
  const parsed = parseForm(absenceSchema, formData);
  if (!parsed.ok) return parsed.state;
  const d = parsed.data;
  const supabase = await createClient();
  const { data: abs, error } = await supabase.from('absences').insert({
    org_id: ctx.org.id, agent_id: d.agent_id, reason: d.reason, comment: d.comment, declared_by: ctx.userId,
    status: ctx.role === 'gerant' ? 'approved' : 'declared',
    starts_at: parisToUtc(d.start_day, '00:00').toISOString(), ends_at: parisToUtc(addDays(d.end_day, 1), '00:00').toISOString(),
  }).select('id').single();
  if (error) return friendlyError(error);
  const { data: freed, error: e2 } = await supabase.rpc('release_absence_shifts', { p_absence: abs.id });
  if (e2) return friendlyError(e2);
  revalidatePath('/app/absences');
  return { ok: true, message: freed ? `Absence enregistrée : ${freed} vacation(s) à remplacer.` : 'Absence enregistrée (aucune vacation concernée).' };
}

export async function reviewAbsenceAction(formData: FormData) {
  const ctx = await requireRole('gerant');
  const id = z.uuid().parse(formData.get('id'));
  const status = z.enum(['approved', 'rejected', 'cancelled']).parse(formData.get('status'));
  const supabase = await createClient();
  await supabase.from('absences').update({ status, reviewed_by: ctx.userId, reviewed_at: new Date().toISOString() }).eq('id', id).eq('org_id', ctx.org.id);
  revalidatePath('/app/absences');
}

/** Envoie une proposition de remplacement par SMS (réponse en un clic, sans connexion). */
export async function proposeReplacementAction(_p: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireRole('gerant', 'chef_equipe');
  const shiftId = z.uuid().parse(formData.get('shift_id'));
  const agentId = z.uuid().parse(formData.get('agent_id'));
  if (!(await rateLimit(`offer:${ctx.org.id}`, 200, 86400))) return { error: 'Limite quotidienne de SMS atteinte.' };
  const supabase = await createClient();
  const [{ data: shift }, { data: agent }] = await Promise.all([
    supabase.from('shifts').select('id, agent_id, starts_at, ends_at, site:sites(name)').eq('id', shiftId).eq('org_id', ctx.org.id).single(),
    supabase.from('agents').select('id, first_name, phone').eq('id', agentId).eq('org_id', ctx.org.id).single(),
  ]);
  if (!shift || shift.agent_id) return { error: 'Cette vacation est déjà pourvue.' };
  if (!agent?.phone) return { error: 'Cet agent n’a pas de numéro de mobile.' };
  const start = new Date(shift.starts_at);
  const token = generateToken();
  const expires = new Date(Math.min(start.getTime(), Date.now() + 24 * 3600_000));
  const { error } = await supabase.from('replacement_offers').insert({
    org_id: ctx.org.id, shift_id: shift.id, candidate_id: agent.id, token_hash: hashToken(token), expires_at: expires.toISOString(), created_by: ctx.userId,
  });
  if (error) return friendlyError(error);
  const site = shift.site as unknown as { name: string };
  await sendSms(agent.phone, `${ctx.org.name} : remplacement ${formatDayLabel(parisDay(start))} ${parisTime(start)}-${parisTime(new Date(shift.ends_at))}, ${site.name}. Repondre : ${publicEnv.NEXT_PUBLIC_APP_URL}/r/${token}`);
  revalidatePath(`/app/absences/remplacer/${shiftId}`);
  return { ok: true, message: `Proposition envoyée à ${agent.first_name}.` };
}

/** Affecte directement un remplaçant (contrôle de conformité, publication immédiate). */
export async function assignReplacementAction(_p: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireRole('gerant', 'chef_equipe');
  const shiftId = z.uuid().parse(formData.get('shift_id'));
  const agentId = z.uuid().parse(formData.get('agent_id'));
  const supabase = await createClient();
  const { data: shift } = await supabase.from('shifts').select('id, agent_id, starts_at, ends_at, break_minutes').eq('id', shiftId).eq('org_id', ctx.org.id).single();
  if (!shift || shift.agent_id) return { error: 'Cette vacation est déjà pourvue.' };
  const violations = await checkAgentWithShift(supabase, ctx.org.id, agentId,
    { id: shift.id, start: new Date(shift.starts_at), end: new Date(shift.ends_at), breakMinutes: shift.break_minutes }, await loadRules(supabase, ctx.org.id));
  if (estBloquant(violations)) return { error: violations.filter((v) => v.severite === 'bloquant').map((v) => v.message).join(' · ') };
  const { error } = await supabase.from('shifts').update({
    agent_id: agentId, source: 'replacement', billable: true, status: 'published', published_at: new Date().toISOString(), compliance_warnings: violations,
  }).eq('id', shiftId);
  if (error) return friendlyError(error);
  await supabase.from('replacement_offers').update({ status: 'cancelled' }).eq('shift_id', shiftId).eq('status', 'proposed');
  await supabase.from('alerts').update({ resolved_at: new Date().toISOString() }).eq('org_id', ctx.org.id).eq('ref_id', shiftId).is('resolved_at', null);
  revalidatePath('/app/absences');
  return { ok: true, message: 'Remplaçant affecté. Il est prévenu par SMS.' };
}
