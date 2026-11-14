import type { Metadata } from 'next';
import { CheckCircle2, Circle } from 'lucide-react';
import { requireContext } from '@/lib/auth/context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Tableau de bord' };

/**
 * Tableau de bord provisoire. Les indicateurs (interventions du jour, absences non couvertes,
 * non-pointages, réclamations, impayés, sites à perte, CA du mois) arrivent en phase 3 (module E).
 */
export default async function DashboardPage() {
  const ctx = await requireContext();
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
