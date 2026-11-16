/** Distance en mètres entre deux points GPS (formule de haversine). */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * « Sur place » si la distance au site est inférieure au rayon autorisé,
 * augmenté de la précision annoncée par le téléphone (plafonnée à 100 m).
 */
export function isOnSite(
  site: { lat: number; lng: number; radiusM: number },
  position: { lat: number; lng: number; accuracyM?: number },
): boolean {
  const margin = Math.min(Math.max(position.accuracyM ?? 0, 0), 100);
  return distanceMeters(site, position) <= site.radiusM + margin;
}
