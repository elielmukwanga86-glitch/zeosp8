'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { signIn } from '../actions';
import { Field } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { Alert } from '@/components/ui/alert';

export function SignInForm({ suite, erreur }: { suite?: string; erreur?: string }) {
  const [state, action] = useActionState(signIn, {});
  return (
    <form action={action} className="grid gap-4" noValidate>
      {erreur === 'lien' && <Alert variant="error">Ce lien est invalide ou a expiré. Connectez-vous ou demandez un nouveau lien.</Alert>}
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <input type="hidden" name="suite" value={suite ?? ''} />
      <Field label="E-mail" name="email" type="email" autoComplete="email" required error={state.fieldErrors?.email} />
      <Field label="Mot de passe" name="password" type="password" autoComplete="current-password" required error={state.fieldErrors?.password} />
      <div className="text-right text-sm"><Link className="text-primary underline" href="/mot-de-passe-oublie">Mot de passe oublié ?</Link></div>
      <SubmitButton pendingLabel="Connexion…">Se connecter</SubmitButton>
    </form>
  );
}
