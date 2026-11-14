'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { friendlyError, parseForm } from '@/lib/actions';
import { geocodeAddress } from '@/lib/geocode';
import { markOnboarding } from '@/lib/onboarding';
import { clientSchema, contactSchema, siteSchema } from '@/lib/validation/operations';
import type { FormState } from '@/lib/validation/auth';

export async function createClientAction(_p: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireRole('gerant');
  const parsed = parseForm(clientSchema, formData);
  if (!parsed.ok) return parsed.state;
  const supabase = await createClient();
  const { data, error } = await supabase.from('clients').insert({ ...parsed.data, org_id: ctx.org.id }).select('id').single();
  if (error) return friendlyError(error);
  redirect(`/app/clients/${data.id}`);
}

export async function updateClientAction(_p: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireRole('gerant');
  const id = z.uuid().parse(formData.get('id'));
  const parsed = parseForm(clientSchema, formData);
  if (!parsed.ok) return parsed.state;
  const supabase = await createClient();
  const { error } = await supabase.from('clients').update(parsed.data).eq('id', id).eq('org_id', ctx.org.id);
  if (error) return friendlyError(error);
  revalidatePath(`/app/clients/${id}`);
  return { ok: true, message: 'Client enregistré.' };
}

export async function archiveClientAction(formData: FormData) {
  const ctx = await requireRole('gerant');
  const id = z.uuid().parse(formData.get('id'));
  const supabase = await createClient();
  await supabase.from('clients').update({ archived_at: new Date().toISOString() }).eq('id', id).eq('org_id', ctx.org.id);
  redirect('/app/clients');
}

export async function addContactAction(_p: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireRole('gerant');
  const parsed = parseForm(contactSchema, formData);
  if (!parsed.ok) return parsed.state;
  const supabase = await createClient();
  const { error } = await supabase.from('client_contacts').insert({ ...parsed.data, org_id: ctx.org.id });
  if (error) return friendlyError(error);
  revalidatePath(`/app/clients/${parsed.data.client_id}`);
  return { ok: true, message: 'Contact ajouté.' };
}

export async function deleteContactAction(formData: FormData) {
  const ctx = await requireRole('gerant');
  const id = z.uuid().parse(formData.get('id'));
  const clientId = z.uuid().parse(formData.get('client_id'));
  const supabase = await createClient();
  await supabase.from('client_contacts').delete().eq('id', id).eq('org_id', ctx.org.id);
  revalidatePath(`/app/clients/${clientId}`);
}

export async function createSiteAction(_p: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireRole('gerant');
  const parsed = parseForm(siteSchema, formData);
  if (!parsed.ok) return parsed.state;
  const coords = parsed.data.address_line1 ? await geocodeAddress(parsed.data.address_line1, parsed.data.postal_code, parsed.data.city) : null;
  const supabase = await createClient();
  const { data, error } = await supabase.from('sites').insert({ ...parsed.data, ...coords, org_id: ctx.org.id }).select('id').single();
  if (error) return friendlyError(error);
  await markOnboarding(ctx, 'sites');
  redirect(`/app/sites/${data.id}`);
}
