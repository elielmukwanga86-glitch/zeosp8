import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CircleCheck, CircleX } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashToken } from '@/lib/tokens';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { formatDayLabel, parisDay, parisTime } from '@/lib/dates';
import { Logo } from '@/components/logo';

export const metadata: Metadata = { title: 'Remplacement', robots: { index: false } };
export const dynamic = 'force-dynamic';

const MESSAGES: Record<string, { ok: boolean; text: string }> = {
  accepted: { ok: true, text: 'Merci ! La vacation est à vous. Elle apparaît dans votre planning.' },
  declined: { ok: true, text: 'C’est noté, merci de votre réponse.' },
  taken: { ok: false, text: 'Désolé, un collègue a déjà pris cette vacation.' },
  expired: { ok: false, text: 'Cette proposition n’est plus valable.' },
  conflict: { ok: false, text: 'Vous êtes déjà planifié sur ce créneau.' },
  invalid: { ok: false, text: 'Lien invalide.' },
};

async function respond(formData: FormData) {
  'use server';
  const token = String(formData.get('token') ?? '');
  const accept = formData.get('reponse') === 'oui';
  if (!(await rateLimit(`replacement:${await clientIp()}`, 30, 3600))) redirect(`/r/${token}?etat=expired`);
  const { data } = await createAdminClient().rpc('respond_replacement', { p_token_hash: hashToken(token), p_accept: accept });
  redirect(`/r/${token}?etat=${(data as { status: string } | null)?.status ?? 'invalid'}`);
}

/** Proposition de remplacement reçue par SMS : réponse en un clic, sans connexion. */
export default async function ReplacementPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ etat?: string }> }) {
  const { token } = await params;
  const { etat } = await searchParams;
  if (etat && MESSAGES[etat]) {
    const m = MESSAGES[etat];
    return (
      <main className="mx-auto grid min-h-dvh w-full max-w-md content-center justify-items-center gap-6 px-4 text-center">
        {m.ok ? <CircleCheck className="size-24 text-accent" aria-hidden /> : <CircleX className="size-24 text-amber-600" aria-hidden />}
        <p className="text-2xl font-bold">{m.text}</p>
      </main>
    );
  }
  const valid = /^[A-Za-z0-9_-]{20,64}$/.test(token);
  const { data: offer } = valid
    ? await createAdminClient().from('replacement_offers')
      .select('status, expires_at, shift:shifts(starts_at, ends_at, site:sites(name, address_line1, city), org:organizations(name))')
      .eq('token_hash', hashToken(token)).maybeSingle()
    : { data: null };
  if (!offer || offer.status !== 'proposed' || new Date(offer.expires_at) < new Date()) {
    const m = MESSAGES[offer?.status === 'accepted' ? 'taken' : 'expired']!;
    return <main className="mx-auto grid min-h-dvh max-w-md content-center px-4 text-center text-2xl font-bold">{m.text}</main>;
  }
  const shift = offer.shift as unknown as { starts_at: string; ends_at: string; org: { name: string }; site: { name: string; address_line1: string | null; city: string | null } };
  const org = shift.org;
  const start = new Date(shift.starts_at);

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-md content-center gap-6 px-4 py-8">
      <Logo />
      <p className="text-muted-foreground">{org.name} vous propose un remplacement :</p>
      <div className="grid gap-1 rounded-2xl border-2 border-border bg-card p-5">
        <p className="text-xl font-bold capitalize">{formatDayLabel(parisDay(start))}</p>
        <p className="text-3xl font-bold" dir="ltr">{parisTime(start)} – {parisTime(new Date(shift.ends_at))}</p>
        <p className="text-lg font-semibold">{shift.site.name}</p>
        {shift.site.address_line1 && <p className="text-muted-foreground">{shift.site.address_line1}, {shift.site.city}</p>}
      </div>
      <form action={respond} className="grid gap-3">
        <input type="hidden" name="token" value={token} />
        <button name="reponse" value="oui" className="flex min-h-20 items-center justify-center gap-3 rounded-2xl bg-accent text-2xl font-bold text-white"><CircleCheck className="size-8" aria-hidden />J’accepte</button>
        <button name="reponse" value="non" className="flex min-h-16 items-center justify-center gap-3 rounded-2xl border-2 border-border text-xl font-semibold"><CircleX className="size-7" aria-hidden />Je ne peux pas</button>
      </form>
    </main>
  );
}
