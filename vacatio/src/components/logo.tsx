import { cn } from '@/lib/utils';

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-bold tracking-tight', inverted ? 'text-white' : 'text-primary', className)}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <rect width="32" height="32" rx="8" fill={inverted ? '#ffffff' : '#0f2f57'} />
        <path d="M8 16.5l5 5L24 10.5" fill="none" stroke="#1f9d63" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-lg">Vacatio</span>
    </span>
  );
}
