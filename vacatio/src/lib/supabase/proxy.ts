import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { publicEnv } from '@/lib/env';

/** Préfixes réservés aux utilisateurs connectés. */
const PROTECTED = ['/app', '/agent', '/admin', '/bienvenue'];
/** Exceptions publiques à l'intérieur des préfixes protégés. */
const PUBLIC = ['/agent/connexion'];

/** Rafraîchit la session Supabase à chaque requête et protège les espaces connectés. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Ne rien intercaler entre createServerClient et getClaims (recommandation Supabase).
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims?.sub);

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(`${p}/`)) && !PUBLIC.includes(path);
  if (!isLoggedIn && isProtected) {
    const url = request.nextUrl.clone();
    // Les agents se reconnectent par SMS, les autres par e-mail.
    url.pathname = path.startsWith('/agent') ? '/agent/connexion' : '/connexion';
    url.search = '';
    url.searchParams.set('suite', path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return response;
}
