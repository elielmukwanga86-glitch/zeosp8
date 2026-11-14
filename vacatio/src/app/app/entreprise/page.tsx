import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { effectivePlan, PLANS } from '@/config/plans';
import { formatDate } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OrganizationForm, type OrgFormValues } from './form';

export const metadata: Metadata = { title: 'Entreprise' };

const STATUS: Record<string, string> = {
  trialing: 'Essai gratuit', active: 'Actif', past_due: 'Paiement en retard', canceled: 'Résilié',
  incomplete: 'Paiement incomplet', unpaid: 'Impayé', free: 'Gratuit',
};

export default async function EntreprisePage() {
  const ctx = await requireRole('gerant');
  const supabase = await createClient();
  const { data: org, error } = await supabase
    .from('organizations')
    .select('name, legal_name, legal_form, siret, vat_number, rcs_city, address_line1, postal_code, city, phone, email')
    .eq('id', ctx.org.id)
    .single();
  if (error) throw new Error(error.message);
  const plan = effectivePlan(ctx.org);

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Entreprise</h1>
      <Card>
        <CardHeader>
          <CardTitle>Informations légales</CardTitle>
          <CardDescription>Elles apparaissent sur vos devis et factures (mentions obligatoires).</CardDescription>
        </CardHeader>
        <CardContent><OrganizationForm values={org as OrgFormValues} /></CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Abonnement</CardTitle>
          <CardDescription>Le choix du forfait et le paiement en ligne (Stripe) arrivent en phase 5.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm">
          <p>Forfait : <strong>{PLANS[plan].name}</strong></p>
          <p>Statut : {STATUS[ctx.org.subscription_status] ?? ctx.org.subscription_status}</p>
          {ctx.org.trial_ends_at && ctx.org.subscription_status === 'trialing' && <p>Fin de l’essai : {formatDate(ctx.org.trial_ends_at)}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
