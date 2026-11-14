'use client';
import { useActionState } from 'react';
import { forgotPassword } from '../actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { Alert } from '@/components/ui/alert';

export default function MotDePasseOubliePage() {
  const [state, action] = useActionState(forgotPassword, {});
  return (
    <Card>
      <CardHeader><CardTitle>Mot de passe oublié</CardTitle></CardHeader>
      <CardContent>
        {state.ok ? <Alert variant="success">{state.message}</Alert> : (
          <form action={action} className="grid gap-4" noValidate>
            {state.error && <Alert variant="error">{state.error}</Alert>}
            <Field label="E-mail" name="email" type="email" autoComplete="email" required error={state.fieldErrors?.email} />
            <SubmitButton pendingLabel="Envoi…">Recevoir un lien</SubmitButton>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
