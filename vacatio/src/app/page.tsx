import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';

/** Accueil provisoire : le site vitrine complet (F1) est livré en phase 5. */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-8 px-4 py-16">
      <Logo />
      <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">Chaque vacation couverte, chaque heure facturée.</h1>
      <p className="text-lg text-muted-foreground">
        Planning, pointage, remplacements, contrôles qualité et facturation pour les sociétés de propreté de 3 à 50 agents.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg" variant="accent"><Link href="/inscription">Essai gratuit 14 jours</Link></Button>
        <Button asChild size="lg" variant="outline"><Link href="/connexion">Se connecter</Link></Button>
      </div>
      <p className="text-sm text-muted-foreground">Agent de propreté ? <Link className="font-semibold text-primary underline" href="/agent/connexion">Recevoir mon lien par SMS</Link></p>
    </main>
  );
}
