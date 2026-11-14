import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SignUpForm } from './form';

export const metadata: Metadata = { title: 'Essai gratuit 14 jours' };

export default async function InscriptionPage({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const { suite } = await searchParams;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Créer votre compte entreprise</CardTitle>
        <CardDescription>Opérationnel en moins de 30 minutes.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <SignUpForm suite={suite} />
        <p className="text-center text-sm text-muted-foreground">
          Déjà inscrit ? <Link className="font-semibold text-primary underline" href="/connexion">Se connecter</Link>
        </p>
      </CardContent>
    </Card>
  );
}
