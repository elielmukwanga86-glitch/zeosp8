/** Fonctions de dates en heure de Paris, sans dépendance. */
export const TZ = 'Europe/Paris';

const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

function parts(date: Date) {
  const p = Object.fromEntries(partsFormatter.formatToParts(date).map((x) => [x.type, x.value]));
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), h: Number(p.hour), min: Number(p.minute) };
}

/** Date locale de Paris au format AAAA-MM-JJ. */
export function parisDay(date: Date): string {
  const { y, m, d } = parts(date);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Heure locale de Paris au format HH:MM. */
export function parisTime(date: Date): string {
  const { h, min } = parts(date);
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** Convertit une date + heure de Paris (AAAA-MM-JJ, HH:MM) en instant UTC (gère l'heure d'été). */
export function parisToUtc(day: string, time: string): Date {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const [h, min] = time.split(':').map(Number) as [number, number];
  const naive = Date.UTC(y, m - 1, d, h, min);
  let guess = naive;
  for (let i = 0; i < 2; i++) {
    const p = parts(new Date(guess));
    const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min);
    guess = guess - (asUtc - naive);
  }
  return new Date(guess);
}

/** Ajoute n jours à une date AAAA-MM-JJ (calendrier, sans fuseau). */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** Jour de la semaine ISO (1 = lundi … 7 = dimanche) d'une date AAAA-MM-JJ. */
export function isoWeekday(day: string): number {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7) + 1;
}

export function mondayOf(day: string): string {
  return addDays(day, 1 - isoWeekday(day));
}

/** Clé de semaine ISO (AAAA-Wnn). */
export function isoWeekKey(day: string): string {
  const monday = mondayOf(day);
  const thursday = addDays(monday, 3);
  const [y] = thursday.split('-').map(Number) as [number];
  const jan4 = `${y}-01-04`;
  const week1Monday = mondayOf(jan4);
  const diff = (Date.parse(monday) - Date.parse(week1Monday)) / (7 * 86_400_000);
  return `${y}-W${String(diff + 1).padStart(2, '0')}`;
}

export function hoursBetween(a: Date, b: Date) {
  return (b.getTime() - a.getTime()) / 3_600_000;
}

export const JOURS_COURTS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];

export function formatDayLabel(day: string) {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Instant présent (ms). Les composants serveur sont rendus à chaque requête. */
export function nowMs() {
  return Date.now();
}
