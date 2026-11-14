import { nowMs } from '@/lib/dates';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { effectivePlan, PLANS } from '@/config/plans';
import { PageHeader, EmptyState } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CONTRACT_TYPES } from '@/lib/validation/operations';
import { NewAgentForm } from './forms';

export const metadata: Metadata = { title: 'Agents' };

export default async function AgentsPage({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  const ctx = await requireRole('gerant', 'chef_equipe');
  const { statut = 'active' } = await searchParams;
  const supabase = await createClient();
  const [{ data: agents, error }, { data: expiring }] = await Promise.all([
    supabase.from('agents').select('id, first_name, last_name, phone, contract_type, weekly_contract_hours, user_id, status')
      .eq('org_id', ctx.org.id).eq('status', statut === 'tous' ? 'active' : statut).order('last_name').limit(500),
    supabase.from('agent_documents').select('agent_id').eq('org_id', ctx.org.id).lte('expires_on', new Date(nowMs() + 30 * 86400000).toISOString().slice(0, 10)),
  ]);
  if (error) throw new Error(error.message);
  const docAlert = new Set((expiring ?? []).map((d) => d.agent_id));
  const limit = PLANS[effectivePlan(ctx.org)].limits.agents;
  const activeCount = statut === 'active' ? (agents ?? []).length : null;

  return (
    <div className="grid gap-6">
      <PageHeader title="Agents" description={activeCount !== null && limit !== null ? `${activeCount} / ${limit} agents actifs inclus dans votre forfait` : undefined} />
      <nav className="flex gap-2 text-sm" aria-label="Filtrer par statut">
        {[['active', 'Actifs'], ['inactive', 'Inactifs'], ['left', 'Sortis']].map(([v, l]) => (
          <Link key={v} href={`/app/agents?statut=${v}`} aria-current={statut === v ? 'page' : undefined}
            className="rounded-full border border-border px-3 py-1 aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:text-white">{l}</Link>
        ))}
      </nav>
      {(agents ?? []).length === 0 ? <EmptyState title="Aucun agent" /> : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted"><tr>
              <th className="p-3 text-start">Nom</th><th className="p-3 text-start">Mobile</th><th className="p-3 text-start">Contrat</th>
              <th className="p-3 text-start">Heures / sem.</th><th className="p-3 text-start">Accès appli</th><th className="p-3 text-start">Documents</th>
            </tr></thead>
            <tbody>
              {(agents ?? []).map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="p-3"><Link href={`/app/agents/${a.id}`} className="font-medium text-primary underline-offset-2 hover:underline">{a.last_name} {a.first_name}</Link></td>
                  <td className="p-3">{a.phone ?? '—'}</td>
                  <td className="p-3">{CONTRACT_TYPES[a.contract_type]}</td>
                  <td className="p-3">{String(a.weekly_contract_hours).replace('.', ',')} h</td>
                  <td className="p-3">{a.user_id ? <Badge variant="accent">Activé</Badge> : <Badge variant="muted">Non activé</Badge>}</td>
                  <td className="p-3">{docAlert.has(a.id) ? <Badge variant="warning">À renouveler</Badge> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {ctx.role === 'gerant' && (
        <Card><CardHeader><CardTitle>Nouvel agent</CardTitle></CardHeader><CardContent><NewAgentForm /></CardContent></Card>
      )}
    </div>
  );
}
