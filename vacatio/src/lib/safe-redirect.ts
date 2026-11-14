/** N'autorise que les chemins internes (empêche les redirections ouvertes). */
export function safeNextPath(value: string | null | undefined, fallback = '/app') {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}
