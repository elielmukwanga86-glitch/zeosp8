'use server';

import { requestAgentLinkByPhone } from '@/lib/auth/agent-access';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { phoneSchema } from '@/lib/validation/auth';

export type AgentLinkState = { status?: 'sent' | 'invalid' | 'too_many' };

export async function requestAgentLink(_prev: AgentLinkState, formData: FormData): Promise<AgentLinkState> {
  const parsed = phoneSchema.safeParse(formData.get('phone'));
  if (!parsed.success) return { status: 'invalid' };
  const ip = await clientIp();
  if (!(await rateLimit(`agent-link:ip:${ip}`, 10, 900)) || !(await rateLimit(`agent-link:tel:${parsed.data}`, 3, 900))) {
    return { status: 'too_many' };
  }
  try {
    await requestAgentLinkByPhone(parsed.data);
  } catch (error) {
    console.error('[agent-link]', (error as Error).message);
  }
  // Réponse identique que le numéro soit connu ou non (pas d'énumération).
  return { status: 'sent' };
}
