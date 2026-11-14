'use client';

import Link from 'next/link';
import { Fragment, useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Copy, Plus, RefreshCw, Send, UserRoundCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDays, formatDayLabel } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Field } from '@/components/ui/field';
import { Checkbox, Select, Textarea } from '@/components/ui/form-controls';
import { SubmitButton } from '@/components/ui/submit-button';
import { FormMessage } from '@/components/form-message';
import type { FormState } from '@/lib/validation/auth';
import {
  cancelShiftAction, duplicateWeekAction, generateAction, moveShiftAction, publishAction, saveShiftAction, type PlanningResult,
} from './actions';

export interface BoardShift {
  id: string; siteId: string; siteName: string; agentId: string | null; agentName: string | null;
  day: string; start: string; end: string; breakMinutes: number; hours: number;
  status: 'draft' | 'published'; source: string; notes: string | null; billable: boolean;
  replacement: boolean; clockedIn: boolean;
  violations: { message: string; severite: 'bloquant' | 'alerte' }[];
}

interface Props {
  view: 'jour' | 'semaine' | 'mois'; by: 'agent' | 'site'; date: string; from: string; to: string; days: string[];
  shifts: BoardShift[]; agents: { id: string; name: string; weekly: number }[]; sites: { id: string; name: string }[];
  absentDays: Record<string, string[]>; isGerant: boolean; today: string;
}

type Draft = Partial<BoardShift> & { day: string };
const UNASSIGNED = '__libre__';

export function PlanningBoard(props: Props) {
  const { view, by, date, from, to, days, shifts, agents, sites, absentDays, isGerant, today } = props;
  const [editing, setEditing] = useState<Draft | null>(null);
  const [moveResult, setMoveResult] = useState<(PlanningResult & { retry?: () => void }) | null>(null);
  const [pending, startTransition] = useTransition();

  const href = (p: Partial<{ vue: string; par: string; date: string }>) => {
    const q = new URLSearchParams({ vue: view, par: by, date, ...p });
    return `/app/planning?${q.toString()}`;
  };
  const step = view === 'jour' ? 1 : view === 'semaine' ? 7 : 31;
  const prevDate = view === 'mois' ? `${addDays(`${date.slice(0, 7)}-01`, -1).slice(0, 7)}-01` : addDays(date, -step);
  const nextDate = view === 'mois' ? `${addDays(`${date.slice(0, 7)}-01`, 32).slice(0, 7)}-01` : addDays(date, step);

  const visibleDays = days;
  const inRange = shifts.filter((s) => s.day >= from && s.day <= to);
  const drafts = inRange.filter((s) => s.status === 'draft').length;
  const unassigned = inRange.filter((s) => !s.agentId).length;
  const conflicts = inRange.filter((s) => s.violations.some((v) => v.severite === 'bloquant')).length;

  const rows = by === 'agent'
    ? [{ id: UNASSIGNED, name: 'À pourvoir', sub: '' }, ...agents.map((a) => ({ id: a.id, name: a.name, sub: `${String(a.weekly).replace('.', ',')} h` }))]
    : sites.map((s) => ({ id: s.id, name: s.name, sub: '' }));

  const shiftsFor = (rowId: string, day: string) => inRange.filter((s) => s.day === day && (by === 'agent'
    ? (rowId === UNASSIGNED ? !s.agentId : s.agentId === rowId)
    : s.siteId === rowId));

  const hoursFor = (agentId: string) => inRange.filter((s) => s.agentId === agentId).reduce((t, s) => t + s.hours, 0);

  function onDrop(e: React.DragEvent, rowId: string, day: string) {
    e.preventDefault();
    const shiftId = e.dataTransfer.getData('text/shift');
    if (!shiftId) return;
    const target = by === 'agent' ? { agentId: rowId === UNASSIGNED ? null : rowId } : { siteId: rowId };
    const run = (force = false) => startTransition(async () => {
      const res = await moveShiftAction({ shiftId, day, ...target, force });
      setMoveResult(res.ok && !res.violations?.length ? null : { ...res, retry: !res.ok && isGerant && res.violations?.length ? () => run(true) : undefined });
    });
    run();
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="me-2 text-2xl font-bold tracking-tight">Planning</h1>
          <Button asChild variant="outline" size="icon" aria-label="Période précédente"><Link href={href({ date: prevDate })}><ChevronLeft /></Link></Button>
          <Button asChild variant="outline" size="sm"><Link href={href({ date: today })}>Aujourd’hui</Link></Button>
          <Button asChild variant="outline" size="icon" aria-label="Période suivante"><Link href={href({ date: nextDate })}><ChevronRight /></Link></Button>
          <span className="text-sm font-semibold">{periodLabel(view, from, to, date)}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Toggle options={[['jour', 'Jour'], ['semaine', 'Semaine'], ['mois', 'Mois']]} current={view} href={(v) => href({ vue: v })} label="Vue" />
          {view !== 'mois' && <Toggle options={[['agent', 'Par agent'], ['site', 'Par site']]} current={by} href={(v) => href({ par: v })} label="Regroupement" />}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <RangeAction action={generateAction} from={from} to={to} icon={<RefreshCw />} label="Générer depuis les contrats" />
        {view === 'semaine' && <RangeAction action={duplicateWeekAction} monday={from} icon={<Copy />} label="Copier sur la semaine suivante" />}
        <RangeAction action={publishAction} from={from} to={to} icon={<Send />} label={`Publier${drafts ? ` (${drafts})` : ''}`} variant="accent" />
        <span className="ms-auto flex flex-wrap gap-3 text-sm">
          <span className={cn(unassigned ? 'font-semibold text-amber-800' : 'text-muted-foreground')}>{unassigned} à pourvoir</span>
          <span className={cn(conflicts ? 'font-semibold text-destructive' : 'text-muted-foreground')}>{conflicts} non conforme{conflicts > 1 ? 's' : ''}</span>
          <span className="text-muted-foreground">{drafts} brouillon{drafts > 1 ? 's' : ''}</span>
        </span>
      </div>

      {moveResult && (
        <Alert variant={moveResult.ok ? 'warning' : 'error'} className="grid gap-2">
          <div className="flex items-start gap-2">
            <p className="flex-1 font-semibold">{moveResult.ok ? 'Déplacé avec des alertes' : moveResult.error}</p>
            <button onClick={() => setMoveResult(null)} aria-label="Fermer"><X className="size-4" /></button>
          </div>
          {moveResult.violations?.length ? <ul className="list-disc ps-5">{moveResult.violations.map((v, i) => <li key={i}>{v.message}</li>)}</ul> : null}
          {moveResult.retry && <Button size="sm" variant="destructive" onClick={() => { moveResult.retry!(); }} className="justify-self-start">Forcer (gérant)</Button>}
        </Alert>
      )}

      {view === 'mois' ? (
        <MonthGrid days={visibleDays} month={date.slice(0, 7)} shifts={inRange} href={(d) => href({ vue: 'jour', date: d })} today={today} />
      ) : (
        <div className={cn('overflow-x-auto rounded-xl border border-border bg-card', pending && 'opacity-70')} aria-busy={pending}>
          <div className="grid min-w-max" style={{ gridTemplateColumns: `10rem repeat(${visibleDays.length}, minmax(${view === 'jour' ? '20rem' : '8rem'}, 1fr))` }}>
            <div className="sticky start-0 z-10 border-b border-border bg-muted p-2 text-xs font-semibold">{by === 'agent' ? 'Agent' : 'Site'}</div>
            {visibleDays.map((d) => (
              <div key={d} className={cn('border-b border-s border-border bg-muted p-2 text-xs font-semibold', d === today && 'bg-primary/10 text-primary')}>{formatDayLabel(d)}</div>
            ))}
            {rows.map((row) => (
              <Fragment key={row.id}>
                <div className="sticky start-0 z-10 grid content-start gap-0.5 border-b border-border bg-card p-2 text-sm">
                  <span className={cn('font-medium', row.id === UNASSIGNED && 'text-amber-800')}>{row.name}</span>
                  {by === 'agent' && row.id !== UNASSIGNED && <span className="text-xs text-muted-foreground">{fmtH(hoursFor(row.id))} / {row.sub}</span>}
                </div>
                {visibleDays.map((d) => {
                  const absent = by === 'agent' && absentDays[row.id]?.includes(d);
                  return (
                    <div key={d} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, row.id, d)}
                      className={cn('group grid min-h-16 content-start gap-1 border-b border-s border-border p-1', absent && 'bg-[repeating-linear-gradient(135deg,#fef3c7_0,#fef3c7_6px,transparent_6px,transparent_12px)]')}>
                      {absent && <span className="text-[11px] font-semibold text-amber-900">Absent</span>}
                      {shiftsFor(row.id, d).map((s) => <Chip key={s.id} s={s} by={by} onOpen={() => setEditing(s)} />)}
                      <button type="button" onClick={() => setEditing({ day: d, ...(by === 'agent' ? { agentId: row.id === UNASSIGNED ? null : row.id } : { siteId: row.id }) })}
                        className="flex h-6 items-center justify-center rounded text-muted-foreground opacity-0 hover:bg-muted focus:opacity-100 group-hover:opacity-100"
                        aria-label={`Ajouter une vacation le ${formatDayLabel(d)} pour ${row.name}`}><Plus className="size-4" /></button>
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Glissez une vacation vers une autre case pour la réaffecter. Bordure pointillée : brouillon non publié. Les agents ne voient que les vacations publiées.</p>

      {editing && <ShiftEditor draft={editing} agents={agents} sites={sites} isGerant={isGerant} onClose={() => setEditing(null)} />}
    </div>
  );
}

function Chip({ s, by, onOpen }: { s: BoardShift; by: 'agent' | 'site'; onOpen: () => void }) {
  const blocking = s.violations.some((v) => v.severite === 'bloquant');
  const warning = s.violations.length > 0;
  return (
    <button type="button" draggable onDragStart={(e) => e.dataTransfer.setData('text/shift', s.id)} onClick={onOpen}
      title={s.violations.map((v) => v.message).join('\n') || undefined}
      className={cn('grid cursor-grab gap-0.5 rounded-md border px-2 py-1 text-start text-xs active:cursor-grabbing',
        s.status === 'draft' ? 'border-dashed border-primary/50 bg-white' : 'border-primary/20 bg-primary/5',
        !s.agentId && 'border-amber-400 bg-amber-50',
        blocking && 'border-destructive bg-red-50')}>
      <span className="flex items-center gap-1 font-semibold">
        {s.start}–{s.end}
        {warning && <AlertTriangle className={cn('size-3', blocking ? 'text-destructive' : 'text-amber-600')} aria-label="Alerte de conformité" />}
        {s.clockedIn && <UserRoundCheck className="size-3 text-accent" aria-label="Arrivée pointée" />}
      </span>
      <span className="truncate text-muted-foreground">{by === 'agent' ? s.siteName : s.agentName ?? 'À pourvoir'}</span>
      {s.replacement && <span className="text-[10px] font-semibold text-accent-ink">Remplacement</span>}
    </button>
  );
}

function MonthGrid({ days, month, shifts, href, today }: { days: string[]; month: string; shifts: BoardShift[]; href: (d: string) => string; today: string }) {
  return (
    <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-border bg-card text-sm">
      {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => <div key={d} className="border-b border-border bg-muted p-2 text-xs font-semibold">{d}</div>)}
      {days.map((d) => {
        const list = shifts.filter((s) => s.day === d);
        const free = list.filter((s) => !s.agentId).length;
        const bad = list.filter((s) => s.violations.some((v) => v.severite === 'bloquant')).length;
        return (
          <Link key={d} href={href(d)} className={cn('grid min-h-20 content-start gap-1 border-b border-s border-border p-2 hover:bg-muted', !d.startsWith(month) && 'text-muted-foreground opacity-60', d === today && 'bg-primary/5')}>
            <span className="font-semibold">{Number(d.slice(8))}</span>
            {list.length > 0 && <span className="text-xs">{list.length} vacation{list.length > 1 ? 's' : ''}</span>}
            {free > 0 && <span className="text-xs font-semibold text-amber-800">{free} à pourvoir</span>}
            {bad > 0 && <span className="text-xs font-semibold text-destructive">{bad} non conforme{bad > 1 ? 's' : ''}</span>}
          </Link>
        );
      })}
    </div>
  );
}

function Toggle({ options, current, href, label }: { options: [string, string][]; current: string; href: (v: string) => string; label: string }) {
  return (
    <nav aria-label={label} className="flex rounded-lg border border-border bg-card p-0.5">
      {options.map(([v, l]) => (
        <Link key={v} href={href(v)} aria-current={current === v ? 'page' : undefined}
          className="rounded-md px-3 py-1.5 text-sm font-medium aria-[current=page]:bg-primary aria-[current=page]:text-white">{l}</Link>
      ))}
    </nav>
  );
}

function RangeAction({ action, from, to, monday, icon, label, variant = 'outline' }: {
  action: (p: FormState, fd: FormData) => Promise<FormState>; from?: string; to?: string; monday?: string;
  icon: React.ReactNode; label: string; variant?: 'outline' | 'accent';
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      {from && <input type="hidden" name="from" value={from} />}
      {to && <input type="hidden" name="to" value={to} />}
      {monday && <input type="hidden" name="monday" value={monday} />}
      <SubmitButton variant={variant} size="sm">{icon}{label}</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

function ShiftEditor({ draft, agents, sites, isGerant, onClose }: {
  draft: Draft; agents: { id: string; name: string }[]; sites: { id: string; name: string }[]; isGerant: boolean; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState(saveShiftAction, {});
  useEffect(() => { ref.current?.showModal(); }, []);
  useEffect(() => { if (state.ok && !state.violations?.length) onClose(); }, [state, onClose]);
  const blocked = !state.ok && (state.violations?.length ?? 0) > 0;

  return (
    <dialog ref={ref} onClose={onClose} className="m-auto w-[min(36rem,calc(100vw-2rem))] rounded-xl p-0 backdrop:bg-black/40">
      <form action={formAction} className="grid gap-4 p-6 sm:grid-cols-2" noValidate>
        <div className="flex items-start justify-between sm:col-span-2">
          <h2 className="text-lg font-semibold">{draft.id ? 'Modifier la vacation' : 'Nouvelle vacation'}</h2>
          <button type="button" onClick={() => ref.current?.close()} aria-label="Fermer"><X /></button>
        </div>
        {draft.id && <input type="hidden" name="id" value={draft.id} />}
        <Select label="Site" name="site_id" defaultValue={draft.siteId ?? sites[0]?.id} error={state.fieldErrors?.site_id} className="sm:col-span-2">
          {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select label="Agent" name="agent_id" defaultValue={draft.agentId ?? ''} className="sm:col-span-2">
          <option value="">À pourvoir</option>
          {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
        <Field label="Jour" name="day" type="date" defaultValue={draft.day} required error={state.fieldErrors?.day} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Début" name="start_time" type="time" defaultValue={draft.start ?? '06:00'} required error={state.fieldErrors?.start_time} />
          <Field label="Fin" name="end_time" type="time" defaultValue={draft.end ?? '09:00'} required error={state.fieldErrors?.end_time} />
        </div>
        <Field label="Pause (minutes)" name="break_minutes" inputMode="numeric" defaultValue={draft.breakMinutes ?? 0} />
        <div className="flex items-end pb-2"><Checkbox label="Heures facturables au client" name="billable" defaultChecked={draft.billable ?? true} /></div>
        <Textarea label="Note pour l’agent" name="notes" defaultValue={draft.notes ?? ''} className="sm:col-span-2" />

        {(state.violations?.length ?? 0) > 0 && (
          <Alert variant={blocked ? 'error' : 'warning'} className="grid gap-1 sm:col-span-2">
            <p className="font-semibold">{blocked ? 'Non conforme' : 'Alertes'}</p>
            <ul className="list-disc ps-5">{state.violations!.map((v, i) => <li key={i}>{v.message}</li>)}</ul>
            {blocked && isGerant && <Checkbox label="Je force l’enregistrement (gérant), la non-conformité reste tracée" name="force" />}
          </Alert>
        )}
        {state.error && !blocked && <div className="sm:col-span-2"><FormMessage state={state} /></div>}
        {state.ok && <Alert variant="success" className="sm:col-span-2">{state.message}</Alert>}

        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <SubmitButton pendingLabel="Contrôle…">{state.ok ? 'Enregistrer à nouveau' : 'Enregistrer'}</SubmitButton>
          <Button type="button" variant="ghost" onClick={() => ref.current?.close()}>Fermer</Button>
          {draft.id && (
            <button type="submit" formAction={async (fd) => { await cancelShiftAction(fd); onClose(); }} className="ms-auto text-sm font-semibold text-destructive underline">
              {draft.status === 'published' ? 'Annuler la vacation' : 'Supprimer'}
            </button>
          )}
        </div>
      </form>
    </dialog>
  );
}

function fmtH(h: number) {
  return `${(Math.round(h * 100) / 100).toString().replace('.', ',')} h`;
}

function periodLabel(view: string, from: string, to: string, date: string) {
  if (view === 'jour') return formatDayLabel(date);
  if (view === 'mois') {
    const [y, m] = date.split('-').map(Number) as [number, number];
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1)));
  }
  return `${formatDayLabel(from)} – ${formatDayLabel(to)}`;
}
