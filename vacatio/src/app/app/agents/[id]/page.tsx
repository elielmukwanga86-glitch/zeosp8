import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { DeleteButton } from '@/components/delete-button';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { daysUntil, formatDate } from '@/lib/utils';
import { DAYS, DOC_TYPES } from '@/lib/validation/operations';
import { deleteAgentItemAction, openDocumentAction, setAgentStatusAction } from '../actions';
import { AvailabilityForm, DocumentForm, EditAgentForm, SendLinkButton } from '../forms';

export const metadata: Metadata = { title: 'Agent' };

export default async function AgentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erreur?: string }> }) {
  const { id } = await params;
  const { erreur } = await searchParams;
  const ctx = await requireRole('gerant', 'chef_equipe');
  const gerant = ctx.role === 'gerant';
  const supabase = await createClient();
  const { data: agent } = await supabase.from('agents').select('*').eq('id', id).eq('org_id', ctx.org.id).maybeSingle();
  if (!agent) notFound();
  const [{ data: dispo }, { data: docs }, { data: sites }] = await Promise.all([
    supabase.from('agent_availabilities').select('id, day_of_week, start_time, end_time').eq('agent_id', id).order('day_of_week').order('start_time'),
    gerant ? supabase.from('agent_documents').select('id, doc_type, label, expires_on, file_path').eq('agent_id', id).order('expires_on') : Promise.resolve({ data: [] }),
    supabase.from('agent_usual_sites').select('site:sites(id, name)').eq('agent_id', id),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader title={`${agent.first_name} ${agent.last_name}`} back={{ href: '/app/agents', label: 'Agents' }}
        description={<>{String(agent.weekly_contract_hours).replace('.', ',')} h / semaine · {agent.user_id ? 'application activée' : 'application non activée'}</>}
        actions={gerant && (
          <form action={setAgentStatusAction} className="flex items-center gap-2">
            <input type="hidden" name="id" value={id} />
            <select name="status" defaultValue={agent.status} aria-label="Statut" className="h-9 rounded-lg border border-input bg-card px-2 text-sm">
              <option value="active">Actif</option><option value="inactive">Inactif</option><option value="left">Sorti des effectifs</option>
            </select>
            <button className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-semibold">Changer</button>
          </form>
        )} />
      {erreur && <Alert variant="error">{erreur === 'PLAN_LIMIT_AGENTS' ? 'Limite d’agents actifs atteinte pour votre forfait.' : erreur}</Alert>}

      <Card>
        <CardHeader><CardTitle>Accès à l’application</CardTitle>
          <CardDescription>L’agent reçoit un lien par SMS, sans mot de passe ni installation. Il peut aussi en redemander un sur la page de connexion agent.</CardDescription></CardHeader>
        <CardContent><SendLinkButton id={id} /></CardContent>
      </Card>

      {gerant && <Card><CardHeader><CardTitle>Fiche et contrat</CardTitle></CardHeader><CardContent><EditAgentForm id={id} values={agent} /></CardContent></Card>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Disponibilités</CardTitle><CardDescription>Sans disponibilité saisie, l’agent est considéré disponible à tout moment.</CardDescription></CardHeader>
          <CardContent className="grid gap-3">
            <ul className="grid gap-1 text-sm">
              {(dispo ?? []).map((d) => (
                <li key={d.id} className="flex items-center gap-2"><span className="w-10 font-medium">{DAYS[d.day_of_week - 1]?.l}</span>
                  {d.start_time.slice(0, 5)} – {d.end_time.slice(0, 5)}
                  {gerant && <span className="ms-auto"><DeleteButton action={deleteAgentItemAction} fields={{ table: 'agent_availabilities', id: d.id, agent_id: id }} /></span>}</li>
              ))}
            </ul>
            {gerant && <AvailabilityForm agentId={id} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Sites habituels</CardTitle></CardHeader>
          <CardContent>
            <ul className="grid gap-1 text-sm">
              {(sites ?? []).map((s) => { const site = s.site as unknown as { id: string; name: string };
                return <li key={site.id}><Link className="text-primary underline" href={`/app/sites/${site.id}`}>{site.name}</Link></li>; })}
              {(sites ?? []).length === 0 && <li className="text-muted-foreground">Aucun. Ajoutez-les depuis la fiche d’un site.</li>}
            </ul>
          </CardContent>
        </Card>
      </div>

      {gerant && (
        <Card>
          <CardHeader><CardTitle>Documents RH</CardTitle><CardDescription>Stockés de façon privée. Alerte 30 jours avant expiration.</CardDescription></CardHeader>
          <CardContent className="grid gap-4">
            <ul className="divide-y divide-border text-sm">
              {(docs ?? []).map((d) => {
                const left = d.expires_on ? daysUntil(d.expires_on) : null;
                return (
                  <li key={d.id} className="flex flex-wrap items-center gap-3 py-2">
                    <span className="font-medium">{DOC_TYPES[d.doc_type]}</span>{d.label && <span>{d.label}</span>}
                    {d.expires_on && <Badge variant={left! < 0 ? 'destructive' : left! <= 30 ? 'warning' : 'muted'}>
                      {left! < 0 ? 'expiré le' : 'expire le'} {formatDate(d.expires_on)}</Badge>}
                    {d.file_path && <form action={openDocumentAction}><input type="hidden" name="id" value={d.id} /><button className="text-primary underline">Ouvrir</button></form>}
                    <span className="ms-auto"><DeleteButton action={deleteAgentItemAction} fields={{ table: 'agent_documents', id: d.id, agent_id: id }} /></span>
                  </li>
                );
              })}
            </ul>
            <DocumentForm agentId={id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
