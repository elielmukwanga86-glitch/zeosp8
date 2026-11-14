'use client';
import { ActionForm } from '@/components/action-form';
import { Field } from '@/components/ui/field';
import { Checkbox, Select, Textarea } from '@/components/ui/form-controls';
import { addContactAction, createSiteAction, updateClientAction } from '../actions';
import { ClientFields, type ClientValues } from '../client-fields';

export function EditClientForm({ id, values }: { id: string; values: ClientValues }) {
  return (
    <ActionForm action={updateClientAction} submitLabel="Enregistrer" className="grid gap-4 sm:grid-cols-2">
      {(e) => <><input type="hidden" name="id" value={id} /><ClientFields e={e} v={values} /></>}
    </ActionForm>
  );
}

export function ContactForm({ clientId }: { clientId: string }) {
  return (
    <ActionForm action={addContactAction} submitLabel="Ajouter le contact" resetOnSuccess className="grid gap-4 sm:grid-cols-2">
      {(e) => (
        <>
          <input type="hidden" name="client_id" value={clientId} />
          <Field label="Nom" name="full_name" required error={e.full_name} />
          <Field label="Fonction" name="role" />
          <Field label="E-mail" name="email" type="email" error={e.email} />
          <Field label="Téléphone" name="phone" type="tel" />
          <Checkbox label="Reçoit les rapports de contrôle" name="receives_reports" defaultChecked />
          <Checkbox label="Reçoit les factures" name="receives_invoices" />
        </>
      )}
    </ActionForm>
  );
}

export function NewSiteForm({ clientId, zones }: { clientId: string; zones: { id: string; name: string }[] }) {
  return (
    <ActionForm action={createSiteAction} submitLabel="Créer le site" className="grid gap-4 sm:grid-cols-2">
      {(e) => (
        <>
          <input type="hidden" name="client_id" value={clientId} />
          <Field label="Nom du site" name="name" required error={e.name} placeholder="Ex. Siège — 3e étage" />
          <Select label="Zone (chef d’équipe)" name="zone_id" defaultValue="">
            <option value="">Aucune</option>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </Select>
          <Field label="Adresse" name="address_line1" error={e.address_line1} hint="Utilisée pour vérifier la position au pointage." />
          <div className="grid grid-cols-[8rem_1fr] gap-3">
            <Field label="Code postal" name="postal_code" inputMode="numeric" error={e.postal_code} />
            <Field label="Ville" name="city" error={e.city} />
          </div>
          <Textarea label="Consignes" name="instructions" className="sm:col-span-2" />
        </>
      )}
    </ActionForm>
  );
}
