'use client';
import { useActionState } from 'react';
import { MessageSquareText, Smartphone } from 'lucide-react';
import { requestAgentLink } from './actions';
import type { AgentDictionary } from '@/i18n/agent';
import { SubmitButton } from '@/components/ui/submit-button';
import { Alert } from '@/components/ui/alert';

export function AgentLinkForm({ t, expired }: { t: AgentDictionary; expired: boolean }) {
  const [state, action] = useActionState(requestAgentLink, {});
  if (state.status === 'sent') {
    return (
      <div className="grid justify-items-center gap-4 text-center">
        <MessageSquareText className="size-16 text-accent" aria-hidden />
        <p className="text-lg font-semibold">{t.linkSent}</p>
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-5">
      {expired && <Alert variant="warning">{t.linkExpired}</Alert>}
      {state.status === 'too_many' && <Alert variant="error">{t.tooMany}</Alert>}
      <label htmlFor="phone" className="flex items-center gap-2 text-lg font-semibold">
        <Smartphone className="size-6" aria-hidden /> {t.phone}
      </label>
      <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="06 12 34 56 78" dir="ltr"
        aria-invalid={state.status === 'invalid' || undefined}
        className="h-16 w-full min-w-0 rounded-2xl border-2 border-input bg-card px-4 text-2xl tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      {state.status === 'invalid' && <p className="font-semibold text-destructive">{t.invalidPhone}</p>}
      <SubmitButton size="xl" variant="accent">{t.sendLink}</SubmitButton>
    </form>
  );
}
