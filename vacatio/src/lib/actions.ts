import 'server-only';
import { z } from 'zod';
import type { FormState } from '@/lib/validation/auth';
import { fieldErrors } from '@/lib/validation/auth';

interface PgLikeError { code?: string; message: string; details?: string | null }

/** Traduit une erreur Supabase/PostgreSQL en message compréhensible pour le gérant. */
export function friendlyError(error: PgLikeError): FormState {
  const msg = error.message ?? '';
  if (msg.includes('PLAN_LIMIT_AGENTS')) return { error: 'PLAN_LIMIT_AGENTS' };
  if (msg.includes('PLAN_LIMIT_SITES')) return { error: 'PLAN_LIMIT_SITES' };
  if (error.code === '23P01' || msg.includes('shifts_no_double_booking')) {
    return { error: 'Cet agent est déjà planifié sur ce créneau (double affectation).' };
  }
  if (error.code === '23505') return { error: 'Cet élément existe déjà.' };
  if (error.code === '23503') return { error: 'Élément lié introuvable ou utilisé ailleurs.' };
  if (error.code === '42501' || msg.includes('row-level security')) return { error: 'Vous n’avez pas les droits pour cette action.' };
  if (error.code === '23514') return { error: 'Valeur hors des limites autorisées.' };
  console.error('[action]', error.code, msg);
  return { error: 'Enregistrement impossible. Réessayez.' };
}

/** Valide un FormData avec un schéma Zod ; renvoie les erreurs par champ. */
export function parseForm<T extends z.ZodType>(schema: T, formData: FormData):
  { ok: true; data: z.infer<T> } | { ok: false; state: FormState } {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('$ACTION')) continue;
    if (key.endsWith('[]')) {
      const k = key.slice(0, -2);
      raw[k] = [...((raw[k] as unknown[]) ?? []), value];
    } else raw[key] = value;
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, state: { fieldErrors: fieldErrors(parsed.error) } };
  return { ok: true, data: parsed.data };
}
