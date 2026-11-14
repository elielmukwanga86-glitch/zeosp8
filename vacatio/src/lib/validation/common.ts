import { z } from 'zod';

/** Chaîne vide → null. */
export const opt = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : v), schema.nullable());

export const optText = (max = 500) => opt(z.string().trim().max(max));
export const uuid = z.uuid('Identifiant invalide');
export const optUuid = opt(z.uuid());
export const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure invalide (HH:MM)');
export const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide');
export const optDay = opt(day);
export const checkbox = z.preprocess((v) => v === 'on' || v === 'true' || v === true, z.boolean());

/** Nombre saisi à la française (virgule acceptée). */
export const num = (min = 0, max = 1e9) =>
  z.preprocess((v) => (typeof v === 'string' ? Number(v.replace(',', '.').replace(/\s/g, '')) : v),
    z.number({ error: 'Nombre invalide' }).min(min).max(max));
export const optNum = (min = 0, max = 1e9) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : v), num(min, max).nullable());

/** Montant en euros saisi → centimes. */
export const euros = z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : v),
  num(0, 1_000_000).transform((n) => Math.round(n * 100)).nullable());
