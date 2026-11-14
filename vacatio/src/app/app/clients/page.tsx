import type { Metadata } from 'next';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { requireRole } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, EmptyState } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NewClientForm } from './new-client';

export const metadata: Metadata = { title: 'Clients et sites' };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const ctx = await requireRole('gerant', 'chef_equipe');
  const { q } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from('clients').select('id, name, kind, billing_city, sites(id, name, archived_at)')
    .eq('org_id', ctx.org.id).is('archived_at', null).order('name').limit(200);
  if (q) query = query.ilike('name', `%${q.replace(/[%_]/g, '')}%`);
  const { data: clients, error } = await query;
  if (error) throw new Error(error.message);

  return (
    <div className="grid gap-6">
      <PageHeader title="Clients et sites" description="Coordonnées, consignes, cahier des charges, heures vendues et prix." />
      <form className="flex max-w-md gap-2" role="search">
        <input name="q" defaultValue={q} placeholder="Rechercher un client" aria-label="Rechercher un client"
          className="h-10 flex-1 rounded-lg border border-input bg-card px-3 text-sm" />
        <button className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-semibold">Rechercher</button>
      </form>
      {(clients ?? []).length === 0 ? (
        <EmptyState title={q ? 'Aucun client trouvé' : 'Aucun client pour l’instant'}>Créez votre premier client ci-dessous, puis ses sites.</EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(clients ?? []).map((c) => {
            const sites = (c.sites as { id: string; name: string; archived_at: string | null }[]).filter((s) => !s.archived_at);
            return (
              <li key={c.id}>
                <Link href={`/app/clients/${c.id}`} className="grid h-full gap-2 rounded-xl border border-border bg-card p-4 hover:border-primary">
                  <span className="font-semibold">{c.name}</span>
                  <span className="text-sm text-muted-foreground">{c.billing_city ?? '—'}</span>
                  <span className="inline-flex items-center gap-1 text-sm"><Building2 className="size-4" aria-hidden />{sites.length} site{sites.length > 1 ? 's' : ''}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {ctx.role === 'gerant' && (
        <Card>
          <CardHeader><CardTitle>Nouveau client</CardTitle></CardHeader>
          <CardContent><NewClientForm /></CardContent>
        </Card>
      )}
    </div>
  );
}
