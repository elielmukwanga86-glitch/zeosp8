'use client';
import { useActionState } from 'react';
import { ActionForm } from '@/components/action-form';
import { FormMessage } from '@/components/form-message';
import { Field } from '@/components/ui/field';
import { Select, Textarea } from '@/components/ui/form-controls';
import { SubmitButton } from '@/components/ui/submit-button';
import { ABSENCE_REASONS } from '@/lib/validation/operations';
import { assignReplacementAction, declareAbsenceAction, proposeReplacementAction } from './actions';

export function DeclareAbsenceForm({ agents, today }: { agents: { id: string; name: string }[]; today: string }) {
  return (
    <ActionForm action={declareAbsenceAction} submitLabel="Enregistrer l’absence" resetOnSuccess className="grid gap-4 sm:grid-cols-2">
      {(e) => (<>
        <Select label="Agent" name="agent_id" error={e.agent_id}>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
        <Select label="Motif" name="reason" defaultValue="maladie">{Object.entries(ABSENCE_REASONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
        <Field label="Du" name="start_day" type="date" defaultValue={today} required error={e.start_day} />
        <Field label="Au (inclus)" name="end_day" type="date" defaultValue={today} required error={e.end_day} />
        <Textarea label="Commentaire" name="comment" className="sm:col-span-2" />
      </>)}
    </ActionForm>
  );
}

export function CandidateActions({ shiftId, agentId, hasPhone }: { shiftId: string; agentId: string; hasPhone: boolean }) {
  const [proposeState, propose] = useActionState(proposeReplacementAction, {});
  const [assignState, assign] = useActionState(assignReplacementAction, {});
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={propose}>
        <input type="hidden" name="shift_id" value={shiftId} /><input type="hidden" name="agent_id" value={agentId} />
        <SubmitButton size="sm" variant="accent" disabled={!hasPhone} title={hasPhone ? undefined : 'Pas de numéro de mobile'}>Proposer par SMS</SubmitButton>
      </form>
      <form action={assign}>
        <input type="hidden" name="shift_id" value={shiftId} /><input type="hidden" name="agent_id" value={agentId} />
        <SubmitButton size="sm" variant="outline">Affecter directement</SubmitButton>
      </form>
      <FormMessage state={proposeState.error || proposeState.ok ? proposeState : assignState} />
    </div>
  );
}
