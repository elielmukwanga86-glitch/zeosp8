'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { signUp } from '../actions';
import { Field } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { Alert } from '@/components/ui/alert';

export function SignUpForm({ suite }: { suite?: string }) {
  const invited = Boolean(suite?.startsWith('/invitation/'));
  const [state, action] = useActionState(signUp, {});
  if (state.ok) return <Alert variant="success">{state.message}</Alert>;
  return (
    <form action={action} className="grid gap-4" noValidate>
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <Field label="Votre nom" name="fullName" autoComplete="name" required error={state.fieldErrors?.fullName} />
      <input type="hidden" name="suite" value={suite ?? ''} />
      {!invited && <Field label="Nom de l’entreprise" name="companyName" autoComplete="organization" required error={state.fieldErrors?.companyName} />}
      <Field label="E-mail professionnel" name="email" type="email" autoComplete="email" required error={state.fieldErrors?.email} />
      <Field label="Mot de passe" name="password" type="password" autoComplete="new-password" required minLength={10}
        hint="10 caractères minimum." error={state.fieldErrors?.password} />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="acceptTerms" className="mt-0.5 size-4 accent-[--color-primary]" required />
        <span>J’accepte les <Link className="underline" href="/cgu">CGU/CGV</Link> et la <Link className="underline" href="/confidentialite">politique de confidentialité</Link>.</span>
      </label>
      {state.fieldErrors?.acceptTerms && <p className="text-xs font-medium text-destructive">{state.fieldErrors.acceptTerms}</p>}
      <SubmitButton variant="accent" pendingLabel="Création…">{invited ? 'Créer mon compte' : 'Démarrer mon essai gratuit'}</SubmitButton>
      {!invited && <p className="text-center text-xs text-muted-foreground">14 jours du forfait Pro, sans carte bancaire.</p>}
    </form>
  );
}
