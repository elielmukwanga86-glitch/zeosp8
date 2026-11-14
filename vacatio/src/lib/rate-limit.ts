import 'server-only';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

/** Adresse IP du client (en-têtes Vercel). */
export async function clientIp() {
  const h = await headers();
  return h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'inconnue';
}

/**
 * Limitation de débit stockée en base (fenêtre fixe). Renvoie false si la limite est dépassée.
 * En cas d'indisponibilité de la base, on laisse passer (fail-open) mais on journalise.
 */
export async function rateLimit(key: string, max: number, windowSeconds: number) {
  const { data, error } = await createAdminClient().rpc('check_rate_limit', {
    p_key: key, p_max: max, p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error('[rate-limit] indisponible', error.message);
    return true;
  }
  return data === true;
}
