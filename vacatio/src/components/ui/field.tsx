import * as React from 'react';
import { Label } from './label';
import { Input } from './input';

/** Champ de formulaire accessible : libellé, aide et message d'erreur reliés au champ. */
export function Field({ label, name, error, hint, ...props }: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string; name: string; error?: string; hint?: string;
}) {
  const id = props.id ?? name;
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...props} />
      {hint && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
