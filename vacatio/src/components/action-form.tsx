'use client';
import { useActionState, useEffect, useRef } from 'react';
import type { FormState } from '@/lib/validation/auth';
import { FormMessage } from './form-message';
import { SubmitButton } from './ui/submit-button';
import type { ButtonProps } from './ui/button';

/** Contexte des erreurs de champ, lu par les champs via la prop `errors`. */
export function ActionForm({ action, children, submitLabel, pendingLabel = 'Enregistrement…', resetOnSuccess = false, className, submitVariant, submitSize }: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  children: (errors: Record<string, string | undefined>) => React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  resetOnSuccess?: boolean;
  className?: string;
  submitVariant?: ButtonProps['variant'];
  submitSize?: ButtonProps['size'];
}) {
  const [state, formAction] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className ?? 'grid gap-4'} noValidate>
      {children(state.fieldErrors ?? {})}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-full">
        <SubmitButton pendingLabel={pendingLabel} variant={submitVariant} size={submitSize}>{submitLabel}</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
