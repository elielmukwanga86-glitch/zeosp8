'use client';
import { useActionState } from 'react';
import { FormMessage } from '@/components/form-message';
import { SubmitButton } from '@/components/ui/submit-button';
import { manualClockAction } from './actions';

export function ManualClock({ shiftId, kind, defaultTime }: { shiftId: string; kind: 'in' | 'out'; defaultTime: string }) {
  const [state, action] = useActionState(manualClockAction, {});
  if (state.ok) return <span className="text-xs font-semibold text-accent-ink">Saisi</span>;
  return (
    <form action={action} className="flex flex-wrap items-center gap-1">
      <input type="hidden" name="shift_id" value={shiftId} /><input type="hidden" name="kind" value={kind} />
      <input type="time" name="time" defaultValue={defaultTime} aria-label={kind === 'in' ? 'Heure d’arrivée' : 'Heure de départ'}
        className="h-8 rounded-md border border-input bg-card px-2 text-xs" />
      <SubmitButton size="sm" variant="outline">Saisir</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
