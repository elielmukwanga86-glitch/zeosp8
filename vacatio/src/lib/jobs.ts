import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { emailLayout, escapeHtml, sendEmail, sendSms } from '@/lib/notifications';
import { publicEnv } from '@/lib/env';

/** Envoie les messages en attente de la file (e-mail, SMS). 3 tentatives maximum. */
export async function processOutbox(admin: SupabaseClient) {
  const { data: items } = await admin.from('notification_outbox').select('*')
    .eq('status', 'pending').lte('send_after', new Date().toISOString()).order('created_at').limit(50);
  let sent = 0;
  for (const m of items ?? []) {
    const payload = (m.payload ?? {}) as { title?: string; body?: string };
    let ok = false;
    try {
      if (m.channel === 'email') {
        const title = payload.title ?? 'Notification Vacatio';
        ok = await sendEmail({
          to: m.recipient, subject: title, text: `${title}\n\n${payload.body ?? ''}\n\n${publicEnv.NEXT_PUBLIC_APP_URL}/app`,
          html: emailLayout(title, `<p>${escapeHtml(payload.body ?? '')}</p>`, { label: 'Ouvrir Vacatio', url: `${publicEnv.NEXT_PUBLIC_APP_URL}/app` }),
        });
      } else if (m.channel === 'sms') {
        ok = await sendSms(m.recipient, payload.body ?? '');
      } else {
        // WhatsApp et messages in-app : module D3 (phase 4).
        ok = false;
      }
    } catch (error) {
      console.error('[outbox]', (error as Error).message);
    }
    const attempts = m.attempts + 1;
    await admin.from('notification_outbox').update(ok
      ? { status: 'sent', sent_at: new Date().toISOString(), attempts }
      : { status: attempts >= 3 ? 'failed' : 'pending', attempts, last_error: 'envoi refusé', send_after: new Date(Date.now() + attempts * 5 * 60_000).toISOString() })
      .eq('id', m.id);
    if (ok) sent++;
  }
  return sent;
}

/**
 * Prévient chaque agent (un SMS groupé) des changements de son planning publié.
 * Délai de 2 minutes pour regrouper les modifications successives.
 */
export async function notifyShiftChanges(admin: SupabaseClient) {
  const { data: changes } = await admin.from('shift_changes').select('id, org_id, agent_id, before, after')
    .is('notified_at', null).lt('created_at', new Date(Date.now() - 2 * 60_000).toISOString()).order('created_at').limit(500);
  if (!changes?.length) return 0;
  const now = Date.now();
  const byAgent = new Map<string, typeof changes>();
  for (const c of changes) {
    if (!c.agent_id) continue;
    const snap = (c.after ?? c.before) as { ends_at?: string } | null;
    if (snap?.ends_at && new Date(snap.ends_at).getTime() < now) continue; // changement passé : inutile de prévenir
    byAgent.set(c.agent_id, [...(byAgent.get(c.agent_id) ?? []), c]);
  }
  let sms = 0;
  for (const [agentId, list] of byAgent) {
    const { data: agent } = await admin.from('agents').select('phone, status, organization:organizations(name)').eq('id', agentId).single();
    if (agent?.phone && agent.status === 'active') {
      const org = (agent.organization as unknown as { name: string }).name;
      await sendSms(agent.phone, `${org} : votre planning a change (${list.length} modification${list.length > 1 ? 's' : ''}). Voir : ${publicEnv.NEXT_PUBLIC_APP_URL}/agent`);
      sms++;
    }
  }
  await admin.from('shift_changes').update({ notified_at: new Date().toISOString() }).in('id', changes.map((c) => c.id));
  return sms;
}
