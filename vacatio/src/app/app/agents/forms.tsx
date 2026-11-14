'use client';
import { useActionState } from 'react';
import { MessageSquare } from 'lucide-react';
import { ActionForm } from '@/components/action-form';
import { FormMessage } from '@/components/form-message';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/form-controls';
import { SubmitButton } from '@/components/ui/submit-button';
import { DAYS, DOC_TYPES } from '@/lib/validation/operations';
import { addAvailabilityAction, addDocumentAction, createAgentAction, sendAccessLinkAction, updateAgentAction } from './actions';
import { AgentFields, type AgentValues } from './agent-fields';

export function NewAgentForm() {
  return (
    <ActionForm action={createAgentAction} submitLabel="Créer l’agent" className="grid gap-4 sm:grid-cols-2">
      {(e) => <AgentFields e={e} />}
    </ActionForm>
  );
}

export function EditAgentForm({ id, values }: { id: string; values: AgentValues }) {
  return (
    <ActionForm action={updateAgentAction} submitLabel="Enregistrer" className="grid gap-4 sm:grid-cols-2">
      {(e) => <><input type="hidden" name="id" value={id} /><AgentFields e={e} v={values} /></>}
    </ActionForm>
  );
}

export function SendLinkButton({ id }: { id: string }) {
  const [state, action] = useActionState(sendAccessLinkAction, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="accent" pendingLabel="Envoi…"><MessageSquare aria-hidden />Envoyer le lien de connexion par SMS</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function AvailabilityForm({ agentId }: { agentId: string }) {
  return (
    <ActionForm action={addAvailabilityAction} submitLabel="Ajouter" resetOnSuccess className="grid gap-3 sm:grid-cols-3">
      {(e) => (<><input type="hidden" name="agent_id" value={agentId} />
        <fieldset className="grid gap-1.5 sm:col-span-3"><legend className="text-sm font-medium">Jours</legend>
          <div className="flex flex-wrap gap-2">{DAYS.map((d) => (
            <label key={d.v} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10">
              <input type="checkbox" name="days[]" value={d.v} className="accent-[--color-primary]" />{d.l}</label>))}</div>
          {e.days && <p className="text-xs font-medium text-destructive">{e.days}</p>}
        </fieldset>
        <Field label="De" name="start_time" type="time" required error={e.start_time} />
        <Field label="À" name="end_time" type="time" required error={e.end_time} /></>)}
    </ActionForm>
  );
}

export function DocumentForm({ agentId }: { agentId: string }) {
  return (
    <ActionForm action={addDocumentAction} submitLabel="Ajouter le document" resetOnSuccess className="grid gap-3 sm:grid-cols-2">
      {(e) => (<><input type="hidden" name="agent_id" value={agentId} />
        <Select label="Type" name="doc_type" defaultValue="contrat">{Object.entries(DOC_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
        <Field label="Libellé" name="label" />
        <Field label="Date d’expiration" name="expires_on" type="date" error={e.expires_on} hint="Alerte 30 jours avant." />
        <Field label="Fichier (PDF ou photo, 10 Mo max.)" name="file" type="file" accept="application/pdf,image/*" error={e.file} /></>)}
    </ActionForm>
  );
}
