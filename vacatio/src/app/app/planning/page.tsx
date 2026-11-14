import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { addDays, mondayOf, parisDay, parisTime, parisToUtc } from '@/lib/dates';
import { controlerPlanning, type Violation } from '@/lib/planning/conformite';
import { loadRules, toVacation } from '@/lib/planning/server';
import { PlanningBoard, type BoardShift } from './board';

export const metadata: Metadata = { title: 'Planning' };

type View = 'jour' | 'semaine' | 'mois';

function rangeFor(view: View, date: string) {
  if (view === 'jour') return { from: date, to: date };
  if (view === 'semaine') { const m = mondayOf(date); return { from: m, to: addDays(m, 6) }; }
  const first = `${date.slice(0, 7)}-01`;
  const from = mondayOf(first);
  const [y, m] = first.split('-').map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { from, to: addDays(mondayOf(last), 6) };
}

export default async function PlanningPage({ searchParams }: { searchParams: Promise<{ vue?: string; par?: string; date?: string }> }) {
  const ctx = await requireRole('gerant', 'chef_equipe');
  const sp = await searchParams;
  const view: View = sp.vue === 'jour' || sp.vue === 'mois' ? sp.vue : 'semaine';
  const by = sp.par === 'site' ? 'site' : 'agent';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? '') ? sp.date! : parisDay(new Date());
  const { from, to } = rangeFor(view, date);
  const fromUtc = parisToUtc(from, '00:00').toISOString();
  const toUtc = parisToUtc(addDays(to, 1), '00:00').toISOString();
  // Une semaine de contexte avant la période pour le repos et les heures de la semaine.
  const contextFrom = parisToUtc(addDays(from, -7), '00:00').toISOString();

  const supabase = await createClient();
  const [shiftsRes, agentsRes, sitesRes, absencesRes, entriesRes, rules] = await Promise.all([
    supabase.from('shifts').select('id, site_id, agent_id, starts_at, ends_at, break_minutes, status, source, notes, billable, absence_id')
      .eq('org_id', ctx.org.id).neq('status', 'cancelled').gte('starts_at', contextFrom).lt('starts_at', toUtc).order('starts_at').limit(5000),
    supabase.from('agents').select('id, first_name, last_name, weekly_contract_hours').eq('org_id', ctx.org.id).eq('status', 'active').order('last_name'),
    supabase.from('sites').select('id, name').eq('org_id', ctx.org.id).is('archived_at', null).order('name'),
    supabase.from('absences').select('agent_id, starts_at, ends_at').eq('org_id', ctx.org.id).in('status', ['declared', 'approved']).lt('starts_at', toUtc).gt('ends_at', fromUtc),
    supabase.from('time_entries').select('shift_id, kind').eq('org_id', ctx.org.id).gte('occurred_at', fromUtc).lt('occurred_at', toUtc),
    loadRules(supabase, ctx.org.id),
  ]);
  if (shiftsRes.error) throw new Error(shiftsRes.error.message);
  const all = shiftsRes.data ?? [];
  const agents = (agentsRes.data ?? []).map((a) => ({ id: a.id, name: `${a.first_name} ${a.last_name}`, weekly: Number(a.weekly_contract_hours) }));
  const agentName = new Map(agents.map((a) => [a.id, a.name]));
  const sites = sitesRes.data ?? [];
  const siteName = new Map(sites.map((s) => [s.id, s.name]));

  // Conformité recalculée en direct pour chaque agent.
  const violations = new Map<string, Violation[]>();
  for (const a of agents) {
    const own = all.filter((s) => s.agent_id === a.id).map(toVacation);
    if (own.length === 0) continue;
    for (const v of controlerPlanning(own, { weeklyContractHours: a.weekly }, rules)) {
      for (const id of v.vacations) violations.set(id, [...(violations.get(id) ?? []), v]);
    }
  }
  const clocked = new Set((entriesRes.data ?? []).filter((e) => e.kind === 'in').map((e) => e.shift_id));

  const shifts: BoardShift[] = all.filter((s) => s.starts_at >= fromUtc).map((s) => {
    const start = new Date(s.starts_at); const end = new Date(s.ends_at);
    return {
      id: s.id, siteId: s.site_id, siteName: siteName.get(s.site_id) ?? 'Site archivé', agentId: s.agent_id,
      agentName: s.agent_id ? agentName.get(s.agent_id) ?? 'Agent inactif' : null,
      day: parisDay(start), start: parisTime(start), end: parisTime(end), breakMinutes: s.break_minutes,
      hours: (end.getTime() - start.getTime()) / 3_600_000 - s.break_minutes / 60,
      status: s.status as 'draft' | 'published', source: s.source, notes: s.notes, billable: s.billable,
      replacement: Boolean(s.absence_id), clockedIn: clocked.has(s.id),
      violations: (violations.get(s.id) ?? []).map((v) => ({ message: v.message, severite: v.severite })),
    };
  });

  const absentDays: Record<string, string[]> = {};
  for (const a of absencesRes.data ?? []) {
    let d = parisDay(new Date(a.starts_at));
    const last = parisDay(new Date(new Date(a.ends_at).getTime() - 1));
    while (d <= last && d <= to) { (absentDays[a.agent_id] ??= []).push(d); d = addDays(d, 1); }
  }

  const days: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);

  return (
    <PlanningBoard view={view} by={by} date={date} from={from} to={to} days={days} shifts={shifts}
      agents={agents} sites={sites} absentDays={absentDays} isGerant={ctx.role === 'gerant'} today={parisDay(new Date())} />
  );
}
