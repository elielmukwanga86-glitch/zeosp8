import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { QrCode } from 'lucide-react';
import { requireRole } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { DeleteButton } from '@/components/delete-button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { DAYS } from '@/lib/validation/operations';
import { addCheckpointAction, addUsualAgentAction, archiveSiteAction, deleteSiteItemAction } from '../actions';
import { AccessCodeForm, AreaForm, ContractForm, ScheduleForm, SharedDeviceForm, SiteInfoForm, TaskForm, type SiteValues } from './forms';

export const metadata: Metadata = { title: 'Site' };

const eur = (cents: number | null) => (cents === null ? '—' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100));
const hm = (t: string) => t.slice(0, 5);

export default async function SitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireRole('gerant', 'chef_equipe');
  const gerant = ctx.role === 'gerant';
  const supabase = await createClient();
  const { data: site } = await supabase.from('sites').select('*, client:clients(id, name)').eq('id', id).eq('org_id', ctx.org.id).maybeSingle();
  if (!site) notFound();

  const [codes, areas, tasks, contracts, checkpoints, devices, usual, agents, zones] = await Promise.all([
    supabase.from('site_access_codes').select('id, label, secret').eq('site_id', id).order('label'),
    supabase.from('site_areas').select('id, name').eq('site_id', id).order('position').order('name'),
    supabase.from('site_tasks').select('id, label, frequency, area_id').eq('site_id', id).order('position'),
    // Contrats et prix : gérant uniquement (RLS) ; le chef obtient une liste vide.
    supabase.from('service_contracts').select('*, schedules:contract_schedules(*)').eq('site_id', id).order('starts_on', { ascending: false }),
    supabase.from('site_checkpoints').select('id, label, nfc_uid, active').eq('site_id', id).eq('active', true).order('created_at'),
    supabase.from('shared_devices').select('id, label, last_seen_at').eq('site_id', id).is('revoked_at', null),
    supabase.from('agent_usual_sites').select('agent:agents(id, first_name, last_name)').eq('site_id', id),
    supabase.from('agents').select('id, first_name, last_name').eq('org_id', ctx.org.id).eq('status', 'active').order('last_name'),
    supabase.from('zones').select('id, name').eq('org_id', ctx.org.id).order('name'),
  ]);
  const agentList = (agents.data ?? []).map((a) => ({ id: a.id, name: `${a.first_name} ${a.last_name}` }));
  const agentName = new Map(agentList.map((a) => [a.id, a.name]));
  const client = site.client as unknown as { id: string; name: string };
  const areaName = new Map((areas.data ?? []).map((a) => [a.id, a.name]));

  return (
    <div className="grid gap-6">
      <PageHeader title={site.name} back={{ href: `/app/clients/${client.id}`, label: client.name }}
        description={[site.address_line1, site.postal_code, site.city].filter(Boolean).join(' ') || undefined}
        actions={gerant && !site.archived_at && <DeleteButton action={archiveSiteAction} fields={{ id }} label="Archiver le site" />} />
      {site.archived_at && <Badge variant="warning">Site archivé</Badge>}

      <Card>
        <CardHeader><CardTitle>Informations et consignes</CardTitle></CardHeader>
        <CardContent><SiteInfoForm site={site as SiteValues} zones={zones.data ?? []} canChangeZone={gerant} /></CardContent>
      </Card>

      {gerant ? (
        <Card>
          <CardHeader>
            <CardTitle>Contrats et créneaux récurrents</CardTitle>
            <CardDescription>Les créneaux génèrent automatiquement les vacations du planning (bouton « Générer » du planning).</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {((contracts.data ?? []) as ContractRow[]).map((c) => (
              <div key={c.id} className="grid gap-3 rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-semibold">{c.reference || 'Contrat'}</span>
                  <span>du {formatDate(c.starts_on)}{c.ends_on ? ` au ${formatDate(c.ends_on)}` : ''}</span>
                  <Badge variant="muted">{c.pricing_mode === 'hourly' ? `${eur(c.hourly_price_cents)} HT / h` : `${eur(c.monthly_price_cents)} HT / mois`}</Badge>
                  {c.hours_sold_per_month !== null && <Badge variant="muted">{String(c.hours_sold_per_month).replace('.', ',')} h vendues / mois</Badge>}
                  <span className="ms-auto"><DeleteButton action={deleteSiteItemAction} fields={{ table: 'service_contracts', id: c.id, site_id: id }} /></span>
                </div>
                <ul className="grid gap-1 text-sm">
                  {c.schedules.sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)).map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center gap-2">
                      <span className="w-10 font-medium">{DAYS[s.day_of_week - 1]?.l}</span>
                      <span>{hm(s.start_time)} – {hm(s.end_time)}</span>
                      {s.agents_needed > 1 && <Badge variant="muted">{s.agents_needed} agents</Badge>}
                      {s.week_parity !== 'all' && <Badge variant="muted">semaines {s.week_parity === 'even' ? 'paires' : 'impaires'}</Badge>}
                      <span className="text-muted-foreground">{s.default_agent_id ? agentName.get(s.default_agent_id) : 'à pourvoir'}</span>
                      <span className="ms-auto"><DeleteButton action={deleteSiteItemAction} fields={{ table: 'contract_schedules', id: s.id, site_id: id }} /></span>
                    </li>
                  ))}
                </ul>
                <details><summary className="cursor-pointer text-sm font-semibold text-primary">Ajouter un créneau</summary>
                  <div className="pt-3"><ScheduleForm siteId={id} contractId={c.id} agents={agentList} /></div></details>
              </div>
            ))}
            <details className="rounded-lg border border-dashed border-border p-4"><summary className="cursor-pointer font-semibold">Nouveau contrat</summary>
              <div className="pt-4"><ContractForm siteId={id} /></div></details>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>Cahier des charges</CardTitle><CardDescription>Zones du site et tâches avec leur fréquence.</CardDescription></CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            {(areas.data ?? []).map((a) => (
              <span key={a.id} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm">{a.name}
                <DeleteButton action={deleteSiteItemAction} fields={{ table: 'site_areas', id: a.id, site_id: id }} label="×" /></span>
            ))}
          </div>
          <AreaForm siteId={id} />
          <ul className="divide-y divide-border text-sm">
            {(tasks.data ?? []).map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 py-2">
                <Badge variant="muted">{t.area_id ? areaName.get(t.area_id) : 'Tout le site'}</Badge>
                <span>{t.label}</span><span className="text-muted-foreground">· {t.frequency}</span>
                <span className="ms-auto"><DeleteButton action={deleteSiteItemAction} fields={{ table: 'site_tasks', id: t.id, site_id: id }} /></span>
              </li>
            ))}
          </ul>
          <TaskForm siteId={id} areas={areas.data ?? []} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Codes d’accès</CardTitle><CardDescription>Visibles par l’agent uniquement pendant sa vacation sur ce site.</CardDescription></CardHeader>
          <CardContent className="grid gap-3">
            <ul className="grid gap-1 text-sm">
              {(codes.data ?? []).map((c) => (
                <li key={c.id} className="flex items-center gap-2"><span className="font-medium">{c.label}</span>
                  <code className="rounded bg-muted px-2">{c.secret}</code>
                  <span className="ms-auto"><DeleteButton action={deleteSiteItemAction} fields={{ table: 'site_access_codes', id: c.id, site_id: id }} /></span></li>
              ))}
            </ul>
            <AccessCodeForm siteId={id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pointage</CardTitle><CardDescription>QR code à afficher sur site (ou étiquette NFC avec le même lien). Sans smartphone : borne partagée ou saisie par le chef d’équipe.</CardDescription></CardHeader>
          <CardContent className="grid gap-4">
            <ul className="grid gap-2">
              {(checkpoints.data ?? []).map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-3 text-sm">
                  <QrCode className="size-4" aria-hidden /><span className="font-medium">{c.label}</span>
                  <Link className="font-semibold text-primary underline" href={`/app/sites/${id}/qr/${c.id}`}>Imprimer le QR code</Link>
                  <span className="ms-auto"><DeleteButton action={deleteSiteItemAction} fields={{ table: 'site_checkpoints', id: c.id, site_id: id }} label="Désactiver" /></span>
                </li>
              ))}
            </ul>
            <form action={addCheckpointAction} className="flex flex-wrap gap-2">
              <input type="hidden" name="site_id" value={id} />
              <input name="label" placeholder="Entrée principale" aria-label="Emplacement du QR code" className="h-10 flex-1 rounded-lg border border-input bg-card px-3 text-sm" />
              <button className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white">Créer un QR code</button>
            </form>
            <ul className="grid gap-1 text-sm">
              {(devices.data ?? []).map((d) => (
                <li key={d.id} className="flex items-center gap-2"><span className="font-medium">Borne : {d.label}</span>
                  <span className="text-muted-foreground">{d.last_seen_at ? `vue le ${formatDate(d.last_seen_at)}` : 'jamais utilisée'}</span>
                  <span className="ms-auto"><DeleteButton action={deleteSiteItemAction} fields={{ table: 'shared_devices', id: d.id, site_id: id }} label="Révoquer" /></span></li>
              ))}
            </ul>
            <SharedDeviceForm siteId={id} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Agents habituels</CardTitle><CardDescription>Prioritaires dans les suggestions de remplacement.</CardDescription></CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            {(usual.data ?? []).map((u) => {
              const a = u.agent as unknown as { id: string; first_name: string; last_name: string };
              return (
                <span key={a.id} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm">{a.first_name} {a.last_name}
                  {gerant && <DeleteButton action={deleteSiteItemAction} fields={{ table: 'agent_usual_sites', id: a.id, site_id: id }} label="×" />}</span>
              );
            })}
          </div>
          {gerant && (
            <form action={addUsualAgentAction} className="flex flex-wrap gap-2">
              <input type="hidden" name="site_id" value={id} />
              <select name="agent_id" aria-label="Agent" className="h-10 rounded-lg border border-input bg-card px-3 text-sm">
                {agentList.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <button className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-semibold">Ajouter</button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface ContractRow {
  id: string; reference: string | null; starts_on: string; ends_on: string | null; pricing_mode: string;
  hourly_price_cents: number | null; monthly_price_cents: number | null; hours_sold_per_month: number | null;
  schedules: { id: string; day_of_week: number; start_time: string; end_time: string; agents_needed: number; week_parity: string; default_agent_id: string | null }[];
}
