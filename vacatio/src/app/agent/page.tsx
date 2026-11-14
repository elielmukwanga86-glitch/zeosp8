import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarClock, KeyRound, LogIn, LogOut, MessageCircle, Package, ScrollText, Thermometer } from 'lucide-react';
import { requireRole } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { getAgentDictionary, localeDirection } from '@/i18n/agent';
import { addDays, parisDay, parisToUtc } from '@/lib/dates';
import { Logo } from '@/components/logo';
import { currentAgentLocale } from './locale';
import { LanguagePicker } from './language-picker';

export const metadata: Metadata = { title: 'Mon espace', robots: { index: false } };

interface SiteInfo { id: string; name: string; address_line1: string | null; city: string | null; instructions: string | null }

export default async function AgentHomePage() {
  const ctx = await requireRole('agent');
  const locale = await currentAgentLocale();
  const t = getAgentDictionary(locale);
  const supabase = await createClient();

  const today = parisDay(new Date());
  const [{ data: agent }, { data: shifts }] = await Promise.all([
    supabase.from('agents').select('id, first_name').eq('org_id', ctx.org.id).eq('user_id', ctx.userId).maybeSingle(),
    supabase.from('shifts').select('id, starts_at, ends_at, notes, site:sites(id, name, address_line1, city, instructions)')
      .eq('org_id', ctx.org.id).eq('status', 'published')
      .gte('starts_at', parisToUtc(today, '00:00').toISOString()).lt('starts_at', parisToUtc(addDays(today, 1), '00:00').toISOString())
      .order('starts_at'),
  ]);
  // Codes d'accès : la RLS ne les renvoie que pendant une vacation sur le site.
  const siteIds = [...new Set((shifts ?? []).map((s) => (s.site as unknown as SiteInfo).id))];
  const { data: codes } = siteIds.length
    ? await supabase.from('site_access_codes').select('site_id, label, secret').in('site_id', siteIds)
    : { data: [] as { site_id: string; label: string; secret: string }[] };
  const time = new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : locale, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });

  const actions = [
    { href: '/agent/pointer?sens=in', label: t.clockIn, icon: LogIn, className: 'bg-accent text-white' },
    { href: '/agent/pointer?sens=out', label: t.clockOut, icon: LogOut, className: 'bg-primary text-white' },
    { href: '/agent/absence', label: t.absence, icon: Thermometer, className: 'bg-card border-2 border-border' },
  ];

  return (
    <main lang={locale} dir={localeDirection(locale)} className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <Logo />
        <form action="/auth/deconnexion" method="post">
          <button className="min-h-12 rounded-xl px-3 text-sm font-semibold text-muted-foreground underline">{t.logout}</button>
        </form>
      </header>
      <h1 className="text-3xl font-bold">{t.hello} {agent?.first_name ?? ''}</h1>

      <section className="grid grid-cols-2 gap-3">
        {actions.map(({ href, label, icon: Icon, className }, i) => (
          <Link key={href} href={href} className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl p-3 text-xl font-bold ${className} ${i === 2 ? 'col-span-2 min-h-20 flex-row' : ''}`}>
            <Icon className="size-9" aria-hidden />{label}
          </Link>
        ))}
      </section>

      <section aria-labelledby="today" className="grid gap-3">
        <h2 id="today" className="flex items-center gap-2 text-lg font-semibold"><CalendarClock className="size-6" aria-hidden />{t.today}</h2>
        {(shifts ?? []).length === 0 ? (
          <p className="rounded-2xl bg-muted p-5 text-lg">{t.noShift}</p>
        ) : (
          (shifts ?? []).map((s) => {
            const site = s.site as unknown as SiteInfo;
            const siteCodes = (codes ?? []).filter((c) => c.site_id === site.id);
            return (
              <article key={s.id} className="grid gap-2 rounded-2xl border-2 border-border bg-card p-5">
                <p className="text-2xl font-bold" dir="ltr">{time.format(new Date(s.starts_at))} – {time.format(new Date(s.ends_at))}</p>
                <p className="text-lg font-semibold">{site.name}</p>
                {site.address_line1 && (
                  <a className="text-primary underline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${site.address_line1} ${site.city ?? ''}`)}`}>
                    {site.address_line1}, {site.city}</a>
                )}
                {(site.instructions || s.notes) && (
                  <details className="rounded-xl bg-muted p-3"><summary className="flex cursor-pointer items-center gap-2 font-semibold"><ScrollText className="size-5" aria-hidden />{t.instructions}</summary>
                    <p className="whitespace-pre-line pt-2">{[s.notes, site.instructions].filter(Boolean).join('\n\n')}</p></details>
                )}
                {siteCodes.length > 0 && (
                  <details className="rounded-xl bg-muted p-3"><summary className="flex cursor-pointer items-center gap-2 font-semibold"><KeyRound className="size-5" aria-hidden />{t.codes}</summary>
                    <ul className="grid gap-1 pt-2">{siteCodes.map((c) => <li key={c.label}>{c.label} : <strong dir="ltr" className="text-xl">{c.secret}</strong></li>)}</ul></details>
                )}
              </article>
            );
          })
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 opacity-60" aria-describedby="bientot">
        {[{ l: t.stock, icon: Package }, { l: t.messages, icon: MessageCircle }].map(({ l, icon: Icon }) => (
          <span key={l} className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-border p-2 text-center font-semibold">
            <Icon className="size-7" aria-hidden />{l}</span>
        ))}
      </section>
      <p id="bientot" className="-mt-4 text-center text-sm text-muted-foreground">{t.soon}</p>

      <LanguagePicker current={locale} label={t.language} />
    </main>
  );
}
