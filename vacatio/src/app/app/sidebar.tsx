'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Lock, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';
import { hasFeature, type PlanCode } from '@/config/plans';
import type { AppRole } from '@/config/roles';
import { DELIVERED_PHASE, NAV } from './nav';

export function Sidebar({ role, plan, orgSwitcher }: { role: AppRole; plan: PlanCode; orgSwitcher: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const content = (
    <nav aria-label="Navigation principale" className="flex flex-col gap-6 px-3 py-4">
      {orgSwitcher}
      {NAV.map((group) => {
        const items = group.items.filter((i) => i.roles.includes(role));
        if (items.length === 0) return null;
        return (
          <div key={group.title} className="grid gap-1">
            <p className="px-3 text-xs font-semibold text-white/50">{group.title}</p>
            {items.map((item) => {
              const active = item.href === '/app' ? pathname === '/app' : pathname.startsWith(item.href);
              const soon = item.phase > DELIVERED_PHASE;
              const locked = !soon && item.feature !== undefined && !hasFeature(plan, item.feature);
              const Icon = item.icon;
              const className = cn('flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium',
                active ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white',
                soon && 'cursor-default opacity-50 hover:bg-transparent');
              if (soon) {
                return (
                  <span key={item.href} className={className} title={`Disponible en phase ${item.phase}`}>
                    <Icon className="size-4" aria-hidden />{item.label}
                    <span className="ms-auto text-[10px] font-semibold">bientôt</span>
                  </span>
                );
              }
              return (
                <Link key={item.href} href={item.href} className={className} aria-current={active ? 'page' : undefined} onClick={() => setOpen(false)}>
                  <Icon className="size-4" aria-hidden />{item.label}
                  {locked && <Lock className="ms-auto size-3.5" aria-label="Forfait supérieur requis" />}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between bg-primary px-4 lg:hidden">
        <Logo inverted />
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="menu-mobile"
          className="grid size-10 place-items-center rounded-lg text-white" aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && <div id="menu-mobile" className="fixed inset-x-0 top-14 bottom-0 z-30 overflow-y-auto bg-primary lg:hidden">{content}</div>}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto bg-primary lg:flex">
        <div className="px-6 pt-5"><Logo inverted /></div>
        {content}
      </aside>
    </>
  );
}
