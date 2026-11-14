import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAuthorizedCron } from '@/lib/cron';

export const dynamic = 'force-dynamic';

/** Chaque matin : documents RH qui expirent, purge des compteurs de limitation de débit. */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: 'non autorisé' }, { status: 401 });
  const admin = createAdminClient();
  const { data: docs } = await admin.rpc('detect_expiring_documents');
  await admin.from('rate_limits').delete().lt('window_start', new Date(Date.now() - 2 * 86_400_000).toISOString());
  return NextResponse.json({ documents: docs ?? 0 });
}
