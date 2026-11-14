'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { fieldErrors, type FormState } from '@/lib/validation/auth';
import { organizationSchema } from '@/lib/validation/organization';

export async function updateOrganization(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireRole('gerant');
  const parsed = organizationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const complete = Boolean(parsed.data.legal_name && parsed.data.siret && parsed.data.address_line1 && parsed.data.postal_code && parsed.data.city);
  const { error } = await supabase
    .from('organizations')
    .update({ ...parsed.data, onboarding: { ...ctx.org.onboarding, entreprise: complete } })
    .eq('id', ctx.org.id);
  if (error) return { error: 'Enregistrement impossible.' };
  revalidatePath('/app', 'layout');
  return { ok: true, message: 'Informations enregistrées.' };
}
