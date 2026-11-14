import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'Europe/Paris' });
export function formatDate(value: string | Date) {
  return dateFormatter.format(typeof value === 'string' ? new Date(value) : value);
}

/** Nombre de jours (arrondi supérieur) avant une date ; négatif si dépassée. */
export function daysUntil(value: string | Date, now = new Date()) {
  const target = typeof value === 'string' ? new Date(value) : value;
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}
