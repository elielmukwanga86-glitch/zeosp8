import Link from 'next/link';
import { requireRole } from '@/lib/auth/context';
import { effectivePlan, PLANS } from '@/config/plans';
import { ROLE_LABELS } from '@/config/roles';
import { daysUntil } from '@/lib/utils';
import { Sidebar } from './sidebar';
import { switchOrganization } from './actions';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Les agents n'ont pas accès au back-office : renvoyés vers /agent.
  const ctx = await requireRole('gerant', 'chef_equipe');
  const plan = effectivePlan(ctx.org);
  const trialDays = ctx.org.subscription_status === 'trialing' && ctx.org.trial_ends_at ? daysUntil(ctx.org.trial_ends_at) : null;

  const orgSwitcher = (
    <div className="rounded-lg bg-white/10 px-3 py-2 text-white">
      {ctx.memberships.length > 1 ? (
        <form action={switchOrganization} className="grid gap-1">
          <label htmlFor="orgId" className="text-xs text-white/60">Entreprise</label>
          <select id="orgId" name="orgId" defaultValue={ctx.org.id}
            className="rounded-md bg-primary px-2 py-1 text-sm font-semibold text-white">
            {ctx.memberships.map((m) => <option key={m.organization.id} value={m.organization.id}>{m.organization.name}</option>)}
          </select>
          <button className="text-start text-xs underline">Changer</button>
        </form>
      ) : (
        <p className="truncate text-sm font-semibold">{ctx.org.name}</p>
      )}
      <p className="mt-1 text-xs text-white/60">{ROLE_LABELS[ctx.role]} · {PLANS[plan].name}</p>
    </div>
  );

  return (
    <div className="lg:flex">
      <div className="contents print:hidden"><Sidebar role={ctx.role} plan={plan} orgSwitcher={orgSwitcher} /></div>
      <div className="min-w-0 flex-1">
        {ctx.org.is_demo && (
          <p className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900">Compte de démonstration : données fictives.</p>
        )}
        {trialDays !== null && trialDays >= 0 && (
          <p className="bg-accent/10 px-4 py-2 text-center text-sm text-accent-ink">
            Essai gratuit du forfait Pro : {trialDays <= 1 ? 'dernier jour' : `${trialDays} jours restants`}.
            {ctx.role === 'gerant' && <> <Link href="/app/entreprise" className="font-semibold underline">Choisir un forfait</Link></>}
          </p>
        )}
        <header className="flex items-center justify-end print:hidden gap-3 border-b border-border bg-card px-4 py-2 sm:px-8">
          <span className="truncate text-sm text-muted-foreground">{ctx.email}</span>
          <form action="/auth/deconnexion" method="post">
            <button className="rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-muted">Déconnexion</button>
          </form>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
