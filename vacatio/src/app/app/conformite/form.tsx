'use client';
import { ActionForm } from '@/components/action-form';
import { Field } from '@/components/ui/field';
import { saveRulesAction } from './actions';

export function RulesForm({ fields, coupures }: { fields: { key: string; label: string; value: string; placeholder: string }[]; coupures: [number, number] }) {
  return (
    <ActionForm action={saveRulesAction} submitLabel="Enregistrer les règles" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {(e) => (<>
        {fields.map((f) => <Field key={f.key} label={f.label} name={f.key} inputMode="decimal" defaultValue={f.value} placeholder={f.placeholder} error={e[f.key]} />)}
        <Field label="Coupures max. / jour (contrat ≥ 16 h)" name="coupuresAuDela16" inputMode="numeric" defaultValue={String(coupures[0])} />
        <Field label="Coupures max. / jour (contrat < 16 h)" name="coupuresEnDessous16" inputMode="numeric" defaultValue={String(coupures[1])} />
      </>)}
    </ActionForm>
  );
}
