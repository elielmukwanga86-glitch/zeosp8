import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { addDays, formatDayLabel, parisDay, parisTime, parisToUtc, nowMs } from '@/lib/dates';
import { PageHeader, EmptyState } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ABSENCE_REASONS } from '@/lib/validation/operations';
import { reviewAbsenceAction } from './actions';
import { DeclareAbsenceForm } from './forms';

export const metadata: Metadata = { title: 'Absences et remplacements' };

const STATUS: Record<string, { l: string; v: 'warning' | 'accent' | 'muted' | 'destructive' }> = {
  declared: { l: 'À valider', v: 'warning' }, approved: { l: 'Validée', v: 'accent' }, rejected: { l: 'Refusée', v: 'destructive' }, cancelled: { l: 'Annulée', v: 'muted' },
};

export default async function AbsencesPage() {
  const ctx = await requireRole('gerant', 'chef_equipe');
  const supabase = await createClient();
  const today = parisDay(new Date());
  const now = new Date().toISOString();
  const [{ data: open }, { data: absences }, { data: agents }] = await Promise.all([
    supabase.from('shifts').select('id, starts_at, ends_at, status, absence_id, site:sites(name), offers:replacement_offers(status)')
      .eq('org_id', ctx.org.id).is('agent_id', null).neq('status', 'cancelled').gte('ends_at', now)
      .lt('starts_at', parisToUtc(addDays(today, 15), '00:00').toISOString()).order('starts_at').limit(200),
    supabase.from('absences').select('id, starts_at, ends_at, reason, status, comment, agent:agents(first_name, last_name)')
      .eq('org_id', ctx.org.id).gte('ends_at', new Date(nowMs() - 7 * 86400000).toISOString()).order('starts_at').limit(200),
    supabase.from('agents').select('id, first_name, last_name').eq('org_id', ctx.org.id).eq('status', 'active').order('last_name'),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader title="Absences et remplacements" description="Chaque vacation non couverte est une prestation manquée : remplacez-la, les heures restent facturables." />

      <Card>
        <CardHeader><CardTitle>Vacations à pourvoir (15 prochains jours)</CardTitle></CardHeader>
        <CardContent>
          {(open ?? []).length === 0 ? <EmptyState title="Tout est couvert" /> : (
            <ul className="divide-y divide-border">
              {(open ?? []).map((s) => {
                const start = new Date(s.starts_at);
                const offers = s.offers as { status: string }[];
                const pending = offers.filter((o) => o.status === 'proposed').length;
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                    <span className="w-32 font-semibold capitalize">{formatDayLabel(parisDay(start))}</span>
                    <span>{parisTime(start)} – {parisTime(new Date(s.ends_at))}</span>
                    <span className="font-medium">{(s.site as unknown as { name: string }).name}</span>
                    {s.absence_id && <Badge variant="warning">Suite à absence</Badge>}
                    {s.status === 'draft' && <Badge variant="muted">Brouillon</Badge>}
                    {pending > 0 && <Badge variant="default">{pending} proposition{pending > 1 ? 's' : ''} en attente</Badge>}
                    <Link href={`/app/absences/remplacer/${s.id}`} className="ms-auto rounded-lg bg-primary px-3 py-1.5 font-semibold text-white">Trouver un remplaçant</Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Déclarer une absence</CardTitle><CardDescription>Les vacations de l’agent sur la période sont libérées et apparaissent ci-dessus.</CardDescription></CardHeader>
        <CardContent><DeclareAbsenceForm today={today} agents={(agents ?? []).map((a) => ({ id: a.id, name: `${a.last_name} ${a.first_name}` }))} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Absences en cours et à venir</CardTitle></CardHeader>
        <CardContent>
          {(absences ?? []).length === 0 ? <EmptyState title="Aucune absence" /> : (
            <ul className="divide-y divide-border text-sm">
              {(absences ?? []).map((a) => {
                const ag = a.agent as unknown as { first_name: string; last_name: string };
                const st = STATUS[a.status]!;
                return (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="font-medium">{ag.first_name} {ag.last_name}</span>
                    <span>{formatDayLabel(parisDay(new Date(a.starts_at)))} → {formatDayLabel(parisDay(new Date(new Date(a.ends_at).getTime() - 1)))}</span>
                    <Badge variant="muted">{ABSENCE_REASONS[a.reason]}</Badge>
                    <Badge variant={st.v}>{st.l}</Badge>
                    {a.comment && <span className="text-muted-foreground">{a.comment}</span>}
                    {ctx.role === 'gerant' && a.status === 'declared' && (
                      <span className="ms-auto flex gap-2">
                        {(['approved', 'rejected'] as const).map((s) => (
                          <form key={s} action={reviewAbsenceAction}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value={s} />
                            <button className={s === 'approved' ? 'font-semibold text-accent-ink underline' : 'font-semibold text-destructive underline'}>{s === 'approved' ? 'Valider' : 'Refuser'}</button></form>
                        ))}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
