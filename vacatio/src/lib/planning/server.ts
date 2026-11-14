import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { reglesPourEntreprise, type ReglesConformite } from '@/config/conformite/regles';
import { controlerPlanning, type VacationPlanifiee, type Violation } from './conformite';
import { isoWeekKey, parisDay } from '@/lib/dates';

export async function loadRules(supabase: SupabaseClient, orgId: string): Promise<ReglesConformite> {
  const { data } = await supabase.from('organizations').select('compliance_overrides').eq('id', orgId).single();
  return reglesPourEntreprise(data?.compliance_overrides);
}

export interface ShiftRow { id: string; agent_id: string | null; starts_at: string; ends_at: string; break_minutes: number }

export const toVacation = (s: ShiftRow): VacationPlanifiee => ({ id: s.id, start: new Date(s.starts_at), end: new Date(s.ends_at), breakMinutes: s.break_minutes });

/**
 * Contrôle la conformité du planning d'un agent si on lui ajoute (ou déplace) une vacation.
 * Ne renvoie que les violations qui concernent cette vacation ou sa semaine.
 */
export async function checkAgentWithShift(
  supabase: SupabaseClient, orgId: string, agentId: string, candidate: VacationPlanifiee, rules: ReglesConformite,
): Promise<Violation[]> {
  const from = new Date(candidate.start.getTime() - 8 * 86_400_000).toISOString();
  const to = new Date(candidate.start.getTime() + 8 * 86_400_000).toISOString();
  const [{ data: agent }, { data: shifts }] = await Promise.all([
    supabase.from('agents').select('weekly_contract_hours').eq('id', agentId).single(),
    supabase.from('shifts').select('id, agent_id, starts_at, ends_at, break_minutes')
      .eq('org_id', orgId).eq('agent_id', agentId).neq('status', 'cancelled').neq('id', candidate.id)
      .gte('starts_at', from).lte('starts_at', to),
  ]);
  if (!agent) return [];
  const semaine = isoWeekKey(parisDay(candidate.start));
  return controlerPlanning([...(shifts ?? []).map(toVacation), candidate], { weeklyContractHours: Number(agent.weekly_contract_hours) }, rules)
    .filter((v) => v.vacations.includes(candidate.id) || v.semaine === semaine);
}
