import type { Metadata } from 'next';
import { Logo } from '@/components/logo';
import { getAgentDictionary, localeDirection } from '@/i18n/agent';
import { currentAgentLocale } from '../locale';
import { LanguagePicker } from '../language-picker';
import { AgentLinkForm } from './form';

export const metadata: Metadata = { title: 'Connexion agent', robots: { index: false } };

export default async function AgentConnexionPage({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams;
  const locale = await currentAgentLocale();
  const t = getAgentDictionary(locale);
  return (
    <main lang={locale} dir={localeDirection(locale)} className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-10 px-4 py-10">
      <Logo />
      <AgentLinkForm t={t} expired={erreur === 'lien'} />
      <div className="mt-auto"><LanguagePicker current={locale} label={t.language} /></div>
    </main>
  );
}
