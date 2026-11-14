import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { publicEnv } from '@/lib/env';
import { serverEnv } from '@/lib/env.server';

/**
 * Client « service_role » : contourne la RLS. À n'utiliser QUE côté serveur, pour des
 * opérations déjà autorisées par le code appelant (webhooks, portail client, liens agents).
 * Toujours filtrer explicitement par org_id.
 */
export function createAdminClient() {
  return createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
