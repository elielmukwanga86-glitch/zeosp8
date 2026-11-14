import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SignInForm } from './form';

export const metadata: Metadata = { title: 'Connexion', robots: { index: false } };

export default async function ConnexionPage({ searchParams }: { searchParams: Promise<{ suite?: string; erreur?: string }> }) {
  const { suite, erreur } = await searchParams;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connexion</CardTitle>
        <CardDescription>Espace gérant et chef d’équipe.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <SignInForm suite={suite} erreur={erreur} />
        <p className="text-center text-sm text-muted-foreground">
          Pas encore de compte ? <Link className="font-semibold text-primary underline" href="/inscription">Essai gratuit 14 jours</Link>
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Vous êtes agent ? <Link className="font-semibold text-primary underline" href="/agent/connexion">Connexion par SMS</Link>
        </p>
      </CardContent>
    </Card>
  );
}
