'use client';
import { useActionState } from 'react';
import { inviteMember } from './actions';
import { Field } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/ui/submit-button';
import { Alert } from '@/components/ui/alert';

export function InviteForm() {
  const [state, action] = useActionState(inviteMember, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
      <Field label="E-mail" name="email" type="email" required error={state.fieldErrors?.email} />
      <div className="grid gap-1.5">
        <Label htmlFor="role">Rôle</Label>
        <select id="role" name="role" className="h-10 rounded-lg border border-input bg-card px-3 text-sm">
          <option value="chef_equipe">Chef d’équipe</option>
          <option value="gerant">Gérant</option>
        </select>
      </div>
      <SubmitButton pendingLabel="Envoi…">Inviter</SubmitButton>
      {state.error && <Alert variant="error" className="sm:col-span-3">{state.error}</Alert>}
      {state.ok && <Alert variant="success" className="sm:col-span-3">{state.message}</Alert>}
    </form>
  );
}
