'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { generateToken, hashToken } from '@/lib/tokens';
import { emailLayout, escapeHtml, sendEmail } from '@/lib/notifications';
import { publicEnv } from '@/lib/env';
import { rateLimit } from '@/lib/rate-limit';
import { effectivePlan, PLANS } from '@/config/plans';
import { ROLE_LABELS } from '@/config/roles';
import { fieldErrors, inviteSchema, type FormState } from '@/lib/validation/auth';

export async function inviteMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireRole('gerant');
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (!(await rateLimit(`invite:${ctx.org.id}`, 30, 86400))) return { error: 'Limite quotidienne d’invitations atteinte.' };

  const supabase = await createClient();
  // Blocage doux : nombre de chefs d'équipe limité selon le forfait.
  if (parsed.data.role === 'chef_equipe') {
    const limit = PLANS[effectivePlan(ctx.org)].limits.chefs;
    if (limit !== null) {
      const { count } = await supabase.from('memberships').select('id', { count: 'exact', head: true })
        .eq('org_id', ctx.org.id).eq('role', 'chef_equipe').eq('status', 'active');
      if ((count ?? 0) >= limit) {
        return { error: limit === 0
          ? 'Le forfait Découverte n’inclut pas de chef d’équipe. Passez au forfait Essentiel.'
          : 'Plusieurs chefs d’équipe nécessitent le forfait Business.' };
      }
    }
  }

  const token = generateToken();
  const { error } = await supabase.from('invitations').insert({
    org_id: ctx.org.id, email: parsed.data.email, role: parsed.data.role, token_hash: hashToken(token), invited_by: ctx.userId,
  });
  if (error) {
    if (error.code === '23505') return { fieldErrors: { email: 'Une invitation est déjà en attente pour cette adresse.' } };
    return { error: 'Invitation impossible.' };
  }

  const url = `${publicEnv.NEXT_PUBLIC_APP_URL}/invitation/${token}`;
  const role = ROLE_LABELS[parsed.data.role].toLowerCase();
  await sendEmail({
    to: parsed.data.email,
    subject: `${ctx.org.name} vous invite sur Vacatio`,
    text: `${ctx.org.name} vous invite à rejoindre Vacatio en tant que ${role}. Lien valable 7 jours : ${url}`,
    html: emailLayout('Invitation', `<p>${escapeHtml(ctx.org.name)} vous invite à rejoindre Vacatio en tant que <strong>${escapeHtml(role)}</strong>.</p><p>Ce lien est valable 7 jours.</p>`, { label: 'Accepter l’invitation', url }),
  });
  revalidatePath('/app/equipe');
  return { ok: true, message: `Invitation envoyée à ${parsed.data.email}.` };
}

export async function revokeInvitation(formData: FormData) {
  const ctx = await requireRole('gerant');
  const id = z.uuid().parse(formData.get('id'));
  const supabase = await createClient();
  await supabase.from('invitations').delete().eq('id', id).eq('org_id', ctx.org.id);
  revalidatePath('/app/equipe');
}

export async function removeMember(formData: FormData) {
  await requireRole('gerant');
  const id = z.uuid().parse(formData.get('id'));
  const supabase = await createClient();
  const { error } = await supabase.rpc('remove_member', { p_membership: id });
  if (error) throw new Error(error.message);
  revalidatePath('/app/equipe');
}
