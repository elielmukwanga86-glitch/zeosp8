import Link from "next/link";

/** Gabarit commun des pages légales (textes à compléter par l'éditeur du service). */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10">
      <Link href="/" className="text-sm text-marque underline">← Accueil</Link>
      <h1 className="mt-4 mb-2 text-2xl font-bold">{title}</h1>
      <p className="mb-6 rounded-lg border border-attention bg-attention-clair p-3 text-sm">
        Modèle à compléter et à faire relire avant toute mise en production.
      </p>
      <div className="flex flex-col gap-4 leading-relaxed [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold">
        {children}
      </div>
    </main>
  );
}
