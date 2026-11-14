import { z } from 'zod';

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : v), schema.nullable());

export const organizationSchema = z.object({
  name: z.string().trim().min(2, 'Nom trop court').max(120),
  legal_name: optional(z.string().trim().max(160)),
  legal_form: optional(z.string().trim().max(40)),
  siret: optional(z.string().trim().transform((v) => v.replace(/\s/g, '')).pipe(z.string().regex(/^\d{14}$/, 'SIRET : 14 chiffres'))),
  vat_number: optional(z.string().trim().toUpperCase().transform((v) => v.replace(/\s/g, '')).pipe(z.string().regex(/^FR[0-9A-Z]{2}\d{9}$/, 'Format attendu : FR + 11 caractères'))),
  rcs_city: optional(z.string().trim().max(80)),
  address_line1: optional(z.string().trim().max(160)),
  postal_code: optional(z.string().trim().regex(/^\d{5}$/, 'Code postal : 5 chiffres')),
  city: optional(z.string().trim().max(80)),
  phone: optional(z.string().trim().max(20)),
  email: optional(z.email('E-mail invalide').trim()),
});
