import 'server-only';
import { cookies } from 'next/headers';
import { LOCALE_COOKIE, isAgentLocale, type AgentLocale } from '@/i18n/agent';

/** Langue de l'agent : cookie (choix explicite) sinon français. */
export async function currentAgentLocale(): Promise<AgentLocale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isAgentLocale(value) ? value : 'fr';
}
