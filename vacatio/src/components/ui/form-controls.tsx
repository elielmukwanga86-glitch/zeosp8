import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from './label';

const control = 'w-full rounded-lg border border-input bg-card px-3 text-base sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive';

export function Select({ label, name, error, children, className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; name: string; error?: string }) {
  const id = props.id ?? name;
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      <select id={id} name={name} aria-invalid={error ? true : undefined} className={cn(control, 'h-10')} {...props}>{children}</select>
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

export function Textarea({ label, name, error, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; name: string; error?: string }) {
  const id = props.id ?? name;
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      <textarea id={id} name={name} rows={3} aria-invalid={error ? true : undefined} className={cn(control, 'py-2')} {...props} />
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

export function Checkbox({ label, name, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} className="size-4 accent-[--color-primary]" {...props} />
      {label}
    </label>
  );
}
