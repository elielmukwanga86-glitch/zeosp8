import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createDb, createUser } from './harness';

let db: PGlite;
let gerant: string, agentUser: string, org: string, site: string, agent: string, agent2: string, schedule: string;

async function one<T>(p: Promise<{ rows: T[] }>): Promise<T> {
  const row = (await p).rows[0];
  if (row === undefined) throw new Error('Aucune ligne');
  return row;
}
const id = async (sql: string, params: unknown[]) => (await one(db.query<{ id: string }>(sql, params))).id;

/** Exécute en tant que serveur (service_role). */
async function asService<T>(fn: () => Promise<T>): Promise<T> {
  await db.query(`select set_config('request.jwt.claim.role', 'service_role', false)`);
  try { return await fn(); } finally { await db.query(`select set_config('request.jwt.claim.role', '', false)`); }
}

beforeAll(async () => {
  db = await createDb();
  gerant = await createUser(db, 'g@org.fr');
  agentUser = await createUser(db, 'a@org.fr');
  org = (await asUser(db, gerant, (q) => one(q<{ id: string }>(`select public.create_organization('Org Test') as id`)), true)).id;
  const client = await id(`insert into clients (org_id, name) values ($1, 'Client') returning id`, [org]);
  // Site situé à Paris (coordonnées publiques de l'Hôtel de Ville).
  site = await id(`insert into sites (org_id, client_id, name, latitude, longitude, geofence_radius_m) values ($1, $2, 'Bureaux', 48.8566, 2.3522, 150) returning id`, [org, client]);
  await db.query(`insert into memberships (org_id, user_id, role) values ($1, $2, 'agent')`, [org, agentUser]);
  agent = await id(`insert into agents (org_id, user_id, first_name, last_name, weekly_contract_hours) values ($1, $2, 'Awa', 'Ba', 20) returning id`, [org, agentUser]);
  agent2 = await id(`insert into agents (org_id, first_name, last_name, weekly_contract_hours) values ($1, 'Rui', 'Costa', 20) returning id`, [org]);
  const contract = await id(`insert into service_contracts (org_id, site_id, starts_on, hourly_price_cents) values ($1, $2, '2027-01-01', 2600) returning id`, [org, site]);
  schedule = await id(`insert into contract_schedules (org_id, contract_id, day_of_week, start_time, end_time, agents_needed, default_agent_id)
                       values ($1, $2, 1, '06:00', '09:00', 2, $3) returning id`, [org, contract, agent]);
  await db.query(`insert into contract_schedules (org_id, contract_id, day_of_week, start_time, end_time) values ($1, $2, 5, '22:00', '01:00')`, [org, contract]);
});

describe('génération des récurrences', () => {
  it('crée les vacations en heure de Paris, y compris au changement d’heure', async () => {
    const n = await asUser(db, gerant, (q) => one(q<{ n: number }>(`select public.generate_contract_shifts($1, '2027-03-22', '2027-04-04') as n`, [org])), true);
    // 2 lundis × 2 agents + 2 vendredis de nuit = 6
    expect(n.n).toBe(6);
    const rows = (await db.query<{ utc: string; slot: number; agent_id: string | null }>(
      `select to_char(starts_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') as utc, slot, agent_id
         from shifts where contract_schedule_id = $1 order by starts_at, slot`, [schedule])).rows;
    expect(rows.map((r) => r.utc)).toEqual(['2027-03-22 05:00', '2027-03-22 05:00', '2027-03-29 04:00', '2027-03-29 04:00']);
    expect(rows.map((r) => r.agent_id)).toEqual([agent, null, agent, null]);
  });

  it('gère une vacation de nuit qui finit le lendemain', async () => {
    const r = await one(db.query<{ hours: number; day: number }>(
      `select extract(epoch from ends_at - starts_at) / 3600 as hours, extract(isodow from ends_at at time zone 'Europe/Paris') as day
         from shifts where org_id = $1 and contract_schedule_id <> $2 limit 1`, [org, schedule]));
    expect(Number(r.hours)).toBe(3);
    expect(Number(r.day)).toBe(6);
  });

  it('est idempotente', async () => {
    const n = await asUser(db, gerant, (q) => one(q<{ n: number }>(`select public.generate_contract_shifts($1, '2027-03-22', '2027-04-04') as n`, [org])), true);
    expect(n.n).toBe(0);
  });

  it('n’affecte pas l’agent habituel s’il est absent', async () => {
    await db.query(`insert into absences (org_id, agent_id, starts_at, ends_at, reason, status) values ($1, $2, '2027-04-05 00:00+02', '2027-04-06 00:00+02', 'conges_payes', 'approved')`, [org, agent]);
    await asUser(db, gerant, (q) => q(`select public.generate_contract_shifts($1, '2027-04-05', '2027-04-05')`, [org]), true);
    const r = await one(db.query<{ agent_id: string | null }>(`select agent_id from shifts where contract_schedule_id = $1 and slot = 1 and starts_at::date = '2027-04-05'`, [schedule]));
    expect(r.agent_id).toBeNull();
  });

  it('refuse un utilisateur extérieur', async () => {
    const autre = await createUser(db, 'x@autre.fr');
    await expect(asUser(db, autre, (q) => q(`select public.generate_contract_shifts($1, '2027-03-22', '2027-03-28')`, [org]))).rejects.toThrow(/Accès refusé/);
  });
});

describe('duplication et publication', () => {
  it('duplique une semaine en conservant l’heure locale', async () => {
    // Semaine du 22/03 (heure d'hiver) → semaine du 29/03 déjà remplie : rien en double.
    const n = await asUser(db, gerant, (q) => one(q<{ n: number }>(`select public.duplicate_week($1, '2027-03-22', '2027-04-12') as n`, [org])), true);
    expect(n.n).toBe(3);
    const r = await one(db.query<{ local: string }>(
      `select to_char(starts_at at time zone 'Europe/Paris', 'HH24:MI') as local from shifts where org_id = $1 and starts_at::date = '2027-04-12' limit 1`, [org]));
    expect(r.local).toBe('06:00');
  });

  it('publie les brouillons et trace les changements pour les agents', async () => {
    const n = await asUser(db, gerant, (q) => one(q<{ n: number }>(`select public.publish_shifts($1, '2027-03-22', '2027-03-28') as n`, [org])), true);
    expect(n.n).toBe(3);
    const c = await one(db.query<{ n: number }>(`select count(*)::int as n from shift_changes where org_id = $1 and agent_id = $2 and change = 'created'`, [org, agent]));
    expect(c.n).toBe(1);
    const agentSees = await asUser(db, agentUser, async (q) => (await q(`select id from shifts`)).rows.length);
    expect(agentSees).toBe(1);
  });
});

describe('pointage', () => {
  let shiftNow: string;
  beforeAll(async () => {
    shiftNow = await id(`insert into shifts (org_id, site_id, agent_id, starts_at, ends_at, status) values ($1, $2, $3, now() - interval '5 minutes', now() + interval '2 hours', 'published') returning id`, [org, site, agent]);
    await db.query(`insert into site_checkpoints (org_id, site_id, qr_token) values ($1, $2, 'qr-bureaux-123456')`, [org, site]);
  });

  it('enregistre l’arrivée par QR code sur site', async () => {
    const r = await asUser(db, agentUser, (q) => one(q<{ r: { flagged: boolean; shift_id: string } }>(
      `select public.clock($1, 'in', 'qr-bureaux-123456', null, 48.8567, 2.3523, 20) as r`, [org])), true);
    expect(r.r.flagged).toBe(false);
    expect(r.r.shift_id).toBe(shiftNow);
  });

  it('refuse un second pointage d’arrivée', async () => {
    await expect(asUser(db, agentUser, (q) => q(`select public.clock($1, 'in', 'qr-bureaux-123456')`, [org]))).rejects.toThrow(/AUCUNE_VACATION/);
  });

  it('signale un départ pointé loin du site', async () => {
    const r = await asUser(db, agentUser, (q) => one(q<{ r: { flagged: boolean; reason: string } }>(
      `select public.clock($1, 'out', null, null, 48.90, 2.40, 15) as r`, [org])), true);
    expect(r.r.flagged).toBe(true);
    expect(r.r.reason).toMatch(/m du site/);
  });

  it('refuse un QR code inconnu et un non-agent', async () => {
    await expect(asUser(db, agentUser, (q) => q(`select public.clock($1, 'in', 'faux')`, [org]))).rejects.toThrow(/QR_INCONNU/);
    await expect(asUser(db, gerant, (q) => q(`select public.clock($1, 'in', 'qr-bureaux-123456')`, [org]))).rejects.toThrow(/agents/);
  });
});

describe('non-pointage et remplacements', () => {
  it('alerte le gérant 15 min après le début sans pointage', async () => {
    const late = await id(`insert into shifts (org_id, site_id, agent_id, starts_at, ends_at, status) values ($1, $2, $3, now() - interval '20 minutes', now() + interval '1 hour', 'published') returning id`, [org, site, agent2]);
    const n = await asService(() => one(db.query<{ n: number }>(`select public.detect_no_shows() as n`)));
    expect(n.n).toBe(1);
    const again = await asService(() => one(db.query<{ n: number }>(`select public.detect_no_shows() as n`)));
    expect(again.n).toBe(0);
    const alert = await one(db.query<{ title: string }>(`select title from alerts where ref_id = $1`, [late]));
    expect(alert.title).toContain('Rui Costa');
  });

  it('libère les vacations d’un agent absent et crée une alerte', async () => {
    const future = await id(`insert into shifts (org_id, site_id, agent_id, starts_at, ends_at, status) values ($1, $2, $3, '2027-06-07 06:00+02', '2027-06-07 09:00+02', 'published') returning id`, [org, site, agent2]);
    const abs = await id(`insert into absences (org_id, agent_id, starts_at, ends_at, reason) values ($1, $2, '2027-06-07 00:00+02', '2027-06-08 00:00+02', 'maladie') returning id`, [org, agent2]);
    const n = await asUser(db, gerant, (q) => one(q<{ n: number }>(`select public.release_absence_shifts($1) as n`, [abs])), true);
    expect(n.n).toBe(1);
    const s = await one(db.query<{ agent_id: string | null; absence_id: string }>(`select agent_id, absence_id from shifts where id = $1`, [future]));
    expect(s).toEqual({ agent_id: null, absence_id: abs });
  });

  it('attribue la vacation au premier qui accepte, expire les autres propositions', async () => {
    const shift = (await one(db.query<{ id: string }>(`select id from shifts where absence_id is not null limit 1`))).id;
    await db.query(`insert into replacement_offers (org_id, shift_id, candidate_id, token_hash, expires_at) values
      ($1, $2, $3, 'h1', now() + interval '1 day'), ($1, $2, $4, 'h2', now() + interval '1 day')`, [org, shift, agent, agent2]);
    const r = await asService(() => one(db.query<{ r: { status: string } }>(`select public.respond_replacement('h1', true) as r`)));
    expect(r.r.status).toBe('accepted');
    const s = await one(db.query<{ agent_id: string; source: string; billable: boolean }>(`select agent_id, source, billable from shifts where id = $1`, [shift]));
    expect(s).toEqual({ agent_id: agent, source: 'replacement', billable: true });
    const other = await asService(() => one(db.query<{ r: { status: string } }>(`select public.respond_replacement('h2', true) as r`)));
    expect(other.r.status).toBe('expired');
    const unknown = await asService(() => one(db.query<{ r: { status: string } }>(`select public.respond_replacement('inconnu', true) as r`)));
    expect(unknown.r.status).toBe('invalid');
  });

  it('n’est pas appelable par un utilisateur', async () => {
    await expect(asUser(db, gerant, (q) => q(`select public.respond_replacement('h1', true)`))).rejects.toThrow(/permission denied/);
  });
});
