'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ORG_COOKIE } from '@/lib/auth/context';
import type { FormState } from '@/lib/validation/auth';

export async function acceptInvitation(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get('token') ?? '');
  if (token.length < 20 || token.length > 100) return { error: 'Invitation invalide.' };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('accept_invitation', { p_token: token });
  if (error) return { error: error.message };
  (await cookies()).set(ORG_COOKIE, data as string, { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60 * 24 * 365 });
  redirect('/app');
}
