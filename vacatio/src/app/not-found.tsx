import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-md place-content-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">Page introuvable</h1>
      <Link className="font-semibold text-primary underline" href="/">Retour à l’accueil</Link>
    </main>
  );
}
