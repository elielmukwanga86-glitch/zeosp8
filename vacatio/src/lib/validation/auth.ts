import { z } from 'zod';

const email = z.email('Adresse e-mail invalide').trim().toLowerCase().max(254);
const password = z.string().min(10, '10 caractères minimum').max(72, '72 caractères maximum');

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, 'Indiquez votre nom').max(120),
  companyName: z.string().trim().min(2, "Indiquez le nom de l'entreprise").max(120),
  email,
  password,
  acceptTerms: z.literal('on', { error: 'Vous devez accepter les CGU' }),
});

/** Inscription d'une personne invitée : pas de création d'entreprise. */
export const invitedSignUpSchema = signUpSchema.omit({ companyName: true });

export const signInSchema = z.object({ email, password: z.string().min(1, 'Mot de passe requis') });
export const emailOnlySchema = z.object({ email });
export const resetPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Les mots de passe diffèrent' });

/** Numéro mobile français ou international, normalisé en E.164. */
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s.()-]/g, ''))
  .transform((v) => (v.startsWith('00') ? `+${v.slice(2)}` : /^0[67]\d{8}$/.test(v) ? `+33${v.slice(1)}` : v))
  .pipe(z.string().regex(/^\+[1-9]\d{6,14}$/, 'Numéro de téléphone invalide'));

export const inviteSchema = z.object({
  email,
  role: z.enum(['gerant', 'chef_equipe']),
});

export type FormState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string | undefined>;
};

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    out[key] ??= issue.message;
  }
  return out;
}
