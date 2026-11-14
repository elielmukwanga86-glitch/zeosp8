import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ORG_COOKIE } from '@/lib/auth/context';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const response = NextResponse.redirect(new URL('/connexion', request.url), { status: 303 });
  response.cookies.delete(ORG_COOKIE);
  return response;
}
