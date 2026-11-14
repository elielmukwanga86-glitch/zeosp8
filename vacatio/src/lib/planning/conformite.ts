import type { ReglesConformite } from '@/config/conformite/regles';
import { hoursBetween, isoWeekKey, parisDay, parisToUtc, addDays, mondayOf } from '@/lib/dates';

export interface VacationPlanifiee {
  id: string;
  start: Date;
  end: Date;
  breakMinutes?: number;
}

export interface ContratAgent {
  weeklyContractHours: number;
}

export type CodeViolation =
  | 'repos_quotidien' | 'duree_journaliere' | 'amplitude' | 'coupures' | 'duree_coupure'
  | 'duree_hebdo' | 'moyenne_hebdo' | 'repos_hebdo' | 'heures_complementaires' | 'temps_plein_atteint' | 'chevauchement';

export interface Violation {
  code: CodeViolation;
  /** bloquant : à ne pas planifier ; alerte : possible mais à justifier (heures complémentaires…). */
  severite: 'bloquant' | 'alerte';
  message: string;
  jour?: string;
  semaine?: string;
  vacations: string[];
}

const h = (n: number) => `${Math.round(n * 100) / 100} h`.replace('.', ',');

/** Durée de travail effectif d'une vacation (pause déduite), en heures. */
export function dureeEffective(v: VacationPlanifiee) {
  return Math.max(0, hoursBetween(v.start, v.end) - (v.breakMinutes ?? 0) / 60);
}

/**
 * Contrôle le planning d'un agent. Fournir les vacations d'au moins la période contrôlée,
 * idéalement avec une semaine de contexte avant (repos, moyenne).
 */
export function controlerPlanning(vacations: VacationPlanifiee[], contrat: ContratAgent, regles: ReglesConformite): Violation[] {
  const sorted = [...vacations].sort((a, b) => a.start.getTime() - b.start.getTime());
  const violations: Violation[] = [];

  // Chevauchements (normalement impossibles en base, mais contrôlés avant enregistrement).
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!; const cur = sorted[i]!;
    if (cur.start < prev.end) {
      violations.push({ code: 'chevauchement', severite: 'bloquant', message: 'Deux vacations se chevauchent', vacations: [prev.id, cur.id], jour: parisDay(cur.start) });
    }
  }

  // Regroupement par journée (date de début, heure de Paris).
  const jours = new Map<string, VacationPlanifiee[]>();
  for (const v of sorted) {
    const k = parisDay(v.start);
    jours.set(k, [...(jours.get(k) ?? []), v]);
  }
  const clesJours = [...jours.keys()].sort();
  const tempsPartiel = contrat.weeklyContractHours < regles.dureeLegaleHebdoHeures;
  const maxCoupures = regles.coupures.find((c) => contrat.weeklyContractHours >= c.contratHebdoMin)?.maxCoupures ?? 1;

  clesJours.forEach((jour, index) => {
    const vs = jours.get(jour)!;
    const ids = vs.map((v) => v.id);
    const total = vs.reduce((s, v) => s + dureeEffective(v), 0);
    if (total > regles.dureeMaxJournaliereHeures + 1e-9) {
      violations.push({ code: 'duree_journaliere', severite: 'bloquant', jour, vacations: ids,
        message: `${h(total)} de travail sur la journée (maximum ${h(regles.dureeMaxJournaliereHeures)})` });
    }
    const debut = vs[0]!.start;
    const fin = new Date(Math.max(...vs.map((v) => v.end.getTime())));
    const amplitude = hoursBetween(debut, fin);
    if (amplitude > regles.amplitudeMaxHeures + 1e-9) {
      violations.push({ code: 'amplitude', severite: 'bloquant', jour, vacations: ids,
        message: `Amplitude de ${h(amplitude)} (maximum ${h(regles.amplitudeMaxHeures)})` });
    }

    // Coupures : interruptions entre deux vacations de la même journée.
    const coupures: number[] = [];
    for (let i = 1; i < vs.length; i++) {
      const gap = hoursBetween(vs[i - 1]!.end, vs[i]!.start);
      if (gap > 0) coupures.push(gap);
    }
    if (tempsPartiel && coupures.length > maxCoupures) {
      violations.push({ code: 'coupures', severite: 'bloquant', jour, vacations: ids,
        message: `${coupures.length} coupures dans la journée (maximum ${maxCoupures} pour un contrat de ${h(contrat.weeklyContractHours)} par semaine)` });
    }
    if (tempsPartiel && regles.dureeMaxCoupureHeures !== null) {
      const longue = coupures.find((c) => c > regles.dureeMaxCoupureHeures! + 1e-9);
      if (longue !== undefined) {
        violations.push({ code: 'duree_coupure', severite: 'bloquant', jour, vacations: ids,
          message: `Coupure de ${h(longue)} (maximum ${h(regles.dureeMaxCoupureHeures)})` });
      }
    }

    // Repos quotidien avec la journée travaillée précédente.
    if (index > 0) {
      const precedente = jours.get(clesJours[index - 1]!)!;
      const finPrecedente = new Date(Math.max(...precedente.map((v) => v.end.getTime())));
      const repos = hoursBetween(finPrecedente, debut);
      if (repos < regles.reposQuotidienMinHeures - 1e-9) {
        violations.push({ code: 'repos_quotidien', severite: 'bloquant', jour, vacations: [precedente.at(-1)!.id, vs[0]!.id],
          message: `Repos de ${h(repos)} seulement entre deux journées (minimum ${h(regles.reposQuotidienMinHeures)})` });
      }
    }
  });

  // Contrôles hebdomadaires (semaine ISO, heure de Paris).
  const semaines = new Map<string, VacationPlanifiee[]>();
  for (const v of sorted) {
    const k = isoWeekKey(parisDay(v.start));
    semaines.set(k, [...(semaines.get(k) ?? []), v]);
  }
  const totaux = new Map<string, number>();
  for (const [semaine, vs] of semaines) {
    const ids = vs.map((v) => v.id);
    const total = vs.reduce((s, v) => s + dureeEffective(v), 0);
    totaux.set(semaine, total);
    if (total > regles.dureeMaxHebdoHeures + 1e-9) {
      violations.push({ code: 'duree_hebdo', severite: 'bloquant', semaine, vacations: ids,
        message: `${h(total)} sur la semaine (maximum ${h(regles.dureeMaxHebdoHeures)})` });
    }
    if (tempsPartiel) {
      const complementaires = total - contrat.weeklyContractHours;
      const plafond = contrat.weeklyContractHours * regles.heuresComplementairesMaxRatio;
      if (total >= regles.dureeLegaleHebdoHeures - 1e-9) {
        violations.push({ code: 'temps_plein_atteint', severite: 'bloquant', semaine, vacations: ids,
          message: `${h(total)} planifiées : un temps partiel ne peut pas atteindre ${h(regles.dureeLegaleHebdoHeures)}` });
      } else if (complementaires > plafond + 1e-9) {
        violations.push({ code: 'heures_complementaires', severite: 'bloquant', semaine, vacations: ids,
          message: `${h(complementaires)} complémentaires (maximum ${h(plafond)} pour ce contrat)` });
      } else if (complementaires > 1e-9) {
        violations.push({ code: 'heures_complementaires', severite: 'alerte', semaine, vacations: ids,
          message: `${h(complementaires)} complémentaires cette semaine (majorées en paie)` });
      }
    }

    // Repos hebdomadaire : plus grand intervalle libre dans la semaine (lundi 0 h → lundi suivant 0 h).
    const lundi = mondayOf(parisDay(vs[0]!.start));
    const bornes = [parisToUtc(lundi, '00:00'), parisToUtc(addDays(lundi, 7), '00:00')] as const;
    let curseur = bornes[0];
    let plusGrandRepos = 0;
    const avant = sorted.filter((v) => v.end > bornes[0] && v.start < bornes[1]);
    for (const v of avant) {
      if (v.start > curseur) plusGrandRepos = Math.max(plusGrandRepos, hoursBetween(curseur, v.start));
      if (v.end > curseur) curseur = v.end;
    }
    if (bornes[1] > curseur) plusGrandRepos = Math.max(plusGrandRepos, hoursBetween(curseur, bornes[1]));
    if (plusGrandRepos < regles.reposHebdoMinHeures - 1e-9) {
      violations.push({ code: 'repos_hebdo', severite: 'bloquant', semaine, vacations: ids,
        message: `Pas de repos de ${h(regles.reposHebdoMinHeures)} consécutives dans la semaine` });
    }
  }

  // Moyenne sur N semaines glissantes (calculée seulement si assez de semaines fournies).
  const clesSemaines = [...totaux.keys()].sort();
  if (clesSemaines.length >= regles.semainesPourMoyenne) {
    for (let i = regles.semainesPourMoyenne - 1; i < clesSemaines.length; i++) {
      const fenetre = clesSemaines.slice(i - regles.semainesPourMoyenne + 1, i + 1);
      const moyenne = fenetre.reduce((s, k) => s + totaux.get(k)!, 0) / regles.semainesPourMoyenne;
      if (moyenne > regles.dureeMoyenneMaxHebdoHeures + 1e-9) {
        violations.push({ code: 'moyenne_hebdo', severite: 'bloquant', semaine: clesSemaines[i], vacations: [],
          message: `Moyenne de ${h(moyenne)} par semaine sur ${regles.semainesPourMoyenne} semaines (maximum ${h(regles.dureeMoyenneMaxHebdoHeures)})` });
      }
    }
  }

  return violations;
}

export function estBloquant(violations: Violation[]) {
  return violations.some((v) => v.severite === 'bloquant');
}
