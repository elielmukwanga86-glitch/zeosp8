import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import type { FormState } from '@/lib/validation/auth';

const LIMITS: Record<string, string> = {
  PLAN_LIMIT_AGENTS: 'Vous avez atteint le nombre d’agents actifs de votre forfait.',
  PLAN_LIMIT_SITES: 'Vous avez atteint le nombre de sites de votre forfait.',
};

/** Affiche le résultat d'une action ; les limites de forfait proposent le passage au forfait supérieur. */
export function FormMessage({ state }: { state: FormState }) {
  if (state.error && LIMITS[state.error]) {
    return (
      <Alert variant="warning" className="flex flex-wrap items-center gap-2">
        {LIMITS[state.error]}
        <Link href="/app/entreprise" className="font-semibold underline">Passer au forfait supérieur</Link>
      </Alert>
    );
  }
  if (state.error) return <Alert variant="error">{state.error}</Alert>;
  if (state.ok && state.message) return <Alert variant="success">{state.message}</Alert>;
  return null;
}
