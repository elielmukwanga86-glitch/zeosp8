import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { effectivePlan, hasFeature, minimumPlanFor, monthlyPriceFor, PLAN_ORDER, PLANS } from '@/config/plans';
import { createDb } from '../db/harness';

let db: PGlite;
beforeAll(async () => { db = await createDb(); });
afterAll(async () => { await db.close(); });

describe('forfaits', () => {
  it('les limites TypeScript sont identiques à app.plan_limits() en base', async () => {
    for (const code of PLAN_ORDER) {
      const { rows } = await db.query<{ l: Record<string, number | null> }>(`select app.plan_limits($1::plan_code) as l`, [code]);
      expect(rows[0]!.l).toEqual(PLANS[code].limits);
    }
  });

  it('respecte la grille tarifaire', () => {
    expect(PLANS.essentiel.monthlyPriceCents).toBe(3900);
    expect(PLANS.pro.monthlyPriceCents).toBe(8900);
    expect(PLANS.business.monthlyPriceCents).toBe(16900);
    expect(monthlyPriceFor('business', 50)).toBe(16900);
    expect(monthlyPriceFor('business', 53)).toBe(16900 + 3 * 300);
    expect(monthlyPriceFor('pro', 10, 'year')).toBe(8900 * 10); // 2 mois offerts
  });

  it('associe les modules aux bons forfaits', () => {
    expect(hasFeature('decouverte', 'planning')).toBe(true);
    expect(hasFeature('decouverte', 'export_paie')).toBe(false);
    expect(minimumPlanFor('export_paie')).toBe('essentiel');
    expect(minimumPlanFor('facturation')).toBe('pro');
    expect(minimumPlanFor('stocks')).toBe('business');
  });

  it('un essai expiré retombe sur Découverte, la démo est en Business', () => {
    const now = new Date('2026-11-14T12:00:00Z');
    expect(effectivePlan({ plan: 'pro', subscription_status: 'trialing', trial_ends_at: '2026-11-20T00:00:00Z', is_demo: false }, now)).toBe('pro');
    expect(effectivePlan({ plan: 'pro', subscription_status: 'trialing', trial_ends_at: '2026-11-01T00:00:00Z', is_demo: false }, now)).toBe('decouverte');
    expect(effectivePlan({ plan: 'essentiel', subscription_status: 'canceled', trial_ends_at: null, is_demo: false }, now)).toBe('decouverte');
    expect(effectivePlan({ plan: 'essentiel', subscription_status: 'past_due', trial_ends_at: null, is_demo: false }, now)).toBe('essentiel');
    expect(effectivePlan({ plan: 'decouverte', subscription_status: 'free', trial_ends_at: null, is_demo: true }, now)).toBe('business');
  });
});
