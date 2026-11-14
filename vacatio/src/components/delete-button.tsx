/** Petit formulaire de suppression (action serveur + champs cachés). */
export function DeleteButton({ action, fields, label = 'Supprimer' }: { action: (fd: FormData) => Promise<void>; fields: Record<string, string>; label?: string }) {
  return (
    <form action={action} className="inline">
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button className="text-sm font-medium text-destructive underline">{label}</button>
    </form>
  );
}
