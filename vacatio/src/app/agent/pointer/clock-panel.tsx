'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { CircleCheck, Loader2, LogIn, LogOut, MapPin, TriangleAlert } from 'lucide-react';
import type { AgentDictionary } from '@/i18n/agent';
import { clockAction, type ClockResult } from '../actions';

/** Lit la position UNE fois (pas de suivi). En cas de refus ou d'échec, le pointage continue sans position. */
function readPositionOnce(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 });
  });
}

export function ClockPanel({ t, qr, initialKind }: { t: AgentDictionary; qr: string | null; initialKind: 'in' | 'out' | null }) {
  const [result, setResult] = useState<ClockResult | null>(null);
  const [pending, start] = useTransition();

  const clock = (kind: 'in' | 'out') => start(async () => {
    const pos = await readPositionOnce();
    setResult(await clockAction({
      kind, qr, lat: pos?.coords.latitude ?? null, lng: pos?.coords.longitude ?? null, accuracy: pos?.coords.accuracy ?? null,
    }));
  });

  if (result) {
    const good = result.status === 'ok' || result.status === 'flagged';
    const text = { ok: t.clockDone, flagged: t.clockFlagged, no_shift: t.noShiftNow, qr_unknown: t.qrUnknown, error: t.error }[result.status];
    return (
      <div className="grid justify-items-center gap-4 text-center" role="status">
        {good ? <CircleCheck className="size-24 text-accent" aria-hidden /> : <TriangleAlert className="size-24 text-amber-600" aria-hidden />}
        <p className="text-2xl font-bold">{text}</p>
        {result.site && <p className="text-lg">{result.site}</p>}
        <Link href="/agent" className="mt-4 rounded-2xl border-2 border-border px-6 py-4 text-lg font-semibold">{t.back}</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {pending ? (
        <div className="grid justify-items-center gap-3 py-10"><Loader2 className="size-16 animate-spin text-primary" aria-hidden /><span className="sr-only">…</span></div>
      ) : (
        (initialKind ? [initialKind] : (['in', 'out'] as const)).map((kind) => {
          const Icon = kind === 'in' ? LogIn : LogOut;
          return (
            <button key={kind} onClick={() => clock(kind)}
              className={`flex min-h-32 items-center justify-center gap-4 rounded-3xl text-3xl font-bold text-white ${kind === 'in' ? 'bg-accent' : 'bg-primary'}`}>
              <Icon className="size-12" aria-hidden />{kind === 'in' ? t.clockIn : t.clockOut}
            </button>
          );
        })
      )}
      <p className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground"><MapPin className="size-4" aria-hidden />{t.gpsAsk}</p>
    </div>
  );
}
