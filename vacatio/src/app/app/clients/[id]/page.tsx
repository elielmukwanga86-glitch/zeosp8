import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { requireRole } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, EmptyState } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { archiveClientAction, deleteContactAction } from '../actions';
import { ContactForm, EditClientForm, NewSiteForm } from './forms';

export const metadata: Metadata = { title: 'Client' };

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireRole('gerant', 'chef_equipe');
  const supabase = await createClient();
  const [{ data: client }, { data: contacts }, { data: sites }, { data: zones }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).eq('org_id', ctx.org.id).maybeSingle(),
    supabase.from('client_contacts').select('*').eq('client_id', id).order('full_name'),
    supabase.from('sites').select('id, name, address_line1, city, latitude').eq('client_id', id).is('archived_at', null).order('name'),
    supabase.from('zones').select('id, name').eq('org_id', ctx.org.id).order('name'),
  ]);
  if (!client) notFound();
  const gerant = ctx.role === 'gerant';

  return (
    <div className="grid gap-6">
      <PageHeader title={client.name} back={{ href: '/app/clients', label: 'Clients' }}
        actions={gerant && (
          <form action={archiveClientAction}><input type="hidden" name="id" value={id} />
            <button className="rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-red-50">Archiver le client</button>
          </form>
        )} />

      <Card>
        <CardHeader><CardTitle>Sites</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          {(sites ?? []).length === 0 ? <EmptyState title="Aucun site" /> : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {(sites ?? []).map((s) => (
                <li key={s.id}>
                  <Link href={`/app/sites/${s.id}`} className="flex items-start gap-3 rounded-lg border border-border p-3 hover:border-primary">
                    <MapPin className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
                    <span className="grid">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-sm text-muted-foreground">{[s.address_line1, s.city].filter(Boolean).join(', ') || 'Adresse à compléter'}</span>
                      {s.latitude === null && s.address_line1 && <span className="text-xs text-amber-800">Adresse non localisée : contrôle de distance désactivé</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {gerant && <details className="rounded-lg border border-border p-4"><summary className="cursor-pointer font-semibold">Ajouter un site</summary>
            <div className="pt-4"><NewSiteForm clientId={id} zones={zones ?? []} /></div></details>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Contacts</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <ul className="divide-y divide-border">
            {(contacts ?? []).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <span className="font-medium">{c.full_name}</span>
                {c.role && <span className="text-muted-foreground">{c.role}</span>}
                {c.email && <a className="underline" href={`mailto:${c.email}`}>{c.email}</a>}
                {c.phone && <a className="underline" href={`tel:${c.phone}`}>{c.phone}</a>}
                {gerant && <form action={deleteContactAction} className="ms-auto"><input type="hidden" name="id" value={c.id} /><input type="hidden" name="client_id" value={id} />
                  <button className="text-destructive underline">Supprimer</button></form>}
              </li>
            ))}
          </ul>
          {gerant && <details className="rounded-lg border border-border p-4"><summary className="cursor-pointer font-semibold">Ajouter un contact</summary>
            <div className="pt-4"><ContactForm clientId={id} /></div></details>}
        </CardContent>
      </Card>

      {gerant && (
        <Card>
          <CardHeader><CardTitle>Informations du client</CardTitle></CardHeader>
          <CardContent><EditClientForm id={id} values={client} /></CardContent>
        </Card>
      )}
    </div>
  );
}
