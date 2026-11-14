'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { friendlyError } from '@/lib/actions';
import { addDays, parisDay, parisToUtc } from '@/lib/dates';
import type { FormState } from '@/lib/validation/auth';

/** Pointage de secours saisi par le chef d'équipe ou le gérant (agent sans smartphone). */
export async function manualClockAction(_p: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireRole('gerant', 'chef_equipe');
  const v = z.object({ shift_id: z.uuid(), kind: z.enum(['in', 'out']), time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) }).safeParse(Object.fromEntries(formData));
  if (!v.success) return { error: 'Heure invalide.' };
  const supabase = await createClient();
  const { data: shift } = await supabase.from('shifts').select('id, agent_id, site_id, starts_at, ends_at').eq('id', v.data.shift_id).eq('org_id', ctx.org.id).single();
  if (!shift?.agent_id) return { error: 'Vacation sans agent.' };
  // Jour de référence : celui du début (ou de la fin pour un départ après minuit).
  const ref = v.data.kind === 'out' ? new Date(shift.ends_at) : new Date(shift.starts_at);
  let at = parisToUtc(parisDay(ref), v.data.time);
  if (v.data.kind === 'out' && at < new Date(shift.starts_at)) at = parisToUtc(addDays(parisDay(ref), 1), v.data.time);
  if (at.getTime() > Date.now() + 5 * 60_000) return { error: 'Impossible de pointer dans le futur.' };
  const { error } = await supabase.from('time_entries').insert({
    org_id: ctx.org.id, shift_id: shift.id, agent_id: shift.agent_id, site_id: shift.site_id, kind: v.data.kind,
    occurred_at: at.toISOString(), method: 'manual_chef', recorded_by: ctx.userId,
  });
  if (error) return error.code === '23505' ? { error: 'Déjà pointé.' } : friendlyError(error);
  if (v.data.kind === 'in') await supabase.from('alerts').update({ resolved_at: new Date().toISOString() }).eq('org_id', ctx.org.id).eq('kind', 'no_show').eq('ref_id', shift.id);
  revalidatePath('/app/pointages');
  return { ok: true, message: 'Pointage enregistré.' };
}
