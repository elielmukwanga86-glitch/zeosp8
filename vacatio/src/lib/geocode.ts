import 'server-only';

/**
 * Géocodage d'une adresse française via la Base Adresse Nationale (api-adresse.data.gouv.fr,
 * service public gratuit, sans clé). Renvoie null si l'adresse n'est pas trouvée.
 */
export async function geocodeAddress(address: string, postalCode?: string | null, city?: string | null) {
  const q = [address, postalCode, city].filter(Boolean).join(' ').trim();
  if (q.length < 5) return null;
  try {
    const url = new URL('https://api-adresse.data.gouv.fr/search/');
    url.searchParams.set('q', q);
    url.searchParams.set('limit', '1');
    if (postalCode) url.searchParams.set('postcode', postalCode);
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { features?: { geometry: { coordinates: [number, number] }; properties: { score: number } }[] };
    const f = json.features?.[0];
    if (!f || f.properties.score < 0.5) return null;
    return { longitude: f.geometry.coordinates[0], latitude: f.geometry.coordinates[1] };
  } catch {
    return null;
  }
}
