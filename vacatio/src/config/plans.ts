/**
 * Forfaits Vacatio (prix HT mensuels). Les limites `agents`, `sites` et `chefs`
 * DOIVENT rester identiques à app.plan_limits() en base : un test le vérifie.
 */
export type PlanCode = 'decouverte' | 'essentiel' | 'pro' | 'business';

export type Feature =
  | 'planning' | 'pointage' | 'absences' | 'conformite' | 'clients_sites' | 'agents' | 'export_paie'
  | 'qualite' | 'reclamations' | 'portail_client' | 'facturation' | 'relances' | 'rentabilite' | 'tableau_de_bord'
  | 'article7' | 'stocks' | 'messagerie' | 'multi_chefs' | 'support_prioritaire';

export interface Plan {
  code: PlanCode;
  name: string;
  monthlyPriceCents: number;
  limits: { agents: number | null; sites: number | null; chefs: number | null };
  /** Au-delà de 50 agents en Business : 3 € HT par agent actif supplémentaire. */
  extraAgentCents?: number;
  includedAgents?: number;
  features: readonly Feature[];
  highlighted?: boolean;
}

const BASE: Feature[] = ['planning', 'pointage'];
const ESSENTIEL: Feature[] = [...BASE, 'clients_sites', 'agents', 'absences', 'conformite', 'export_paie'];
const PRO: Feature[] = [...ESSENTIEL, 'qualite', 'reclamations', 'portail_client', 'facturation', 'relances', 'rentabilite', 'tableau_de_bord'];
const BUSINESS: Feature[] = [...PRO, 'article7', 'stocks', 'messagerie', 'multi_chefs', 'support_prioritaire'];

export const PLANS: Record<PlanCode, Plan> = {
  decouverte: { code: 'decouverte', name: 'Découverte', monthlyPriceCents: 0, limits: { agents: 3, sites: 2, chefs: 0 }, features: [...BASE, 'clients_sites', 'agents'] },
  essentiel: { code: 'essentiel', name: 'Essentiel', monthlyPriceCents: 3900, limits: { agents: 10, sites: null, chefs: 1 }, features: ESSENTIEL },
  pro: { code: 'pro', name: 'Pro', monthlyPriceCents: 8900, limits: { agents: 25, sites: null, chefs: 1 }, features: PRO, highlighted: true },
  business: {
    code: 'business', name: 'Business', monthlyPriceCents: 16900, limits: { agents: null, sites: null, chefs: null },
    includedAgents: 50, extraAgentCents: 300, features: BUSINESS,
  },
};

export const PLAN_ORDER: PlanCode[] = ['decouverte', 'essentiel', 'pro', 'business'];
export const TRIAL_DAYS = 14;
/** Annuel : 2 mois offerts → 10 mois payés. */
export const ANNUAL_MONTHS_BILLED = 10;

export function hasFeature(plan: PlanCode, feature: Feature) {
  return PLANS[plan].features.includes(feature);
}

/** Plus petit forfait qui débloque une fonctionnalité (pour le bouton « Passer au forfait supérieur »). */
export function minimumPlanFor(feature: Feature): PlanCode {
  return PLAN_ORDER.find((p) => hasFeature(p, feature)) ?? 'business';
}

export interface OrgBillingState {
  plan: PlanCode;
  subscription_status: string;
  trial_ends_at: string | null;
  is_demo: boolean;
}

/** Même logique que app.effective_plan() en base. */
export function effectivePlan(org: OrgBillingState, now = new Date()): PlanCode {
  if (org.is_demo) return 'business';
  if (org.subscription_status === 'trialing' && org.trial_ends_at && new Date(org.trial_ends_at) < now) return 'decouverte';
  if (['canceled', 'unpaid', 'incomplete'].includes(org.subscription_status)) return 'decouverte';
  return org.plan;
}

export function monthlyPriceFor(plan: PlanCode, activeAgents: number, interval: 'month' | 'year' = 'month') {
  const p = PLANS[plan];
  const extra = p.includedAgents && p.extraAgentCents ? Math.max(0, activeAgents - p.includedAgents) * p.extraAgentCents : 0;
  const monthly = p.monthlyPriceCents + extra;
  return interval === 'year' ? monthly * ANNUAL_MONTHS_BILLED : monthly;
}
