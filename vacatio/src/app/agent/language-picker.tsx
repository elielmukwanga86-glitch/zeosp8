import { cookies } from 'next/headers';
import { Languages } from 'lucide-react';
import { AGENT_LOCALES, LOCALE_COOKIE, LOCALE_NAMES, isAgentLocale, type AgentLocale } from '@/i18n/agent';
import { createClient } from '@/lib/supabase/server';

async function setLocale(formData: FormData) {
  'use server';
  const locale = formData.get('locale');
  if (!isAgentLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) await supabase.rpc('set_my_locale', { p_locale: locale });
}

/** Sélecteur de langue : gros boutons, nom de chaque langue écrit dans sa propre langue. */
export function LanguagePicker({ current, label }: { current: AgentLocale; label: string }) {
  return (
    <form action={setLocale} className="grid gap-2">
      <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Languages className="size-5" aria-hidden />{label}</p>
      <div className="flex flex-wrap gap-2">
        {AGENT_LOCALES.map((l) => (
          <button key={l} name="locale" value={l} lang={l} aria-pressed={l === current}
            className="min-h-12 rounded-xl border-2 border-border bg-card px-4 text-base font-semibold aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-white">
            {LOCALE_NAMES[l]}
          </button>
        ))}
      </div>
    </form>
  );
}
