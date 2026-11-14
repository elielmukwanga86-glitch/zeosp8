'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { publicEnv } from '@/lib/env';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { safeNextPath } from '@/lib/safe-redirect';
import {
  emailOnlySchema, fieldErrors, invitedSignUpSchema, resetPasswordSchema, signInSchema, signUpSchema, type FormState,
} from '@/lib/validation/auth';

const TOO_MANY = 'Trop de tentatives. Réessayez dans quelques minutes.';

function confirmUrl(next: string) {
  const url = new URL('/auth/confirm', publicEnv.NEXT_PUBLIC_APP_URL);
  url.searchParams.set('next', next);
  return url.toString();
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const suite = safeNextPath(formData.get('suite')?.toString(), '/bienvenue');
  const invited = suite.startsWith('/invitation/');
  const parsed = (invited ? invitedSignUpSchema : signUpSchema).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (!(await rateLimit(`signup:${await clientIp()}`, 5, 3600))) return { error: TOO_MANY };

  const { fullName, email, password } = parsed.data;
  const companyName = 'companyName' in parsed.data ? parsed.data.companyName : undefined;
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: confirmUrl(invited ? suite : '/bienvenue'),
      data: { full_name: fullName, company_name: companyName },
    },
  });
  if (error) {
    // Message neutre : ne pas révéler si l'adresse existe déjà.
    console.error('[signup]', error.message);
    if (error.code === 'weak_password') return { fieldErrors: { password: 'Mot de passe trop faible ou trop courant' } };
  }
  return { ok: true, message: `Un e-mail de confirmation a été envoyé à ${email}. Cliquez sur le lien pour activer votre compte.` };
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const ip = await clientIp();
  if (!(await rateLimit(`signin:${ip}`, 20, 900)) || !(await rateLimit(`signin:${parsed.data.email}`, 8, 900))) {
    return { error: TOO_MANY };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === 'email_not_confirmed') return { error: 'Confirmez d’abord votre adresse e-mail (lien reçu à l’inscription).' };
    return { error: 'E-mail ou mot de passe incorrect.' };
  }
  redirect(safeNextPath(formData.get('suite')?.toString(), '/app'));
}

export async function forgotPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailOnlySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (!(await rateLimit(`forgot:${await clientIp()}`, 5, 3600))) return { error: TOO_MANY };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: confirmUrl('/reinitialiser') });
  if (error) console.error('[forgot]', error.message);
  return { ok: true, message: 'Si un compte existe pour cette adresse, un lien de réinitialisation vient d’être envoyé.' };
}

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: 'Le lien a expiré. Refaites une demande de réinitialisation.' };
  redirect('/app');
}
