'use client';
import { useActionState } from 'react';
import { createOrganization } from './actions';
import { Field } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { Alert } from '@/components/ui/alert';

export function CreateOrgForm({ defaultName }: { defaultName: string }) {
  const [state, action] = useActionState(createOrganization, {});
  return (
    <form action={action} className="grid gap-4">
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <Field label="Nom de l’entreprise" name="companyName" defaultValue={defaultName} required error={state.fieldErrors?.companyName} />
      <SubmitButton variant="accent" pendingLabel="Création…">Créer mon espace et démarrer l’essai</SubmitButton>
    </form>
  );
}
