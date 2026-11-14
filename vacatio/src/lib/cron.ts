import 'server-only';
import { timingSafeEqual } from 'node:crypto';

/** Vercel Cron envoie « Authorization: Bearer <CRON_SECRET> ». */
export function isAuthorizedCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
