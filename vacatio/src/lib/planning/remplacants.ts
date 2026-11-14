import type { ReglesConformite } from '@/config/conformite/regles';
import { distanceMeters } from '@/lib/geo';
import { controlerPlanning, dureeEffective, estBloquant, type VacationPlanifiee, type Violation } from './conformite';
import { isoWeekKey, isoWeekday, parisDay, parisTime } from '@/lib/dates';

export interface CandidatInput {
  id: string;
  nom: string;
  weeklyContractHours: number;
  homeLatitude: number | null;
  homeLongitude: number | null;
  sitesHabituels: string[];
  /** Vacations déjà planifiées autour de la date (au moins la semaine concernée). */
  vacations: VacationPlanifiee[];
  /** Absences qui chevauchent la vacation à couvrir. */
  absent: boolean;
  /** Disponibilités déclarées ; vide = disponible tout le temps. */
  disponibilites: { dayOfWeek: number; start: string; end: string }[];
}

export interface VacationACouvrir extends VacationPlanifiee {
  siteId: string;
  siteLatitude: number | null;
  siteLongitude: number | null;
}

export interface Suggestion {
  agentId: string;
  nom: string;
  score: number;
  distanceKm: number | null;
  raisons: string[];
  alertes: Violation[];
}

/**
 * Classe les agents capables de couvrir une vacation : disponibles, non absents,
 * sans chevauchement et sans violation bloquante des règles de conformité.
 * Score (plus haut = mieux) : site habituel, proximité, heures restantes au contrat,
 * pénalité pour les heures complémentaires.
 */
export function suggererRemplacants(vacation: VacationACouvrir, candidats: CandidatInput[], regles: ReglesConformite, limite = 5): Suggestion[] {
  const jour = parisDay(vacation.start);
  const semaine = isoWeekKey(jour);
  const debut = parisTime(vacation.start);
  const fin = parisTime(vacation.end);
  const out: Suggestion[] = [];

  for (const c of candidats) {
    if (c.absent) continue;
    if (c.vacations.some((v) => v.start < vacation.end && v.end > vacation.start)) continue;
    if (c.disponibilites.length > 0) {
      const jourIso = isoWeekday(jour);
      const ok = c.disponibilites.some((d) => d.dayOfWeek === jourIso && d.start <= debut && (fin <= d.end || fin < debut));
      if (!ok) continue;
    }
    const violations = controlerPlanning([...c.vacations, vacation], { weeklyContractHours: c.weeklyContractHours }, regles)
      .filter((v) => v.vacations.includes(vacation.id) || v.semaine === semaine);
    if (estBloquant(violations)) continue;

    const raisons: string[] = [];
    let score = 50;
    if (c.sitesHabituels.includes(vacation.siteId)) { score += 25; raisons.push('Connaît le site'); }

    let distanceKm: number | null = null;
    if (c.homeLatitude !== null && c.homeLongitude !== null && vacation.siteLatitude !== null && vacation.siteLongitude !== null) {
      distanceKm = distanceMeters(c.homeLatitude, c.homeLongitude, vacation.siteLatitude, vacation.siteLongitude) / 1000;
      score += Math.max(0, 20 - distanceKm * 2);
      raisons.push(`${distanceKm.toFixed(1).replace('.', ',')} km`);
    }

    const planifiees = c.vacations.filter((v) => isoWeekKey(parisDay(v.start)) === semaine).reduce((s, v) => s + dureeEffective(v), 0);
    const restantes = c.weeklyContractHours - planifiees;
    if (restantes >= dureeEffective(vacation)) { score += 15; raisons.push('Heures disponibles au contrat'); }
    if (violations.some((v) => v.code === 'heures_complementaires')) { score -= 10; raisons.push('Heures complémentaires'); }

    out.push({ agentId: c.id, nom: c.nom, score: Math.round(score), distanceKm, raisons, alertes: violations });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limite);
}
