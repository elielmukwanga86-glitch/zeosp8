'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { friendlyError, parseForm } from '@/lib/actions';
import { addDays, parisTime, parisToUtc } from '@/lib/dates';
import { markOnboarding } from '@/lib/onboarding';
import { estBloquant, type Violation } from '@/lib/planning/conformite';
import { checkAgentWithShift, loadRules } from '@/lib/planning/server';
import { shiftSchema } from '@/lib/validation/operations';
import type { FormState } from '@/lib/validation/auth';

export type PlanningResult = FormState & { violations?: Violation[] };

function bounds(day: string, start: string, end: string) {
  const starts = parisToUtc(day, start);
  const ends = end <= start ? parisToUtc(addDays(day, 1), end) : parisToUtc(day, end);
  return { starts, ends };
}

/**
 * Contrôle de conformité commun : une violation bloquante empêche l'enregistrement,
 * sauf si le gérant force (la violation reste alors tracée sur la vacation).
 */
async function complianceGate(orgId: string, agentId: string | null, candidate: { id: string; start: Date; end: Date; breakMinutes: number }, force: boolean, isGerant: boolean) {
  if (!agentId) return { blocked: false, violations: [] as Violation[] };
  const supabase = await createClient();
  const violations = await checkAgentWithShift(supabase, orgId, agentId, candidate, await loadRules(supabase, orgId));
  const blocked = estBloquant(violations) && !(force && isGerant);
  return { blocked, violations };
}

export async function saveShiftAction(_p: PlanningResult, formData: FormData): Promise<PlanningResult> {
  const ctx = await requireRole('gerant', 'chef_equipe');
  const parsed = parseForm(shiftSchema, formData);
  if (!parsed.ok) return parsed.state;
  const d = parsed.data;
  const { starts, ends } = bounds(d.day, d.start_time, d.end_time);
  if ((ends.getTime() - starts.getTime()) / 3_600_000 > 13) return { fieldErrors: { end_time: 'Une vacation ne peut pas dépasser 13 h.' } };
  const id = d.id ?? crypto.randomUUID();
  const gate = await complianceGate(ctx.org.id, d.agent_id, { id, start: starts, end: ends, breakMinutes: d.break_minutes }, d.force, ctx.role === 'gerant');
  if (gate.blocked) {
    return { error: 'Cette affectation enfreint les règles de conformité.', violations: gate.violations };
  }
  const row = {
    site_id: d.site_id, agent_id: d.agent_id, starts_at: starts.toISOString(), ends_at: ends.toISOString(),
    break_minutes: d.break_minutes, notes: d.notes, billable: d.billable, compliance_warnings: gate.violations,
  };
  const supabase = await createClient();
  const { error } = d.id
    ? await supabase.from('shifts').update(row).eq('id', d.id).eq('org_id', ctx.org.id)
    : await supabase.from('shifts').insert({ ...row, id, org_id: ctx.org.id, status: 'draft', source: 'manual', created_by: ctx.userId });
  if (error) return friendlyError(error);
  await markOnboarding(ctx, 'planning');
  revalidatePath('/app/planning');
  return { ok: true, message: gate.violations.length ? 'Enregistré avec des alertes.' : 'Vacation enregistrée.', violations: gate.violations };
}

/** Glisser-déposer : change l'agent (ou le site) et le jour, en gardant les horaires. */
export async function moveShiftAction(input: { shiftId: string; day: string; agentId?: string | null; siteId?: string; force?: boolean }): Promise<PlanningResult> {
  const ctx = await requireRole('gerant', 'chef_equipe');
  const v = z.object({ shiftId: z.uuid(), day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), agentId: z.uuid().nullable().optional(), siteId: z.uuid().optional(), force: z.boolean().optional() }).safeParse(input);
  if (!v.success) return { error: 'Déplacement invalide.' };
  const supabase = await createClient();
  const { data: shift } = await supabase.from('shifts').select('id, agent_id, site_id, starts_at, ends_at, break_minutes').eq('id', v.data.shiftId).eq('org_id', ctx.org.id).single();
  if (!shift) return { error: 'Vacation introuvable.' };
  const oldStart = new Date(shift.starts_at);
  const { starts } = bounds(v.data.day, parisTime(oldStart), parisTime(oldStart));
  const ends = new Date(starts.getTime() + (new Date(shift.ends_at).getTime() - oldStart.getTime()));
  const agentId = v.data.agentId === undefined ? shift.agent_id : v.data.agentId;
  const gate = await complianceGate(ctx.org.id, agentId, { id: shift.id, start: starts, end: ends, breakMinutes: shift.break_minutes }, Boolean(v.data.force), ctx.role === 'gerant');
  if (gate.blocked) return { error: 'Déplacement refusé : règles de conformité.', violations: gate.violations };
  const { error } = await supabase.from('shifts').update({
    agent_id: agentId, site_id: v.data.siteId ?? shift.site_id, starts_at: starts.toISOString(), ends_at: ends.toISOString(), compliance_warnings: gate.violations,
  }).eq('id', shift.id).eq('org_id', ctx.org.id);
  if (error) return friendlyError(error);
  revalidatePath('/app/planning');
  return { ok: true, violations: gate.violations };
}

export async function cancelShiftAction(formData: FormData) {
  const ctx = await requireRole('gerant', 'chef_equipe');
  const id = z.uuid().parse(formData.get('id'));
  const supabase = await createClient();
  const { data: shift } = await supabase.from('shifts').select('status').eq('id', id).eq('org_id', ctx.org.id).single();
  if (!shift) return;
  // Un brouillon est supprimé ; une vacation publiée est annulée (l'agent est prévenu).
  if (shift.status === 'draft') await supabase.from('shifts').delete().eq('id', id);
  else await supabase.from('shifts').update({ status: 'cancelled' }).eq('id', id);
  revalidatePath('/app/planning');
}

const range = z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

export async function generateAction(_p: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireRole('gerant', 'chef_equipe');
  const r = range.safeParse(Object.fromEntries(formData));
  if (!r.success) return { error: 'Période invalide.' };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('generate_contract_shifts', { p_org: ctx.org.id, p_from: r.data.from, p_to: r.data.to });
  if (error) return friendlyError(error);
  revalidatePath('/app/planning');
  return { ok: true, message: data === 0 ? 'Aucune nouvelle vacation : tout est déjà généré.' : `${data} vacation(s) créée(s) en brouillon.` };
}

export async function duplicateWeekAction(_p: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireRole('gerant', 'chef_equipe');
  const monday = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(formData.get('monday'));
  if (!monday.success) return { error: 'Semaine invalide.' };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('duplicate_week', { p_org: ctx.org.id, p_source_monday: monday.data, p_target_monday: addDays(monday.data, 7) });
  if (error) return friendlyError(error);
  revalidatePath('/app/planning');
  return { ok: true, message: `${data} vacation(s) copiée(s) sur la semaine suivante (brouillons).` };
}

export async function publishAction(_p: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireRole('gerant', 'chef_equipe');
  const r = range.safeParse(Object.fromEntries(formData));
  if (!r.success) return { error: 'Période invalide.' };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('publish_shifts', { p_org: ctx.org.id, p_from: r.data.from, p_to: r.data.to });
  if (error) return friendlyError(error);
  revalidatePath('/app/planning');
  return { ok: true, message: data ? `${data} vacation(s) publiée(s). Les agents sont prévenus par SMS.` : 'Rien à publier.' };
}
