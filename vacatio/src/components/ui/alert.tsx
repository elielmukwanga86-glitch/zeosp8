import * as React from 'react';
import { cn } from '@/lib/utils';

export function Alert({ className, variant = 'info', ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: 'info' | 'error' | 'success' | 'warning' }) {
  const styles = {
    info: 'border-primary/20 bg-primary/5 text-primary',
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-accent/30 bg-accent/10 text-accent-ink',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
  }[variant];
  return <div role={variant === 'error' ? 'alert' : 'status'} className={cn('rounded-lg border px-4 py-3 text-sm', styles, className)} {...props} />;
}
