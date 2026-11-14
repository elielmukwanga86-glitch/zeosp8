'use client';
import { useActionState } from 'react';
import { updateOrganization } from './actions';
import { Field } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { Alert } from '@/components/ui/alert';

export type OrgFormValues = Record<'name' | 'legal_name' | 'legal_form' | 'siret' | 'vat_number' | 'rcs_city' | 'address_line1' | 'postal_code' | 'city' | 'phone' | 'email', string | null>;

export function OrganizationForm({ values }: { values: OrgFormValues }) {
  const [state, action] = useActionState(updateOrganization, {});
  const f = (name: keyof OrgFormValues, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <Field label={label} name={name} defaultValue={values[name] ?? ''} error={state.fieldErrors?.[name]} {...extra} />
  );
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {f('name', 'Nom commercial', { required: true })}
      {f('legal_name', 'Raison sociale')}
      {f('legal_form', 'Forme juridique', { placeholder: 'SAS, SARL, EI…' })}
      {f('siret', 'SIRET', { inputMode: 'numeric' })}
      {f('vat_number', 'N° TVA intracommunautaire')}
      {f('rcs_city', 'Ville du RCS')}
      <div className="sm:col-span-2">{f('address_line1', 'Adresse')}</div>
      {f('postal_code', 'Code postal', { inputMode: 'numeric' })}
      {f('city', 'Ville')}
      {f('phone', 'Téléphone', { type: 'tel' })}
      {f('email', 'E-mail de contact', { type: 'email' })}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
        {state.ok && <Alert variant="success">{state.message}</Alert>}
        {state.error && <Alert variant="error">{state.error}</Alert>}
      </div>
    </form>
  );
}
