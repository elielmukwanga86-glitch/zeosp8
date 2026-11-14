'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { REGLES_PAR_DEFAUT, reglesPourEntreprise } from '@/config/conformite/regles';
import type { FormState } from '@/lib/validation/auth';

const NUMERIC = Object.entries(REGLES_PAR_DEFAUT).filter(([, v]) => typeof v === 'number').map(([k]) => k);

/** Enregistre uniquement les valeurs différentes du défaut (champ vide = valeur par défaut). */
export async function saveRulesAction(_p: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireRole('gerant');
  const overrides: Record<string, unknown> = {};
  for (const key of NUMERIC) {
    const raw = String(formData.get(key) ?? '').trim().replace(',', '.');
    if (raw === '') continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 200) return { fieldErrors: { [key]: 'Valeur invalide' } };
    if (n !== (REGLES_PAR_DEFAUT as unknown as Record<string, number>)[key]) overrides[key] = n;
  }
  const coupure = String(formData.get('dureeMaxCoupureHeures') ?? '').trim().replace(',', '.');
  if (coupure !== '') overrides.dureeMaxCoupureHeures = Number(coupure);
  const c16 = Number(formData.get('coupuresAuDela16'));
  const cMoins = Number(formData.get('coupuresEnDessous16'));
  if ([c16, cMoins].every((n) => Number.isInteger(n) && n >= 0 && n <= 5) && (c16 !== 2 || cMoins !== 1)) {
    overrides.coupures = [{ contratHebdoMin: 16, maxCoupures: c16 }, { contratHebdoMin: 0, maxCoupures: cMoins }];
  }
  reglesPourEntreprise(overrides); // validation finale
  const supabase = await createClient();
  const { error } = await supabase.from('organizations').update({ compliance_overrides: overrides }).eq('id', ctx.org.id);
  if (error) return { error: 'Enregistrement impossible.' };
  revalidatePath('/app/conformite');
  return { ok: true, message: 'Règles enregistrées. Elles s’appliquent immédiatement au planning.' };
}
