'use client';
import { useActionState } from 'react';
import { resetPassword } from '../actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { Alert } from '@/components/ui/alert';

export default function ReinitialiserPage() {
  const [state, action] = useActionState(resetPassword, {});
  return (
    <Card>
      <CardHeader><CardTitle>Nouveau mot de passe</CardTitle></CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4" noValidate>
          {state.error && <Alert variant="error">{state.error}</Alert>}
          <Field label="Nouveau mot de passe" name="password" type="password" autoComplete="new-password" required error={state.fieldErrors?.password} />
          <Field label="Confirmation" name="confirm" type="password" autoComplete="new-password" required error={state.fieldErrors?.confirm} />
          <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
