'use client';
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto grid min-h-[60dvh] max-w-md place-content-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
      <p className="text-muted-foreground">L’équipe technique est prévenue. Vous pouvez réessayer.</p>
      <button onClick={reset} className="mx-auto rounded-lg bg-primary px-4 py-2 font-semibold text-white">Réessayer</button>
    </main>
  );
}
