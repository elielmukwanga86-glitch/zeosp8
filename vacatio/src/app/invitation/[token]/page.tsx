import type { Metadata } from 'next';
import Link from 'next/link';
import { getUser } from '@/lib/auth/context';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AcceptForm } from './form';

export const metadata: Metadata = { title: 'Invitation', robots: { index: false } };

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getUser();
  const suite = encodeURIComponent(`/invitation/${token}`);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-12">
      <Logo />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Vous êtes invité sur Vacatio</CardTitle>
          <CardDescription>
            {user ? `Connecté en tant que ${user.email}. L’invitation doit correspondre à cette adresse.` : 'Connectez-vous ou créez un compte avec l’adresse e-mail qui a reçu l’invitation.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {user ? <AcceptForm token={token} /> : (
            <>
              <Button asChild><Link href={`/connexion?suite=${suite}`}>J’ai déjà un compte</Link></Button>
              <Button asChild variant="outline"><Link href={`/inscription?suite=${suite}`}>Créer mon compte</Link></Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
