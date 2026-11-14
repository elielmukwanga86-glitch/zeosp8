import 'server-only';
import { serverEnv } from '@/lib/env.server';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Envoi d'e-mail via l'API Resend. Sans clé (développement), l'e-mail est affiché dans la console.
 * Renvoie true si l'envoi a été accepté.
 */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const { RESEND_API_KEY, EMAIL_FROM } = serverEnv();
  if (!RESEND_API_KEY) {
    console.info(`[email:dev] → ${message.to} | ${message.subject}\n${message.text}`);
    return true;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: EMAIL_FROM, to: [message.to], subject: message.subject, html: message.html, text: message.text }),
  });
  if (!res.ok) console.error('[email] échec Resend', res.status, await res.text());
  return res.ok;
}

/**
 * Envoi de SMS transactionnel via l'API Brevo. Numéro au format international (+33…).
 * Sans clé (développement), le SMS est affiché dans la console.
 */
export async function sendSms(to: string, content: string): Promise<boolean> {
  const { BREVO_API_KEY, SMS_SENDER } = serverEnv();
  if (!BREVO_API_KEY) {
    console.info(`[sms:dev] → ${to} | ${content}`);
    return true;
  }
  const res = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender: SMS_SENDER, recipient: to.replace(/^\+/, ''), content, type: 'transactional' }),
  });
  if (!res.ok) console.error('[sms] échec Brevo', res.status, await res.text());
  return res.ok;
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Gabarit HTML minimal et sobre pour les e-mails transactionnels. */
export function emailLayout(title: string, bodyHtml: string, cta?: { label: string; url: string }) {
  const button = cta
    ? `<p style="margin:28px 0"><a href="${escapeHtml(cta.url)}" style="background:#0f2f57;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(cta.label)}</a></p>`
    : '';
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;color:#1e293b">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
<p style="font-size:20px;font-weight:700;color:#0f2f57;margin:0 0 24px">Vacatio</p>
<div style="background:#fff;border-radius:12px;padding:28px">
<h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(title)}</h1>${bodyHtml}${button}
</div>
<p style="font-size:12px;color:#64748b;margin-top:24px">Chaque vacation couverte, chaque heure facturée.</p>
</div></body></html>`;
}
