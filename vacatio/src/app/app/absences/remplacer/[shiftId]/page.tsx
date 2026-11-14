import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { formatDayLabel, parisDay, parisTime } from '@/lib/dates';
import { suggererRemplacants, type CandidatInput } from '@/lib/planning/remplacants';
import { loadRules, toVacation } from '@/lib/planning/server';
import { PageHeader, EmptyState } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CandidateActions } from '../../forms';

export const metadata: Metadata = { title: 'Trouver un remplaçant' };

const OFFER: Record<string, string> = { proposed: 'En attente', accepted: 'Acceptée', declined: 'Refusée', expired: 'Expirée', cancelled: 'Annulée' };

export default async function RemplacerPage({ params }: { params: Promise<{ shiftId: string }> }) {
  const { shiftId } = await params;
  const ctx = await requireRole('gerant', 'chef_equipe');
  const supabase = await createClient();
  const { data: shift } = await supabase.from('shifts').select('id, agent_id, site_id, starts_at, ends_at, break_minutes, site:sites(name, latitude, longitude)')
    .eq('id', shiftId).eq('org_id', ctx.org.id).maybeSingle();
  if (!shift) notFound();
  const site = shift.site as unknown as { name: string; latitude: number | null; longitude: number | null };
  const start = new Date(shift.starts_at); const end = new Date(shift.ends_at);
  const from = new Date(start.getTime() - 8 * 86400000).toISOString();
  const to = new Date(start.getTime() + 8 * 86400000).toISOString();

  const [agentsRes, shiftsRes, absRes, dispoRes, usualRes, offersRes, rules] = await Promise.all([
    supabase.from('agents').select('id, first_name, last_name, phone, weekly_contract_hours, home_latitude, home_longitude').eq('org_id', ctx.org.id).eq('status', 'active'),
    supabase.from('shifts').select('id, agent_id, starts_at, ends_at, break_minutes').eq('org_id', ctx.org.id).neq('status', 'cancelled').not('agent_id', 'is', null).gte('starts_at', from).lte('starts_at', to),
    supabase.from('absences').select('agent_id').eq('org_id', ctx.org.id).in('status', ['declared', 'approved']).lt('starts_at', shift.ends_at).gt('ends_at', shift.starts_at),
    supabase.from('agent_availabilities').select('agent_id, day_of_week, start_time, end_time').eq('org_id', ctx.org.id),
    supabase.from('agent_usual_sites').select('agent_id, site_id').eq('org_id', ctx.org.id),
    supabase.from('replacement_offers').select('id, status, created_at, candidate:agents(first_name, last_name)').eq('shift_id', shiftId).order('created_at', { ascending: false }),
    loadRules(supabase, ctx.org.id),
  ]);
  const absent = new Set((absRes.data ?? []).map((a) => a.agent_id));
  const phones = new Map((agentsRes.data ?? []).map((a) => [a.id, Boolean(a.phone)]));
  const candidats: CandidatInput[] = (agentsRes.data ?? []).map((a) => ({
    id: a.id, nom: `${a.first_name} ${a.last_name}`, weeklyContractHours: Number(a.weekly_contract_hours),
    homeLatitude: a.home_latitude, homeLongitude: a.home_longitude,
    sitesHabituels: (usualRes.data ?? []).filter((u) => u.agent_id === a.id).map((u) => u.site_id),
    vacations: (shiftsRes.data ?? []).filter((s) => s.agent_id === a.id && s.id !== shiftId).map(toVacation),
    absent: absent.has(a.id),
    disponibilites: (dispoRes.data ?? []).filter((d) => d.agent_id === a.id).map((d) => ({ dayOfWeek: d.day_of_week, start: d.start_time.slice(0, 5), end: d.end_time.slice(0, 5) })),
  }));
  const suggestions = suggererRemplacants(
    { id: shift.id, start, end, breakMinutes: shift.break_minutes, siteId: shift.site_id, siteLatitude: site.latitude, siteLongitude: site.longitude },
    candidats, rules, 8);

  return (
    <div className="grid gap-6">
      <PageHeader title="Trouver un remplaçant" back={{ href: '/app/absences', label: 'Absences' }}
        description={<span className="capitalize">{formatDayLabel(parisDay(start))} · {parisTime(start)} – {parisTime(end)} · {site.name}</span>} />
      {shift.agent_id && <Badge variant="accent">Vacation pourvue</Badge>}

      <Card>
        <CardHeader><CardTitle>Agents suggérés</CardTitle>
          <CardDescription>Disponibles, non absents, sans chevauchement et conformes (repos, durées, coupures, heures complémentaires). Classés par site habituel, proximité et heures restantes.</CardDescription></CardHeader>
        <CardContent>
          {suggestions.length === 0 ? <EmptyState title="Aucun agent disponible et conforme">Élargissez les disponibilités ou faites appel à un extra.</EmptyState> : (
            <ul className="divide-y divide-border">
              {suggestions.map((s) => (
                <li key={s.agentId} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="grid gap-1">
                    <span className="font-semibold">{s.nom}</span>
                    <span className="flex flex-wrap gap-1">{s.raisons.map((r) => <Badge key={r} variant="muted">{r}</Badge>)}
                      {s.alertes.map((a, i) => <Badge key={i} variant="warning">{a.message}</Badge>)}</span>
                  </div>
                  {!shift.agent_id && <CandidateActions shiftId={shift.id} agentId={s.agentId} hasPhone={phones.get(s.agentId) ?? false} />}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {(offersRes.data ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle>Propositions envoyées</CardTitle></CardHeader>
          <CardContent>
            <ul className="grid gap-1 text-sm">
              {(offersRes.data ?? []).map((o) => { const c = o.candidate as unknown as { first_name: string; last_name: string };
                return <li key={o.id} className="flex gap-2"><span className="font-medium">{c.first_name} {c.last_name}</span><Badge variant={o.status === 'accepted' ? 'accent' : 'muted'}>{OFFER[o.status]}</Badge></li>; })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
