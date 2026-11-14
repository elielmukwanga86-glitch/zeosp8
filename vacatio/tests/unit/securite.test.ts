import { describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { generateToken, hashToken } from '@/lib/tokens';
import { safeNextPath } from '@/lib/safe-redirect';
import { phoneSchema, signUpSchema } from '@/lib/validation/auth';

describe('jetons', () => {
  it('l’empreinte Node est identique à celle calculée en SQL', async () => {
    const db = new PGlite();
    const token = generateToken();
    const { rows } = await db.query<{ h: string }>(`select encode(sha256(convert_to($1, 'UTF8')), 'hex') as h`, [token]);
    expect(rows[0]!.h).toBe(hashToken(token));
    await db.close();
  });
  it('génère des jetons longs et uniques', () => {
    const a = generateToken(); const b = generateToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43);
  });
});

describe('redirections', () => {
  it('refuse les redirections externes', () => {
    expect(safeNextPath('/app/planning')).toBe('/app/planning');
    expect(safeNextPath('https://pirate.example')).toBe('/app');
    expect(safeNextPath('//pirate.example')).toBe('/app');
    expect(safeNextPath('/\\pirate.example')).toBe('/app');
    expect(safeNextPath(null, '/agent')).toBe('/agent');
  });
});

describe('validation', () => {
  it('normalise les numéros de mobile français', () => {
    expect(phoneSchema.parse('06 12 34 56 78')).toBe('+33612345678');
    expect(phoneSchema.parse('0033 7 12 34 56 78')).toBe('+33712345678');
    expect(phoneSchema.parse('+351 912 345 678')).toBe('+351912345678');
    expect(phoneSchema.safeParse('12').success).toBe(false);
  });
  it('exige l’acceptation des CGU et un mot de passe de 10 caractères', () => {
    const base = { fullName: 'Awa', companyName: 'Net Pro', email: 'awa@netpro.fr', password: 'motdepasse-solide' };
    expect(signUpSchema.safeParse({ ...base, acceptTerms: 'on' }).success).toBe(true);
    expect(signUpSchema.safeParse(base).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, password: 'court', acceptTerms: 'on' }).success).toBe(false);
  });
});
