import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isPlatformAdmin } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { Logo } from '@/components/logo';

export const metadata: Metadata = { title: 'Super-admin', robots: { index: false } };

/** Super-admin (F10) — version minimale. MRR, utilisation et « se connecter en tant que » en phase 5. */
export default async function AdminPage() {
  if (!(await isPlatformAdmin())) notFound();
  const supabase = await createClient();
  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('id, name, plan, subscription_status, trial_ends_at, is_demo, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8">
      <Logo />
      <h1 className="text-2xl font-bold">Entreprises clientes ({orgs?.length ?? 0})</h1>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-start">
            <tr><th className="p-3 text-start">Entreprise</th><th className="p-3 text-start">Forfait</th><th className="p-3 text-start">Statut</th><th className="p-3 text-start">Fin d’essai</th><th className="p-3 text-start">Création</th></tr>
          </thead>
          <tbody>
            {(orgs ?? []).map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="p-3 font-medium">{o.name}{o.is_demo && ' (démo)'}</td>
                <td className="p-3">{o.plan}</td>
                <td className="p-3">{o.subscription_status}</td>
                <td className="p-3">{o.trial_ends_at ? formatDate(o.trial_ends_at) : '—'}</td>
                <td className="p-3">{formatDate(o.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
