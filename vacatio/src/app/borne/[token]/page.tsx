import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import { LogIn, LogOut, CircleCheck } from 'lucide-react';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashToken } from '@/lib/tokens';
import { rateLimit } from '@/lib/rate-limit';
import { addDays, parisDay, parisTime, parisToUtc } from '@/lib/dates';
import { Logo } from '@/components/logo';

export const metadata: Metadata = { title: 'Borne de pointage', robots: { index: false } };
export const dynamic = 'force-dynamic';

/** Appareil partagé valide (non révoqué) correspondant au jeton du lien. */
async function deviceFor(token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const admin = createAdminClient();
  const { data } = await admin.from('shared_devices').select('id, org_id, site_id, label, site:sites(name)')
    .eq('token_hash', hashToken(token)).is('revoked_at', null).maybeSingle();
  return data;
}

async function clockFromDevice(formData: FormData) {
  'use server';
  const token = String(formData.get('token') ?? '');
  const shiftId = z.uuid().parse(formData.get('shift_id'));
  const kind = z.enum(['in', 'out']).parse(formData.get('kind'));
  const device = await deviceFor(token);
  if (!device || !(await rateLimit(`borne:${device.id}`, 200, 3600))) return;
  const admin = createAdminClient();
  const { data: shift } = await admin.from('shifts').select('id, agent_id, site_id, starts_at, ends_at')
    .eq('id', shiftId).eq('org_id', device.org_id).eq('site_id', device.site_id).eq('status', 'published').maybeSingle();
  if (!shift?.agent_id) return;
  const now = Date.now();
  if (now < new Date(shift.starts_at).getTime() - 2 * 3600_000 || now > new Date(shift.ends_at).getTime() + 2 * 3600_000) return;
  await admin.from('time_entries').insert({
    org_id: device.org_id, shift_id: shift.id, agent_id: shift.agent_id, site_id: shift.site_id, kind,
    method: 'shared_device', device_label: device.label,
  });
  if (kind === 'in') {
    await admin.from('alerts').update({ resolved_at: new Date().toISOString() }).eq('org_id', device.org_id).eq('kind', 'no_show').eq('ref_id', shift.id).is('resolved_at', null);
  }
  revalidatePath(`/borne/${token}`);
}

/**
 * Borne de pointage : téléphone ou tablette laissé sur le site (mode secours pour les agents
 * sans smartphone). Affiche les vacations du jour sur ce site uniquement : prénom et initiale.
 */
export default async function BornePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const device = await deviceFor(token);
  if (!device) notFound();
  const admin = createAdminClient();
  await admin.from('shared_devices').update({ last_seen_at: new Date().toISOString() }).eq('id', device.id);
  const today = parisDay(new Date());
  const { data: shifts } = await admin.from('shifts')
    .select('id, starts_at, ends_at, agent:agents(first_name, last_name), entries:time_entries(kind)')
    .eq('org_id', device.org_id).eq('site_id', device.site_id).eq('status', 'published').not('agent_id', 'is', null)
    .gte('starts_at', parisToUtc(addDays(today, -1), '18:00').toISOString()).lt('starts_at', parisToUtc(addDays(today, 1), '00:00').toISOString())
    .order('starts_at');
  const site = device.site as unknown as { name: string };

  return (
    <main className="mx-auto grid w-full max-w-lg gap-6 px-4 py-6">
      <header className="flex items-center justify-between"><Logo /><span className="text-sm text-muted-foreground">{device.label}</span></header>
      <h1 className="text-2xl font-bold">{site.name}</h1>
      {(shifts ?? []).length === 0 && <p className="rounded-2xl bg-muted p-5 text-lg">Aucune vacation prévue aujourd’hui sur ce site.</p>}
      <ul className="grid gap-3">
        {(shifts ?? []).map((s) => {
          const a = s.agent as unknown as { first_name: string; last_name: string };
          const kinds = new Set((s.entries as { kind: string }[]).map((e) => e.kind));
          return (
            <li key={s.id} className="grid gap-3 rounded-2xl border-2 border-border bg-card p-4">
              <p className="text-xl font-bold">{a.first_name} {a.last_name.charAt(0)}.</p>
              <p className="text-muted-foreground">{parisTime(new Date(s.starts_at))} – {parisTime(new Date(s.ends_at))}</p>
              <div className="grid grid-cols-2 gap-3">
                {(['in', 'out'] as const).map((kind) => kinds.has(kind) ? (
                  <span key={kind} className="flex min-h-16 items-center justify-center gap-2 rounded-xl bg-muted font-semibold"><CircleCheck className="size-6 text-accent" aria-hidden />{kind === 'in' ? 'Arrivée notée' : 'Départ noté'}</span>
                ) : (
                  <form key={kind} action={clockFromDevice}>
                    <input type="hidden" name="token" value={token} /><input type="hidden" name="shift_id" value={s.id} /><input type="hidden" name="kind" value={kind} />
                    <button disabled={kind === 'out' && !kinds.has('in')}
                      className={`flex min-h-16 w-full items-center justify-center gap-2 rounded-xl text-lg font-bold text-white disabled:opacity-40 ${kind === 'in' ? 'bg-accent' : 'bg-primary'}`}>
                      {kind === 'in' ? <LogIn className="size-6" aria-hidden /> : <LogOut className="size-6" aria-hidden />}{kind === 'in' ? 'J’arrive' : 'Je pars'}
                    </button>
                  </form>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
