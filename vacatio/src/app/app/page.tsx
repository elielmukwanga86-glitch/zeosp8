import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Circle } from 'lucide-react';
import { requireContext } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { addDays, parisDay, parisToUtc, nowMs } from '@/lib/dates';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Tableau de bord' };

const ALERT_LINK: Record<string, string> = {
  no_show: '/app/pointages', uncovered_absence: '/app/absences', document_expiring: '/app/agents',
};

/**
 * Tableau de bord. Phase 2 : vacations du jour, non-pointages, vacations à pourvoir, alertes.
 * Réclamations, impayés, sites à perte et CA du mois arrivent avec les modules B et C (phases 3 et 4).
 */
export default async function DashboardPage() {
  const ctx = await requireContext();
  const supabase = await createClient();
  const today = parisDay(new Date());
  const dayStart = parisToUtc(today, '00:00').toISOString();
  const dayEnd = parisToUtc(addDays(today, 1), '00:00').toISOString();
  const [{ data: todayShifts }, { count: uncovered }, { data: alerts }] = await Promise.all([
    supabase.from('shifts').select('id, agent_id, starts_at, entries:time_entries(kind)').eq('org_id', ctx.org.id).eq('status', 'published').gte('starts_at', dayStart).lt('starts_at', dayEnd),
    supabase.from('shifts').select('id', { count: 'exact', head: true }).eq('org_id', ctx.org.id).is('agent_id', null).neq('status', 'cancelled')
      .gte('ends_at', new Date().toISOString()).lt('starts_at', parisToUtc(addDays(today, 7), '00:00').toISOString()),
    supabase.from('alerts').select('id, kind, severity, title, body, created_at').eq('org_id', ctx.org.id).is('resolved_at', null).order('created_at', { ascending: false }).limit(20),
  ]);
  const now = nowMs();
  const missing = (todayShifts ?? []).filter((s) => s.agent_id && now > new Date(s.starts_at).getTime() + 15 * 60_000 && !(s.entries as { kind: string }[]).some((e) => e.kind === 'in')).length;
  const kpis = [
    { label: 'Vacations aujourd’hui', value: (todayShifts ?? []).length, href: '/app/planning?vue=jour', tone: '' },
    { label: 'Non pointées (+15 min)', value: missing, href: '/app/pointages', tone: missing ? 'text-destructive' : '' },
    { label: 'À pourvoir (7 jours)', value: uncovered ?? 0, href: '/app/absences', tone: uncovered ? 'text-amber-800' : '' },
  ];
  const steps = [
    { key: 'entreprise', label: 'Compléter les informations de l’entreprise' },
    { key: 'sites', label: 'Ajouter vos clients et sites' },
    { key: 'agents', label: 'Ajouter vos agents' },
    { key: 'planning', label: 'Créer votre premier planning' },
    { key: 'invitations', label: 'Inviter vos agents' },
  ];
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bonjour</h1>
        <p className="text-muted-foreground">{ctx.org.name}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="grid gap-1 rounded-xl border border-border bg-card p-5 hover:border-primary">
            <span className={`text-4xl font-bold tabular-nums ${k.tone}`}>{k.value}</span>
            <span className="text-sm text-muted-foreground">{k.label}</span>
          </Link>
        ))}
      </div>

      {(alerts ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle>Alertes</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border text-sm">
              {(alerts ?? []).map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-2 py-2">
                  <Badge variant={a.severity === 'critical' ? 'destructive' : 'warning'}>{a.severity === 'critical' ? 'Urgent' : 'À traiter'}</Badge>
                  <Link href={ALERT_LINK[a.kind] ?? '/app'} className="font-medium underline-offset-2 hover:underline">{a.title}</Link>
                  {a.body && <span className="text-muted-foreground">{a.body}</span>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Démarrage</CardTitle>
          <CardDescription>Les étapes pour être opérationnel. L’assistant guidé complet arrive avec les modules suivants.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3">
            {steps.map((s) => {
              const done = Boolean(ctx.org.onboarding?.[s.key]);
              return (
                <li key={s.key} className="flex items-center gap-3">
                  {done ? <CheckCircle2 className="size-5 text-accent" aria-hidden /> : <Circle className="size-5 text-muted-foreground" aria-hidden />}
                  <span className={done ? 'text-muted-foreground line-through' : ''}>{s.label}</span>
                  <span className="sr-only">{done ? '(fait)' : '(à faire)'}</span>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
