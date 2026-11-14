'use client';
import { useActionState } from 'react';
import { acceptInvitation } from './actions';
import { SubmitButton } from '@/components/ui/submit-button';
import { Alert } from '@/components/ui/alert';

export function AcceptForm({ token }: { token: string }) {
  const [state, action] = useActionState(acceptInvitation, {});
  return (
    <form action={action} className="grid gap-4">
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <input type="hidden" name="token" value={token} />
      <SubmitButton pendingLabel="Validation…">Rejoindre l’entreprise</SubmitButton>
    </form>
  );
}
