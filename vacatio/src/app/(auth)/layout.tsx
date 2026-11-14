import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-12">
      <Link href="/" aria-label="Accueil Vacatio"><Logo /></Link>
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
