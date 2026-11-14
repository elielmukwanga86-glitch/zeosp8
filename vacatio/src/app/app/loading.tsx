export default function Loading() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Chargement">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
