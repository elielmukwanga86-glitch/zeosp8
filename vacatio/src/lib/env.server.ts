import 'server-only';
import { z } from 'zod';

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  RESEND_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('Vacatio <bonjour@vacatio.fr>'),
  BREVO_API_KEY: z.string().optional().default(''),
  SMS_SENDER: z.string().max(11).default('Vacatio'),
  AGENT_EMAIL_DOMAIN: z.string().default('agents.vacatio.fr'),
});

let cached: z.infer<typeof serverSchema> | undefined;

/** Lecture paresseuse : n'échoue qu'au moment où une clé serveur est réellement utilisée. */
export function serverEnv() {
  cached ??= serverSchema.parse(process.env);
  return cached;
}
