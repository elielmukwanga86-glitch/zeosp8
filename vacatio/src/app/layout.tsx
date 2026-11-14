import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: { default: 'Vacatio — logiciel de planning pour sociétés de propreté', template: '%s · Vacatio' },
  description: 'Chaque vacation couverte, chaque heure facturée. Planning, pointage, remplacements et facturation pour les entreprises de nettoyage.',
  applicationName: 'Vacatio',
};

export const viewport: Viewport = {
  themeColor: '#0f2f57',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
