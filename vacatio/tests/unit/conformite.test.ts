import { describe, expect, it } from 'vitest';
import { REGLES_PAR_DEFAUT, reglesPourEntreprise } from '@/config/conformite/regles';
import { controlerPlanning, dureeEffective } from '@/lib/planning/conformite';
import { suggererRemplacants, type CandidatInput } from '@/lib/planning/remplacants';
import { addDays, isoWeekKey, mondayOf, parisDay, parisTime, parisToUtc } from '@/lib/dates';

let n = 0;
const v = (day: string, start: string, end: string, breakMinutes = 0) => {
  const s = parisToUtc(day, start);
  let e = parisToUtc(day, end);
  if (e <= s) e = parisToUtc(addDays(day, 1), end);
  return { id: `v${++n}`, start: s, end: e, breakMinutes };
};
const codes = (vs: ReturnType<typeof v>[], hours = 24) => controlerPlanning(vs, { weeklyContractHours: hours }, REGLES_PAR_DEFAUT).map((x) => `${x.code}:${x.severite}`);

describe('dates en heure de Paris', () => {
  it('convertit en tenant compte de l’heure d’été', () => {
    expect(parisToUtc('2027-01-11', '06:00').toISOString()).toBe('2027-01-11T05:00:00.000Z');
    expect(parisToUtc('2027-07-12', '06:00').toISOString()).toBe('2027-07-12T04:00:00.000Z');
    expect(parisToUtc('2027-03-28', '05:00').toISOString()).toBe('2027-03-28T03:00:00.000Z');
    expect(parisDay(new Date('2027-01-10T23:30:00Z'))).toBe('2027-01-11');
    expect(parisTime(new Date('2027-07-12T04:00:00Z'))).toBe('06:00');
  });
  it('calcule lundi et semaine ISO', () => {
    expect(mondayOf('2027-01-17')).toBe('2027-01-11');
    expect(isoWeekKey('2027-01-01')).toBe('2026-W53');
    expect(isoWeekKey('2027-01-04')).toBe('2027-W01');
  });
});

describe('conformité', () => {
  it('accepte une semaine type à temps partiel avec une coupure', () => {
    const vs = ['2027-01-11', '2027-01-12', '2027-01-13', '2027-01-14'].flatMap((d) => [v(d, '06:00', '08:30'), v(d, '17:00', '19:00')]);
    expect(codes(vs)).toEqual([]);
  });

  it('détecte un repos quotidien inférieur à 11 h', () => {
    expect(codes([v('2027-01-11', '18:00', '22:00'), v('2027-01-12', '06:00', '09:00')])).toContain('repos_quotidien:bloquant');
  });

  it('détecte plus de 10 h dans la journée, pause déduite', () => {
    expect(codes([v('2027-01-11', '06:00', '17:00', 30)], 35)).toContain('duree_journaliere:bloquant');
    expect(codes([v('2027-01-11', '06:00', '16:30', 30)], 35)).not.toContain('duree_journaliere:bloquant');
    expect(dureeEffective(v('2027-01-11', '06:00', '09:00', 30))).toBe(2.5);
  });

  it('limite le nombre de coupures selon la durée du contrat', () => {
    const jour = [v('2027-01-11', '06:00', '07:00'), v('2027-01-11', '09:00', '10:00'), v('2027-01-11', '12:00', '13:00')];
    expect(codes(jour, 20)).not.toContain('coupures:bloquant'); // ≥ 16 h : 2 coupures
    expect(codes(jour, 10)).toContain('coupures:bloquant');      // < 16 h : 1 coupure
    expect(codes(jour, 35)).not.toContain('coupures:bloquant');  // temps plein : non concerné
  });

  it('contrôle les heures complémentaires d’un temps partiel', () => {
    const semaine = (hours: number) => ['2027-01-11', '2027-01-12', '2027-01-13', '2027-01-14', '2027-01-15']
      .map((d) => v(d, '06:00', parisTime(new Date(parisToUtc(d, '06:00').getTime() + (hours / 5) * 3_600_000))));
    expect(codes(semaine(20), 20)).toEqual([]);
    expect(codes(semaine(22), 20)).toContain('heures_complementaires:alerte');  // 2 h ≤ 1/10
    expect(codes(semaine(25), 20)).toContain('heures_complementaires:bloquant'); // 5 h > 2 h
    expect(codes(semaine(35), 30)).toContain('temps_plein_atteint:bloquant');
  });

  it('exige un repos hebdomadaire de 35 h', () => {
    const tousLesJours = Array.from({ length: 7 }, (_, i) => v(addDays('2027-01-11', i), '06:00', '09:00'));
    expect(codes(tousLesJours, 35)).toContain('repos_hebdo:bloquant');
    expect(codes(tousLesJours.slice(0, 6), 35)).not.toContain('repos_hebdo:bloquant');
  });

  it('limite la semaine à 48 h', () => {
    const vs = Array.from({ length: 5 }, (_, i) => v(addDays('2027-01-11', i), '06:00', '16:00'));
    vs.push(v('2027-01-16', '08:00', '08:30'));
    expect(codes(vs, 35)).toContain('duree_hebdo:bloquant');
  });

  it('applique les surcharges valides de l’entreprise et ignore les autres', () => {
    const r = reglesPourEntreprise({ heuresComplementairesMaxRatio: 0.33, reposQuotidienMinHeures: 'x', inconnu: 3 });
    expect(r.heuresComplementairesMaxRatio).toBe(0.33);
    expect(r.reposQuotidienMinHeures).toBe(11);
  });
});

describe('suggestion de remplaçants', () => {
  const cible = { ...v('2027-01-13', '06:00', '09:00'), siteId: 'site-A', siteLatitude: 48.8566, siteLongitude: 2.3522 };
  const base: Omit<CandidatInput, 'id' | 'nom'> = {
    weeklyContractHours: 24, homeLatitude: null, homeLongitude: null, sitesHabituels: [], vacations: [], absent: false, disponibilites: [],
  };
  it('exclut les absents, les agents déjà pris et ceux qui violeraient le repos', () => {
    const res = suggererRemplacants(cible, [
      { ...base, id: 'a', nom: 'Absent', absent: true },
      { ...base, id: 'b', nom: 'Pris', vacations: [v('2027-01-13', '07:00', '08:00')] },
      { ...base, id: 'c', nom: 'Fatigué', vacations: [v('2027-01-12', '21:00', '23:00')] },
      { ...base, id: 'd', nom: 'Indispo', disponibilites: [{ dayOfWeek: 3, start: '14:00', end: '20:00' }] },
      { ...base, id: 'e', nom: 'Libre' },
    ], REGLES_PAR_DEFAUT);
    expect(res.map((r) => r.agentId)).toEqual(['e']);
  });
  it('privilégie le site habituel et la proximité', () => {
    const res = suggererRemplacants(cible, [
      { ...base, id: 'loin', nom: 'Loin', homeLatitude: 48.70, homeLongitude: 2.10 },
      { ...base, id: 'proche', nom: 'Proche', homeLatitude: 48.86, homeLongitude: 2.35 },
      { ...base, id: 'habitue', nom: 'Habitué', sitesHabituels: ['site-A'], homeLatitude: 48.80, homeLongitude: 2.30 },
    ], REGLES_PAR_DEFAUT);
    expect(res.map((r) => r.agentId)).toEqual(['habitue', 'proche', 'loin']);
    expect(res[1]!.distanceKm).toBeLessThan(1);
  });
});
