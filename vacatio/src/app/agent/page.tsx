import type { Metadata } from 'next';
import { CalendarClock, LogIn, LogOut, Package, Thermometer, MessageCircle } from 'lucide-react';
import { requireRole } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { getAgentDictionary, localeDirection } from '@/i18n/agent';
import { Logo } from '@/components/logo';
import { currentAgentLocale } from './locale';
import { LanguagePicker } from './language-picker';

export const metadata: Metadata = { title: 'Mon espace', robots: { index: false } };

const ACTIONS = [
  { key: 'clockIn', icon: LogIn, className: 'bg-accent text-white' },
  { key: 'clockOut', icon: LogOut, className: 'bg-primary text-white' },
  { key: 'absence', icon: Thermometer, className: 'bg-card border-2 border-border' },
  { key: 'stock', icon: Package, className: 'bg-card border-2 border-border' },
  { key: 'messages', icon: MessageCircle, className: 'bg-card border-2 border-border' },
] as const;

export default async function AgentHomePage() {
  const ctx = await requireRole('agent');
  const locale = await currentAgentLocale();
  const t = getAgentDictionary(locale);
  const supabase = await createClient();

  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  const [{ data: agent }, { data: shifts }] = await Promise.all([
    supabase.from('agents').select('id, first_name').eq('org_id', ctx.org.id).eq('user_id', ctx.userId).maybeSingle(),
    supabase.from('shifts').select('id, starts_at, ends_at, site:sites(name, address_line1, city)')
      .eq('org_id', ctx.org.id).eq('status', 'published').gte('starts_at', start.toISOString()).lt('starts_at', end.toISOString())
      .order('starts_at'),
  ]);
  const time = new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : locale, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });

  return (
    <main lang={locale} dir={localeDirection(locale)} className="mx-auto flex max-w-md flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <Logo />
        <form action="/auth/deconnexion" method="post">
          <button className="min-h-12 rounded-xl px-3 text-sm font-semibold text-muted-foreground underline">{t.logout}</button>
        </form>
      </header>
      <h1 className="text-3xl font-bold">{t.hello} {agent?.first_name ?? ''}</h1>

      <section aria-labelledby="today" className="grid gap-3">
        <h2 id="today" className="flex items-center gap-2 text-lg font-semibold"><CalendarClock className="size-6" aria-hidden />{t.today}</h2>
        {(shifts ?? []).length === 0 ? (
          <p className="rounded-2xl bg-muted p-5 text-lg">{t.noShift}</p>
        ) : (
          (shifts ?? []).map((s) => {
            const site = s.site as unknown as { name: string; address_line1: string | null; city: string | null } | null;
            return (
              <article key={s.id} className="rounded-2xl border-2 border-border bg-card p-5">
                <p className="text-2xl font-bold" dir="ltr">{time.format(new Date(s.starts_at))} – {time.format(new Date(s.ends_at))}</p>
                <p className="text-lg font-semibold">{site?.name}</p>
                {site?.address_line1 && <p className="text-muted-foreground">{site.address_line1}, {site.city}</p>}
              </article>
            );
          })
        )}
      </section>

      {/* Les actions (pointage, absence, stock, messages) sont branchées en phase 2 et 4. */}
      <section className="grid grid-cols-2 gap-3">
        {ACTIONS.map(({ key, icon: Icon, className }) => (
          <button key={key} disabled aria-describedby="bientot"
            className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl p-3 text-lg font-bold opacity-60 ${className}`}>
            <Icon className="size-9" aria-hidden />{t[key]}
          </button>
        ))}
      </section>
      <p id="bientot" className="text-center text-sm text-muted-foreground">{t.soon}</p>

      <LanguagePicker current={locale} label={t.language} />
    </main>
  );
}
