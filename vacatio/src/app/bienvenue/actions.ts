'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { ORG_COOKIE } from '@/lib/auth/context';
import type { FormState } from '@/lib/validation/auth';

const schema = z.object({ companyName: z.string().trim().min(2, "Nom d'entreprise trop court").max(120) });

export async function createOrganization(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: { companyName: parsed.error.issues[0]?.message } };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_organization', { p_name: parsed.data.companyName });
  if (error) return { error: error.message.includes('maximal') ? 'Vous avez atteint le nombre maximal d’entreprises.' : 'Création impossible, réessayez.' };
  (await cookies()).set(ORG_COOKIE, data as string, { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60 * 24 * 365 });
  redirect('/app');
}
