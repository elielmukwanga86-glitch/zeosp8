import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAuthorizedCron } from '@/lib/cron';
import { notifyShiftChanges, processOutbox } from '@/lib/jobs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Toutes les 5 minutes : non-pointages, SMS de changement de planning, file d'envoi. */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: 'non autorisé' }, { status: 401 });
  const admin = createAdminClient();
  const { data: noShows, error } = await admin.rpc('detect_no_shows');
  if (error) console.error('[cron] detect_no_shows', error.message);
  const changes = await notifyShiftChanges(admin);
  const sent = await processOutbox(admin);
  return NextResponse.json({ noShows: noShows ?? 0, planningSms: changes, sent });
}
