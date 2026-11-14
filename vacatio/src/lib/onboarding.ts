import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { AuthContext } from '@/lib/auth/context';

/** Marque une étape de démarrage comme faite (checklist du tableau de bord). */
export async function markOnboarding(ctx: AuthContext, step: 'sites' | 'agents' | 'planning' | 'invitations') {
  if (ctx.role !== 'gerant' || ctx.org.onboarding?.[step]) return;
  const supabase = await createClient();
  await supabase.from('organizations').update({ onboarding: { ...ctx.org.onboarding, [step]: true } }).eq('id', ctx.org.id);
}
