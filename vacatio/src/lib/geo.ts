/** Distance à vol d'oiseau en mètres (formule de haversine), identique à app.distance_m(). */
export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = (v: number) => (v * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(a));
}
