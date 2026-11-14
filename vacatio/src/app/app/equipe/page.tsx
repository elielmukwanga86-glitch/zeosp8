import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { ROLE_LABELS, type AppRole } from '@/config/roles';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InviteForm } from './invite-form';
import { removeMember, revokeInvitation } from './actions';

export const metadata: Metadata = { title: 'Équipe et accès' };

export default async function EquipePage() {
  const ctx = await requireRole('gerant', 'chef_equipe');
  const supabase = await createClient();
  const isGerant = ctx.role === 'gerant';

  const [{ data: members }, { data: invitations }] = await Promise.all([
    supabase.from('memberships').select('id, role, is_owner, status, user_id, created_at')
      .eq('org_id', ctx.org.id).in('role', ['gerant', 'chef_equipe']).order('created_at'),
    isGerant
      ? supabase.from('invitations').select('id, email, role, expires_at').eq('org_id', ctx.org.id).is('accepted_at', null).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as { id: string; email: string; role: AppRole; expires_at: string }[] }),
  ]);
  const ids = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = ids.length ? await supabase.from('profiles').select('id, full_name').in('id', ids) : { data: [] };
  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Équipe et accès</h1>
        <p className="text-muted-foreground">Gérants et chefs d’équipe ayant accès au back-office. Les agents se connectent par SMS depuis leur fiche (module Agents, phase 2).</p>
      </div>

      {isGerant && (
        <Card>
          <CardHeader><CardTitle>Inviter une personne</CardTitle><CardDescription>Elle recevra un lien valable 7 jours.</CardDescription></CardHeader>
          <CardContent><InviteForm /></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Membres</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {(members ?? []).map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="font-medium">{names.get(m.user_id) || 'Sans nom'}</span>
                <Badge variant={m.role === 'gerant' ? 'default' : 'accent'}>{ROLE_LABELS[m.role as AppRole]}</Badge>
                {m.is_owner && <Badge variant="muted">Propriétaire</Badge>}
                {m.status !== 'active' && <Badge variant="warning">Suspendu</Badge>}
                {isGerant && !m.is_owner && m.user_id !== ctx.userId && (
                  <form action={removeMember} className="ms-auto">
                    <input type="hidden" name="id" value={m.id} />
                    <button className="text-sm font-medium text-destructive underline">Retirer l’accès</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {isGerant && (invitations ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle>Invitations en attente</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {(invitations ?? []).map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="font-medium">{i.email}</span>
                  <Badge variant="muted">{ROLE_LABELS[i.role as AppRole]}</Badge>
                  <span className="text-sm text-muted-foreground">expire le {formatDate(i.expires_at)}</span>
                  <form action={revokeInvitation} className="ms-auto">
                    <input type="hidden" name="id" value={i.id} />
                    <button className="text-sm font-medium text-destructive underline">Annuler</button>
                  </form>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
