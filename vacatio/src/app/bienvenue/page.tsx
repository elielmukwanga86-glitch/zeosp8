import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getMemberships, getUser } from '@/lib/auth/context';
import { homeForRole } from '@/config/roles';
import { Logo } from '@/components/logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateOrgForm } from './form';

export const metadata: Metadata = { title: 'Bienvenue', robots: { index: false } };

export default async function BienvenuePage() {
  const user = await getUser();
  if (!user) redirect('/connexion');
  const memberships = await getMemberships();
  if (memberships[0]) redirect(homeForRole(memberships[0].role));
  const companyName = typeof user.user_metadata.company_name === 'string' ? user.user_metadata.company_name : '';

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-12">
      <Logo />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Bienvenue sur Vacatio</CardTitle>
          <CardDescription>Votre adresse est confirmée. Dernière étape : créer l’espace de votre entreprise. Vous bénéficiez de 14 jours du forfait Pro, sans carte bancaire.</CardDescription>
        </CardHeader>
        <CardContent><CreateOrgForm defaultName={companyName} /></CardContent>
      </Card>
    </main>
  );
}
