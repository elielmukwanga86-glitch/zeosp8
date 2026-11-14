import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth/context';
import { getAgentDictionary, localeDirection } from '@/i18n/agent';
import { parisDay } from '@/lib/dates';
import { currentAgentLocale } from '../locale';
import { AbsenceForm } from './form';

export const metadata: Metadata = { title: 'Absence', robots: { index: false } };

export default async function AgentAbsencePage() {
  await requireRole('agent');
  const locale = await currentAgentLocale();
  return (
    <main lang={locale} dir={localeDirection(locale)} className="mx-auto grid w-full max-w-md gap-6 px-4 py-8">
      <AbsenceForm t={getAgentDictionary(locale)} today={parisDay(new Date())} />
    </main>
  );
}
