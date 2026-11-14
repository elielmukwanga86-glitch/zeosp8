/**
 * Règles de conformité appliquées au planning (module A6).
 *
 * Fichier séparé et modifiable : chaque valeur indique sa source. Une entreprise peut
 * surcharger ces valeurs (organizations.compliance_overrides) depuis /app/conformite.
 *
 * IMPORTANT : les valeurs marquées « À VALIDER » dépendent de la convention collective
 * des entreprises de propreté (IDCC 3043) et de ses avenants en vigueur. Elles sont
 * réglées sur une valeur prudente par défaut et doivent être confirmées avec le texte
 * de la convention ou un expert-comptable / juriste en droit social avant la mise en vente.
 */
export interface ReglesConformite {
  /** Repos quotidien minimal entre deux journées de travail (heures). */
  reposQuotidienMinHeures: number;
  /** Durée maximale de travail effectif sur une journée (heures). */
  dureeMaxJournaliereHeures: number;
  /** Amplitude maximale d'une journée : début de la 1re vacation → fin de la dernière (heures). */
  amplitudeMaxHeures: number;
  /** Durée maximale sur une semaine (heures). */
  dureeMaxHebdoHeures: number;
  /** Durée moyenne maximale sur une période glissante (heures) et longueur de la période (semaines). */
  dureeMoyenneMaxHebdoHeures: number;
  semainesPourMoyenne: number;
  /** Repos hebdomadaire minimal (24 h + 11 h de repos quotidien). */
  reposHebdoMinHeures: number;
  /** Durée légale hebdomadaire : un temps partiel ne peut pas l'atteindre par des heures complémentaires. */
  dureeLegaleHebdoHeures: number;
  /** Heures complémentaires autorisées, en proportion de la durée du contrat (temps partiel). */
  heuresComplementairesMaxRatio: number;
  /**
   * Nombre maximal de coupures (interruptions) par jour selon la durée hebdomadaire du contrat.
   * La première ligne dont `contratHebdoMin` est atteint (en partant du haut) s'applique.
   */
  coupures: { contratHebdoMin: number; maxCoupures: number }[];
  /** Durée maximale d'une coupure (heures) ; null = pas de contrôle. */
  dureeMaxCoupureHeures: number | null;
  /** Plage des heures de nuit (heure de Paris), utilisée pour la paie (phase 4). */
  nuit: { debut: string; fin: string };
}

export const REGLES_PAR_DEFAUT: ReglesConformite = {
  reposQuotidienMinHeures: 11,        // Code du travail, art. L3131-1
  dureeMaxJournaliereHeures: 10,      // Code du travail, art. L3121-18
  amplitudeMaxHeures: 13,             // conséquence du repos quotidien de 11 h
  dureeMaxHebdoHeures: 48,            // Code du travail, art. L3121-20
  dureeMoyenneMaxHebdoHeures: 44,     // Code du travail, art. L3121-22
  semainesPourMoyenne: 12,            // Code du travail, art. L3121-22
  reposHebdoMinHeures: 35,            // Code du travail, art. L3132-2 (24 h + 11 h)
  dureeLegaleHebdoHeures: 35,         // Code du travail, art. L3121-27 et L3123-9
  heuresComplementairesMaxRatio: 0.1, // Code du travail, art. L3123-28 (1/10). À VALIDER : la CCN peut porter la limite au 1/3.
  coupures: [                         // À VALIDER avec l'avenant « temps partiel » de la CCN propreté
    { contratHebdoMin: 16, maxCoupures: 2 },
    { contratHebdoMin: 0, maxCoupures: 1 },
  ],
  dureeMaxCoupureHeures: null,        // À VALIDER (Code du travail L3123-30 : 2 h par défaut, sauf accord)
  nuit: { debut: '21:00', fin: '06:00' }, // Code du travail, art. L3122-2 (par défaut). À VALIDER avec la CCN.
};

/** Fusionne les surcharges d'une entreprise (valeurs inconnues ou invalides ignorées). */
export function reglesPourEntreprise(overrides: unknown): ReglesConformite {
  if (!overrides || typeof overrides !== 'object') return REGLES_PAR_DEFAUT;
  const out: ReglesConformite = { ...REGLES_PAR_DEFAUT };
  for (const [key, value] of Object.entries(overrides as Record<string, unknown>)) {
    if (!(key in REGLES_PAR_DEFAUT)) continue;
    const ref = (REGLES_PAR_DEFAUT as unknown as Record<string, unknown>)[key];
    if (typeof ref === 'number' && typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      (out as unknown as Record<string, unknown>)[key] = value;
    } else if (key === 'dureeMaxCoupureHeures' && (value === null || (typeof value === 'number' && value > 0))) {
      out.dureeMaxCoupureHeures = value as number | null;
    } else if (key === 'coupures' && Array.isArray(value) && value.every((v) =>
      v && typeof v.contratHebdoMin === 'number' && typeof v.maxCoupures === 'number')) {
      out.coupures = [...value].sort((a, b) => b.contratHebdoMin - a.contratHebdoMin);
    }
  }
  return out;
}

export const LIBELLES_REGLES: Partial<Record<keyof ReglesConformite, string>> = {
  reposQuotidienMinHeures: 'Repos quotidien minimal (h)',
  dureeMaxJournaliereHeures: 'Durée maximale par jour (h)',
  amplitudeMaxHeures: 'Amplitude maximale par jour (h)',
  dureeMaxHebdoHeures: 'Durée maximale par semaine (h)',
  dureeMoyenneMaxHebdoHeures: 'Durée moyenne maximale par semaine (h)',
  semainesPourMoyenne: 'Période de calcul de la moyenne (semaines)',
  reposHebdoMinHeures: 'Repos hebdomadaire minimal (h)',
  dureeLegaleHebdoHeures: 'Durée légale hebdomadaire (h)',
  heuresComplementairesMaxRatio: 'Heures complémentaires max. (part du contrat, ex. 0,1)',
  dureeMaxCoupureHeures: 'Durée maximale d’une coupure (h)',
};
