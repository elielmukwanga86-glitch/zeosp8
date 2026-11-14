'use server';

import { z } from 'zod';
import { requireRole } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';
import { addDays, parisToUtc } from '@/lib/dates';

export type ClockResult = { status: 'ok' | 'flagged' | 'no_shift' | 'qr_unknown' | 'error'; site?: string; at?: string };

const clockInput = z.object({
  kind: z.enum(['in', 'out']),
  qr: z.string().min(10).max(64).nullable(),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  accuracy: z.number().min(0).max(100_000).nullable(),
});

/** Pointage de l'agent : la position est transmise une seule fois, à cet instant. */
export async function clockAction(input: z.infer<typeof clockInput>): Promise<ClockResult> {
  const ctx = await requireRole('agent');
  const v = clockInput.safeParse(input);
  if (!v.success) return { status: 'error' };
  if (!(await rateLimit(`clock:${ctx.userId}`, 20, 3600))) return { status: 'error' };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('clock', {
    p_org: ctx.org.id, p_kind: v.data.kind, p_qr_token: v.data.qr, p_shift: null,
    p_lat: v.data.lat, p_lng: v.data.lng, p_accuracy: v.data.accuracy,
  });
  if (error) {
    if (error.message.includes('AUCUNE_VACATION')) return { status: 'no_shift' };
    if (error.message.includes('QR_INCONNU')) return { status: 'qr_unknown' };
    console.error('[clock]', error.message);
    return { status: 'error' };
  }
  const r = data as { site: string; flagged: boolean };
  return { status: r.flagged ? 'flagged' : 'ok', site: r.site, at: new Date().toISOString() };
}

const absenceInput = z.object({
  start_day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.enum(['maladie', 'evenement_familial', 'autre']),
});

/**
 * Déclaration d'absence par l'agent : enregistrement (RLS agent), libération des
 * vacations concernées et alerte du gérant par e-mail.
 */
export async function declareAbsenceAction(_p: { status?: string }, formData: FormData): Promise<{ status?: 'ok' | 'error' }> {
  const ctx = await requireRole('agent');
  const v = absenceInput.safeParse(Object.fromEntries(formData));
  if (!v.success || v.data.end_day < v.data.start_day) return { status: 'error' };
  if (!(await rateLimit(`absence:${ctx.userId}`, 10, 86400))) return { status: 'error' };
  const supabase = await createClient();
  const { data: agent } = await supabase.from('agents').select('id, first_name, last_name').eq('org_id', ctx.org.id).eq('user_id', ctx.userId).single();
  if (!agent) return { status: 'error' };

  let proof_path: string | null = null;
  const file = formData.get('proof');
  if (file instanceof File && file.size > 0 && file.size <= 10 * 1024 * 1024 && file.type.startsWith('image/')) {
    proof_path = `${ctx.org.id}/${agent.id}/${crypto.randomUUID()}.${file.type.split('/')[1]}`;
    const { error } = await supabase.storage.from('absence-proofs').upload(proof_path, file, { contentType: file.type });
    if (error) proof_path = null;
  }

  const { data: abs, error } = await supabase.from('absences').insert({
    org_id: ctx.org.id, agent_id: agent.id, reason: v.data.reason, status: 'declared', declared_by: ctx.userId, proof_path,
    starts_at: parisToUtc(v.data.start_day, '00:00').toISOString(),
    ends_at: parisToUtc(addDays(v.data.end_day, 1), '00:00').toISOString(),
  }).select('id').single();
  if (error || !abs) { console.error('[absence]', error?.message); return { status: 'error' }; }

  // Opérations serveur : l'agent n'a pas le droit de modifier le planning lui-même.
  const admin = createAdminClient();
  const { data: freed } = await admin.rpc('release_absence_shifts', { p_absence: abs.id });
  const { data: gerants } = await admin.from('memberships').select('user_id').eq('org_id', ctx.org.id).eq('role', 'gerant').eq('status', 'active');
  for (const g of gerants ?? []) {
    const { data: u } = await admin.auth.admin.getUserById(g.user_id);
    if (u.user?.email) {
      await admin.from('notification_outbox').insert({
        org_id: ctx.org.id, channel: 'email', recipient: u.user.email, template: 'absence_declared',
        payload: { title: `Absence déclarée : ${agent.first_name} ${agent.last_name}`, body: `Du ${v.data.start_day} au ${v.data.end_day}. ${freed ?? 0} vacation(s) à remplacer.` },
      });
    }
  }
  return { status: 'ok' };
}
