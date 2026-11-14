'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getMemberships, ORG_COOKIE } from '@/lib/auth/context';
import { homeForRole } from '@/config/roles';

/** Change d'entreprise active (uniquement parmi celles dont l'utilisateur est membre). */
export async function switchOrganization(formData: FormData) {
  const orgId = z.uuid().safeParse(formData.get('orgId'));
  if (!orgId.success) return;
  const membership = (await getMemberships()).find((m) => m.organization.id === orgId.data);
  if (!membership) return;
  (await cookies()).set(ORG_COOKIE, orgId.data, { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60 * 24 * 365 });
  redirect(homeForRole(membership.role));
}
