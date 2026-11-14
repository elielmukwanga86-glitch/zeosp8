import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth/context';
import { getAgentDictionary, localeDirection } from '@/i18n/agent';
import { currentAgentLocale } from '../locale';
import { ClockPanel } from './clock-panel';

export const metadata: Metadata = { title: 'Pointer', robots: { index: false } };

/** Page ouverte en scannant le QR code du site (ou une étiquette NFC), ou depuis l'accueil agent. */
export default async function PointerPage({ searchParams }: { searchParams: Promise<{ qr?: string; sens?: string }> }) {
  await requireRole('agent');
  const { qr, sens } = await searchParams;
  const locale = await currentAgentLocale();
  const t = getAgentDictionary(locale);
  const token = qr && /^[A-Za-z0-9_-]{10,64}$/.test(qr) ? qr : null;
  return (
    <main lang={locale} dir={localeDirection(locale)} className="mx-auto grid min-h-dvh w-full max-w-md content-center gap-6 px-4 py-8">
      <ClockPanel t={t} qr={token} initialKind={sens === 'in' || sens === 'out' ? sens : null} />
    </main>
  );
}
