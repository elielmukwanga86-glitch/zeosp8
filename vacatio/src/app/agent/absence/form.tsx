'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { Baby, CircleCheck, HelpCircle, Thermometer } from 'lucide-react';
import type { AgentDictionary } from '@/i18n/agent';
import { SubmitButton } from '@/components/ui/submit-button';
import { declareAbsenceAction } from '../actions';

export function AbsenceForm({ t, today }: { t: AgentDictionary; today: string }) {
  const [state, action] = useActionState(declareAbsenceAction, {});
  if (state.status === 'ok') {
    return (
      <div className="grid justify-items-center gap-4 text-center" role="status">
        <CircleCheck className="size-24 text-accent" aria-hidden />
        <p className="text-2xl font-bold">{t.absenceSent}</p>
        <Link href="/agent" className="rounded-2xl border-2 border-border px-6 py-4 text-lg font-semibold">{t.back}</Link>
      </div>
    );
  }
  const reasons = [
    { v: 'maladie', l: t.reasonSick, icon: Thermometer },
    { v: 'evenement_familial', l: t.reasonFamily, icon: Baby },
    { v: 'autre', l: t.reasonOther, icon: HelpCircle },
  ];
  return (
    <form action={action} className="grid gap-5">
      <h1 className="text-2xl font-bold">{t.absenceTitle}</h1>
      <fieldset className="grid grid-cols-3 gap-2">
        {reasons.map(({ v, l, icon: Icon }, i) => (
          <label key={v} className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card p-2 text-center font-semibold has-[:checked]:border-primary has-[:checked]:bg-primary/10">
            <input type="radio" name="reason" value={v} defaultChecked={i === 0} className="sr-only" />
            <Icon className="size-8" aria-hidden />{l}
          </label>
        ))}
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-lg font-semibold">{t.fromDay}
          <input type="date" name="start_day" defaultValue={today} min={today} required className="h-14 rounded-xl border-2 border-input bg-card px-3 text-lg" /></label>
        <label className="grid gap-1 text-lg font-semibold">{t.toDay}
          <input type="date" name="end_day" defaultValue={today} min={today} required className="h-14 rounded-xl border-2 border-input bg-card px-3 text-lg" /></label>
      </div>
      <label className="grid gap-2 font-semibold">{t.proof}
        <input type="file" name="proof" accept="image/*" capture="environment" className="text-sm" /></label>
      {state.status === 'error' && <p className="font-semibold text-destructive" role="alert">{t.error}</p>}
      <SubmitButton size="xl">{t.send}</SubmitButton>
      <Link href="/agent" className="text-center font-semibold underline">{t.back}</Link>
    </form>
  );
}
