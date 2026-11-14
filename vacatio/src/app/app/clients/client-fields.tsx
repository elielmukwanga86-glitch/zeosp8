import { Field } from '@/components/ui/field';
import { Select, Textarea } from '@/components/ui/form-controls';

export interface ClientValues {
  name?: string; kind?: string; siret?: string | null; vat_number?: string | null; billing_email?: string | null;
  billing_address?: string | null; billing_postal_code?: string | null; billing_city?: string | null;
  payment_terms_days?: number | null; notes?: string | null;
}

export function ClientFields({ e, v = {} }: { e: Record<string, string | undefined>; v?: ClientValues }) {
  return (
    <>
      <Field label="Nom" name="name" required defaultValue={v.name} error={e.name} />
      <Select label="Type" name="kind" defaultValue={v.kind ?? 'entreprise'}>
        <option value="entreprise">Entreprise</option><option value="copropriete">Copropriété / syndic</option>
        <option value="collectivite">Collectivité</option><option value="particulier">Particulier</option><option value="autre">Autre</option>
      </Select>
      <Field label="SIRET" name="siret" inputMode="numeric" defaultValue={v.siret ?? ''} error={e.siret} />
      <Field label="N° TVA" name="vat_number" defaultValue={v.vat_number ?? ''} error={e.vat_number} />
      <Field label="E-mail de facturation" name="billing_email" type="email" defaultValue={v.billing_email ?? ''} error={e.billing_email} />
      <Field label="Délai de paiement (jours)" name="payment_terms_days" inputMode="numeric" defaultValue={v.payment_terms_days ?? ''} error={e.payment_terms_days} />
      <Field label="Adresse de facturation" name="billing_address" defaultValue={v.billing_address ?? ''} error={e.billing_address} />
      <div className="grid grid-cols-[8rem_1fr] gap-3">
        <Field label="Code postal" name="billing_postal_code" inputMode="numeric" defaultValue={v.billing_postal_code ?? ''} error={e.billing_postal_code} />
        <Field label="Ville" name="billing_city" defaultValue={v.billing_city ?? ''} error={e.billing_city} />
      </div>
      <Textarea label="Notes" name="notes" defaultValue={v.notes ?? ''} className="sm:col-span-2" />
    </>
  );
}
