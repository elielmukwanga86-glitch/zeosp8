import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { requireRole } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { addDays, formatDayLabel, parisDay, parisTime, parisToUtc, nowMs } from '@/lib/dates';
import { PageHeader, EmptyState } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ManualClock } from './manual-form';

export const metadata: Metadata = { title: 'Pointages' };

const METHOD: Record<string, string> = { qr: 'QR', nfc: 'NFC', manual_chef: 'Saisie chef', shared_device: 'Borne', gps_only: 'GPS' };
interface Entry { kind: 'in' | 'out'; occurred_at: string; method: string; flagged: boolean; flag_reason: string | null }

export default async function PointagesPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const ctx = await requireRole('gerant', 'chef_equipe');
  const sp = await searchParams;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? '') ? sp.date! : parisDay(new Date());
  const supabase = await createClient();
  const { data: shifts, error } = await supabase.from('shifts')
    .select('id, starts_at, ends_at, agent:agents(first_name, last_name), site:sites(name), entries:time_entries(kind, occurred_at, method, flagged, flag_reason)')
    .eq('org_id', ctx.org.id).eq('status', 'published').not('agent_id', 'is', null)
    .gte('starts_at', parisToUtc(day, '00:00').toISOString()).lt('starts_at', parisToUtc(addDays(day, 1), '00:00').toISOString())
    .order('starts_at');
  if (error) throw new Error(error.message);
  const now = nowMs();

  const rows = (shifts ?? []).map((s) => {
    const entries = s.entries as Entry[];
    const inE = entries.find((e) => e.kind === 'in'); const outE = entries.find((e) => e.kind === 'out');
    const start = new Date(s.starts_at).getTime(); const end = new Date(s.ends_at).getTime();
    const status = inE ? (outE ? 'terminé' : 'présent') : now > start + 15 * 60_000 ? 'non pointé' : 'à venir';
    const late = inE ? Math.round((new Date(inE.occurred_at).getTime() - start) / 60_000) : 0;
    return { s, inE, outE, status, late, ended: now > end };
  });
  const missing = rows.filter((r) => r.status === 'non pointé').length;

  return (
    <div className="grid gap-6">
      <PageHeader title="Pointages" description={`${rows.length} vacation(s) · ${missing} non pointée(s). La position n’est enregistrée qu’au moment du pointage.`}
        actions={<>
          <Button asChild variant="outline" size="icon" aria-label="Jour précédent"><Link href={`/app/pointages?date=${addDays(day, -1)}`}><ChevronLeft /></Link></Button>
          <span className="self-center text-sm font-semibold capitalize">{formatDayLabel(day)}</span>
          <Button asChild variant="outline" size="icon" aria-label="Jour suivant"><Link href={`/app/pointages?date=${addDays(day, 1)}`}><ChevronRight /></Link></Button>
        </>} />
      {rows.length === 0 ? <EmptyState title="Aucune vacation publiée ce jour" /> : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted"><tr>
              <th className="p-3 text-start">Prévu</th><th className="p-3 text-start">Agent</th><th className="p-3 text-start">Site</th>
              <th className="p-3 text-start">Arrivée</th><th className="p-3 text-start">Départ</th><th className="p-3 text-start">État</th>
            </tr></thead>
            <tbody>
              {rows.map(({ s, inE, outE, status, late, ended }) => {
                const a = s.agent as unknown as { first_name: string; last_name: string };
                const flagged = [inE, outE].filter((e) => e?.flagged);
                return (
                  <tr key={s.id} className="border-t border-border align-top">
                    <td className="p-3 whitespace-nowrap">{parisTime(new Date(s.starts_at))} – {parisTime(new Date(s.ends_at))}</td>
                    <td className="p-3 font-medium">{a.first_name} {a.last_name}</td>
                    <td className="p-3">{(s.site as unknown as { name: string }).name}</td>
                    <td className="p-3">{inE ? <span>{parisTime(new Date(inE.occurred_at))} <Badge variant="muted">{METHOD[inE.method]}</Badge>{late > 5 && <Badge variant="warning" className="ms-1">+{late} min</Badge>}</span>
                      : <ManualClock shiftId={s.id} kind="in" defaultTime={parisTime(new Date(s.starts_at))} />}</td>
                    <td className="p-3">{outE ? <span>{parisTime(new Date(outE.occurred_at))} <Badge variant="muted">{METHOD[outE.method]}</Badge></span>
                      : inE && ended ? <ManualClock shiftId={s.id} kind="out" defaultTime={parisTime(new Date(s.ends_at))} /> : '—'}</td>
                    <td className="p-3">
                      <Badge variant={status === 'non pointé' ? 'destructive' : status === 'à venir' ? 'muted' : 'accent'}>{status}</Badge>
                      {flagged.map((e, i) => <p key={i} className="mt-1 text-xs text-amber-800">{e!.flag_reason}</p>)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
