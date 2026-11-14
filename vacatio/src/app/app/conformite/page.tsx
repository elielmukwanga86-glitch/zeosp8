import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { LIBELLES_REGLES, REGLES_PAR_DEFAUT, type ReglesConformite } from '@/config/conformite/regles';
import { addDays, formatDayLabel, mondayOf, parisDay, parisToUtc } from '@/lib/dates';
import { controlerPlanning, type Violation } from '@/lib/planning/conformite';
import { loadRules, toVacation } from '@/lib/planning/server';
import { PageHeader, EmptyState } from '@/components/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RulesForm } from './form';

export const metadata: Metadata = { title: 'Conformité' };

export default async function ConformitePage() {
  const ctx = await requireRole('gerant');
  const supabase = await createClient();
  const rules = await loadRules(supabase, ctx.org.id);
  const monday = mondayOf(parisDay(new Date()));
  const [{ data: agents }, { data: shifts }] = await Promise.all([
    supabase.from('agents').select('id, first_name, last_name, weekly_contract_hours').eq('org_id', ctx.org.id).eq('status', 'active'),
    supabase.from('shifts').select('id, agent_id, starts_at, ends_at, break_minutes').eq('org_id', ctx.org.id).neq('status', 'cancelled')
      .not('agent_id', 'is', null).gte('starts_at', parisToUtc(addDays(monday, -7), '00:00').toISOString()).lt('starts_at', parisToUtc(addDays(monday, 14), '00:00').toISOString()),
  ]);
  const startOfCheck = parisToUtc(monday, '00:00');
  const issues: { agent: string; agentId: string; v: Violation }[] = [];
  for (const a of agents ?? []) {
    const own = (shifts ?? []).filter((s) => s.agent_id === a.id).map(toVacation);
    for (const v of controlerPlanning(own, { weeklyContractHours: Number(a.weekly_contract_hours) }, rules)) {
      const concerned = own.filter((s) => v.vacations.includes(s.id));
      if (concerned.length && concerned.every((s) => s.start < startOfCheck)) continue; // semaine passée
      issues.push({ agent: `${a.first_name} ${a.last_name}`, agentId: a.id, v });
    }
  }
  const numeric = (Object.keys(LIBELLES_REGLES) as (keyof ReglesConformite)[]).filter((k) => k !== 'dureeMaxCoupureHeures');
  const fields: { key: string; label: string; placeholder: string; value: string }[] = numeric.map((k) => ({
    key: k, label: LIBELLES_REGLES[k]!, placeholder: String(REGLES_PAR_DEFAUT[k]),
    value: rules[k] !== REGLES_PAR_DEFAUT[k] ? String(rules[k]) : '',
  }));
  fields.push({ key: 'dureeMaxCoupureHeures', label: LIBELLES_REGLES.dureeMaxCoupureHeures!, placeholder: 'pas de contrôle', value: rules.dureeMaxCoupureHeures === null ? '' : String(rules.dureeMaxCoupureHeures) });
  const c16 = rules.coupures.find((c) => c.contratHebdoMin === 16)?.maxCoupures ?? 2;
  const c0 = rules.coupures.find((c) => c.contratHebdoMin === 0)?.maxCoupures ?? 1;

  return (
    <div className="grid gap-6">
      <PageHeader title="Conformité" description="Code du travail et convention collective de la propreté (IDCC 3043) appliqués à chaque affectation." />

      <Card>
        <CardHeader><CardTitle>Points à corriger (cette semaine et la suivante)</CardTitle></CardHeader>
        <CardContent>
          {issues.length === 0 ? <EmptyState title="Aucune non-conformité détectée" /> : (
            <ul className="divide-y divide-border text-sm">
              {issues.map(({ agent, v }, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 py-2">
                  <Badge variant={v.severite === 'bloquant' ? 'destructive' : 'warning'}>{v.severite === 'bloquant' ? 'Non conforme' : 'Alerte'}</Badge>
                  <span className="font-medium">{agent}</span>
                  <span>{v.message}</span>
                  {v.jour && <Link className="ms-auto text-primary underline capitalize" href={`/app/planning?vue=jour&date=${v.jour}`}>{formatDayLabel(v.jour)}</Link>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Règles appliquées</CardTitle>
          <CardDescription>Champ vide = valeur par défaut (indiquée en grisé). Valeurs par défaut et sources : fichier <code>src/config/conformite/regles.ts</code>.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Alert variant="warning">
            Les limites de coupures, d’heures complémentaires et de durée de coupure dépendent des avenants de la convention collective.
            Faites-les valider par votre expert-comptable ou votre juriste avant de vous y fier.
          </Alert>
          <RulesForm fields={fields} coupures={[c16, c0]} />
        </CardContent>
      </Card>
    </div>
  );
}
