import { z } from 'zod';
import { checkbox, day, euros, num, opt, optDay, optNum, optText, optUuid, time, uuid } from './common';
import { phoneSchema } from './auth';

export const clientSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(160),
  kind: z.enum(['entreprise', 'copropriete', 'collectivite', 'particulier', 'autre']),
  siret: opt(z.string().trim().transform((v) => v.replace(/\s/g, '')).pipe(z.string().regex(/^\d{14}$/, 'SIRET : 14 chiffres'))),
  vat_number: optText(20),
  billing_email: opt(z.email('E-mail invalide').trim()),
  billing_address: optText(200),
  billing_postal_code: opt(z.string().trim().regex(/^\d{5}$/, 'Code postal : 5 chiffres')),
  billing_city: optText(80),
  payment_terms_days: optNum(0, 60),
  notes: optText(2000),
});

export const contactSchema = z.object({
  client_id: uuid,
  full_name: z.string().trim().min(1, 'Nom requis').max(120),
  role: optText(80),
  email: opt(z.email('E-mail invalide').trim()),
  phone: optText(20),
  receives_reports: checkbox,
  receives_invoices: checkbox,
});

export const siteSchema = z.object({
  client_id: uuid,
  name: z.string().trim().min(1, 'Nom requis').max(160),
  address_line1: optText(200),
  postal_code: opt(z.string().trim().regex(/^\d{5}$/, 'Code postal : 5 chiffres')),
  city: optText(80),
  zone_id: optUuid,
  instructions: optText(4000),
  geofence_radius_m: z.preprocess((v) => (v === '' || v == null ? 150 : v), num(20, 2000)),
  surface_m2: optNum(0, 1_000_000),
});

export const accessCodeSchema = z.object({ site_id: uuid, label: z.string().trim().min(1).max(80), secret: z.string().trim().min(1).max(200) });
export const areaSchema = z.object({ site_id: uuid, name: z.string().trim().min(1).max(80) });
export const taskSchema = z.object({
  site_id: uuid,
  area_id: optUuid,
  label: z.string().trim().min(1, 'Tâche requise').max(200),
  frequency: z.enum(['quotidienne', 'hebdomadaire', 'bimensuelle', 'mensuelle', 'trimestrielle', 'annuelle', 'ponctuelle']),
});

export const contractSchema = z.object({
  site_id: uuid,
  reference: optText(60),
  starts_on: day,
  ends_on: optDay,
  hours_sold_per_month: optNum(0, 10_000),
  pricing_mode: z.enum(['hourly', 'flat_monthly']),
  hourly_price: euros,
  monthly_price: euros,
  vat_rate: num(0, 100),
}).refine((v) => !v.ends_on || v.ends_on >= v.starts_on, { path: ['ends_on'], message: 'La fin doit suivre le début' })
  .refine((v) => (v.pricing_mode === 'hourly' ? v.hourly_price !== null : v.monthly_price !== null), { path: ['hourly_price'], message: 'Prix requis' });

export const scheduleSchema = z.object({
  contract_id: uuid,
  site_id: uuid,
  days: z.array(z.coerce.number().int().min(1).max(7)).min(1, 'Choisissez au moins un jour'),
  start_time: time,
  end_time: time,
  agents_needed: num(1, 50).pipe(z.number().int()),
  week_parity: z.enum(['all', 'even', 'odd']),
  default_agent_id: optUuid,
}).refine((v) => v.start_time !== v.end_time, { path: ['end_time'], message: 'Horaires identiques' });

export const agentSchema = z.object({
  first_name: z.string().trim().min(1, 'Prénom requis').max(80),
  last_name: z.string().trim().min(1, 'Nom requis').max(80),
  phone: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : v), phoneSchema.nullable()),
  email: opt(z.email('E-mail invalide').trim()),
  language: z.enum(['fr', 'en', 'pt', 'es', 'ar']),
  employee_number: optText(30),
  contract_type: z.enum(['cdi', 'cdd', 'interim', 'extra']),
  contract_start: optDay,
  contract_end: optDay,
  weekly_contract_hours: num(0, 48),
  seniority_date: optDay,
  qualification: optText(20),
  hourly_rate: euros,
  home_postal_code: opt(z.string().trim().regex(/^\d{5}$/, 'Code postal : 5 chiffres')),
  has_driving_licence: checkbox,
  transferred_from: optText(160),
  notes: optText(2000),
}).refine((v) => !v.contract_end || !v.contract_start || v.contract_end >= v.contract_start, { path: ['contract_end'], message: 'La fin doit suivre le début' });

export const availabilitySchema = z.object({
  agent_id: uuid,
  days: z.array(z.coerce.number().int().min(1).max(7)).min(1, 'Choisissez au moins un jour'),
  start_time: time,
  end_time: time,
});

export const documentSchema = z.object({
  agent_id: uuid,
  doc_type: z.enum(['contrat', 'avenant', 'titre_sejour', 'piece_identite', 'carte_vitale', 'visite_medicale', 'habilitation', 'diplome', 'rib', 'autre']),
  label: optText(120),
  expires_on: optDay,
});

export const shiftSchema = z.object({
  id: optUuid,
  site_id: uuid,
  agent_id: optUuid,
  day,
  start_time: time,
  end_time: time,
  break_minutes: z.preprocess((v) => (v === '' || v == null ? 0 : v), num(0, 240)),
  notes: optText(500),
  billable: checkbox,
  force: checkbox,
});

export const absenceSchema = z.object({
  agent_id: uuid,
  start_day: day,
  end_day: day,
  reason: z.enum(['maladie', 'conges_payes', 'absence_injustifiee', 'accident_travail', 'evenement_familial', 'formation', 'sans_solde', 'autre']),
  comment: optText(500),
}).refine((v) => v.end_day >= v.start_day, { path: ['end_day'], message: 'La fin doit suivre le début' });

export const DOC_TYPES: Record<string, string> = {
  contrat: 'Contrat de travail', avenant: 'Avenant', titre_sejour: 'Titre de séjour', piece_identite: 'Pièce d’identité',
  carte_vitale: 'Carte Vitale', visite_medicale: 'Visite médicale', habilitation: 'Habilitation', diplome: 'Diplôme', rib: 'RIB', autre: 'Autre',
};
export const ABSENCE_REASONS: Record<string, string> = {
  maladie: 'Maladie', conges_payes: 'Congés payés', absence_injustifiee: 'Absence injustifiée', accident_travail: 'Accident du travail',
  evenement_familial: 'Événement familial', formation: 'Formation', sans_solde: 'Congé sans solde', autre: 'Autre',
};
export const CONTRACT_TYPES: Record<string, string> = { cdi: 'CDI', cdd: 'CDD', interim: 'Intérim', extra: 'Extra' };
export const FREQUENCIES = ['quotidienne', 'hebdomadaire', 'bimensuelle', 'mensuelle', 'trimestrielle', 'annuelle', 'ponctuelle'] as const;
export const DAYS = [
  { v: 1, l: 'Lun' }, { v: 2, l: 'Mar' }, { v: 3, l: 'Mer' }, { v: 4, l: 'Jeu' }, { v: 5, l: 'Ven' }, { v: 6, l: 'Sam' }, { v: 7, l: 'Dim' },
];
