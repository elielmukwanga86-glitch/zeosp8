import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createDb, createUser } from './harness';

let db: PGlite;
let gerantA: string, gerantB: string, chefA: string, agentUserA: string, inconnu: string;
let orgA: string, orgB: string;
let siteA1: string, siteA2: string, siteB: string, agentA: string, agentA2: string, zoneNord: string;

const one = async <T>(p: Promise<{ rows: T[] }>): Promise<T> => {
  const row = (await p).rows[0];
  if (row === undefined) throw new Error('Aucune ligne renvoyée');
  return row;
};

beforeAll(async () => {
  db = await createDb();
  gerantA = await createUser(db, 'gerant@a.fr', 'Alice Gérante');
  gerantB = await createUser(db, 'gerant@b.fr', 'Bruno Gérant');
  chefA = await createUser(db, 'chef@a.fr', 'Chloé Cheffe');
  agentUserA = await createUser(db, 'agent@a.fr', 'Amadou Agent');
  inconnu = await createUser(db, 'personne@x.fr');

  orgA = (await asUser(db, gerantA, (q) => one(q<{ id: string }>(`select public.create_organization('Propreté Alpha') as id`)), true)).id;
  orgB = (await asUser(db, gerantB, (q) => one(q<{ id: string }>(`select public.create_organization('Bêta Nettoyage') as id`)), true)).id;

  // Données de départ insérées en superutilisateur.
  zoneNord = (await one(db.query<{ id: string }>(`insert into zones (org_id, name) values ($1, 'Nord') returning id`, [orgA]))).id;
  const clientA = (await one(db.query<{ id: string }>(`insert into clients (org_id, name) values ($1, 'Client A') returning id`, [orgA]))).id;
  const clientB = (await one(db.query<{ id: string }>(`insert into clients (org_id, name) values ($1, 'Client B') returning id`, [orgB]))).id;
  siteA1 = (await one(db.query<{ id: string }>(`insert into sites (org_id, client_id, zone_id, name) values ($1, $2, $3, 'Site Nord') returning id`, [orgA, clientA, zoneNord]))).id;
  siteA2 = (await one(db.query<{ id: string }>(`insert into sites (org_id, client_id, name) values ($1, $2, 'Site Sud') returning id`, [orgA, clientA]))).id;
  siteB = (await one(db.query<{ id: string }>(`insert into sites (org_id, client_id, name) values ($1, $2, 'Site B') returning id`, [orgB, clientB]))).id;

  const chefMembership = (await one(db.query<{ id: string }>(
    `insert into memberships (org_id, user_id, role) values ($1, $2, 'chef_equipe') returning id`, [orgA, chefA]))).id;
  await db.query(`insert into zone_managers (org_id, zone_id, membership_id) values ($1, $2, $3)`, [orgA, zoneNord, chefMembership]);
  await db.query(`insert into memberships (org_id, user_id, role) values ($1, $2, 'agent')`, [orgA, agentUserA]);
  agentA = (await one(db.query<{ id: string }>(
    `insert into agents (org_id, user_id, first_name, last_name, weekly_contract_hours) values ($1, $2, 'Amadou', 'Diallo', 24) returning id`,
    [orgA, agentUserA]))).id;
  agentA2 = (await one(db.query<{ id: string }>(
    `insert into agents (org_id, first_name, last_name, weekly_contract_hours) values ($1, 'Maria', 'Silva', 30) returning id`, [orgA]))).id;
  await db.query(`insert into service_contracts (org_id, site_id, starts_on, hourly_price_cents) values ($1, $2, '2026-01-01', 2800)`, [orgA, siteA1]);
  await db.query(`insert into site_access_codes (org_id, site_id, label, secret) values ($1, $2, 'Alarme', '4321')`, [orgA, siteA1]);
});

describe('inscription et essai gratuit', () => {
  it('crée l’entreprise en essai Pro de 14 jours avec le gérant propriétaire', async () => {
    const org = await one(db.query<{ plan: string; subscription_status: string; days: number; slug: string }>(
      `select plan, subscription_status, slug, round(extract(epoch from trial_ends_at - now()) / 86400) as days from organizations where id = $1`, [orgA]));
    expect(org).toMatchObject({ plan: 'pro', subscription_status: 'trialing', slug: 'proprete-alpha' });
    expect(Number(org.days)).toBe(14);
    const m = await one(db.query<{ role: string; is_owner: boolean }>(`select role, is_owner from memberships where org_id = $1 and user_id = $2`, [orgA, gerantA]));
    expect(m).toEqual({ role: 'gerant', is_owner: true });
  });

  it('crée automatiquement le profil à l’inscription', async () => {
    const p = await one(db.query<{ full_name: string }>(`select full_name from profiles where id = $1`, [gerantA]));
    expect(p.full_name).toBe('Alice Gérante');
  });

  it('refuse la création d’entreprise sans authentification', async () => {
    await expect(asUser(db, null, (q) => q(`select public.create_organization('Pirate')`))).rejects.toThrow();
  });
});

describe('isolation stricte entre entreprises', () => {
  it('le gérant B ne voit aucune donnée de A', async () => {
    const counts = await asUser(db, gerantB, async (q) => ({
      orgs: (await q(`select id from organizations`)).rows.length,
      sites: (await q<{ id: string }>(`select id from sites`)).rows.map((r) => r.id),
      agents: (await q(`select id from agents`)).rows.length,
      contracts: (await q(`select id from service_contracts`)).rows.length,
    }));
    expect(counts.orgs).toBe(1);
    expect(counts.sites).toEqual([siteB]);
    expect(counts.agents).toBe(0);
    expect(counts.contracts).toBe(0);
  });

  it('le gérant B ne peut pas écrire dans A', async () => {
    await expect(asUser(db, gerantB, (q) =>
      q(`insert into agents (org_id, first_name, last_name, weekly_contract_hours) values ($1, 'X', 'Y', 10)`, [orgA]))).rejects.toThrow(/row-level security/);
    const updated = await asUser(db, gerantB, (q) => q(`update sites set name = 'piraté' where id = $1`, [siteA1]));
    expect(updated.affectedRows ?? 0).toBe(0);
  });

  it('une clé étrangère ne peut pas pointer vers une autre entreprise', async () => {
    await expect(db.query(
      `insert into shifts (org_id, site_id, starts_at, ends_at) values ($1, $2, now(), now() + interval '2 hours')`, [orgB, siteA1],
    )).rejects.toThrow(/foreign key/);
  });

  it('org_id est immuable', async () => {
    await expect(db.query(`update sites set org_id = $1 where id = $2`, [orgB, siteA1])).rejects.toThrow(/immuable/);
  });

  it('un utilisateur sans entreprise ne voit rien', async () => {
    const n = await asUser(db, inconnu, async (q) => (await q(`select 1 from sites union all select 1 from organizations`)).rows.length);
    expect(n).toBe(0);
  });

  it('anon ne voit rien', async () => {
    const n = await asUser(db, null, async (q) => (await q(`select 1 from sites`)).rows.length);
    expect(n).toBe(0);
  });
});

describe('rôles', () => {
  it('le chef d’équipe ne gère que les sites de sa zone', async () => {
    await asUser(db, chefA, async (q) => {
      await q(`insert into shifts (org_id, site_id, starts_at, ends_at) values ($1, $2, '2026-12-01 06:00+01', '2026-12-01 09:00+01')`, [orgA, siteA1]);
      await expect(q(`insert into shifts (org_id, site_id, starts_at, ends_at) values ($1, $2, '2026-12-01 06:00+01', '2026-12-01 09:00+01')`, [orgA, siteA2]))
        .rejects.toThrow(/row-level security/);
    });
  });

  it('le chef ne voit ni les prix des contrats ni les factures', async () => {
    const n = await asUser(db, chefA, async (q) => (await q(`select 1 from service_contracts union all select 1 from invoices`)).rows.length);
    expect(n).toBe(0);
  });

  it('le chef ne modifie pas les champs d’abonnement ni l’entreprise', async () => {
    const r = await asUser(db, chefA, (q) => q(`update organizations set name = 'X' where id = $1`, [orgA]));
    expect(r.affectedRows ?? 0).toBe(0);
  });

  it('le gérant ne peut pas modifier son forfait lui-même', async () => {
    await expect(asUser(db, gerantA, (q) => q(`update organizations set plan = 'business' where id = $1`, [orgA]))).rejects.toThrow(/permission denied/);
  });

  it('l’agent ne voit que sa fiche et ses vacations publiées', async () => {
    await db.query(`insert into shifts (org_id, site_id, agent_id, starts_at, ends_at, status) values
      ($1, $2, $3, now() - interval '1 hour', now() + interval '2 hours', 'published'),
      ($1, $2, $3, now() + interval '2 days', now() + interval '2 days 3 hours', 'draft'),
      ($1, $2, $4, now() - interval '1 hour', now() + interval '2 hours', 'published')`, [orgA, siteA1, agentA, agentA2]);
    const seen = await asUser(db, agentUserA, async (q) => ({
      agents: (await q<{ id: string }>(`select id from agents`)).rows.map((r) => r.id),
      shifts: (await q(`select id from shifts`)).rows.length,
      clients: (await q(`select id from clients`)).rows.length,
      codes: (await q(`select secret from site_access_codes`)).rows.length,
      sites: (await q(`select id from sites`)).rows.length,
    }));
    expect(seen.agents).toEqual([agentA]);
    expect(seen.shifts).toBe(1);
    expect(seen.clients).toBe(0);
    expect(seen.codes).toBe(1); // vacation en cours sur ce site → code visible
    expect(seen.sites).toBe(1);
  });

  it('l’agent peut déclarer sa propre absence, pas celle d’un collègue', async () => {
    await asUser(db, agentUserA, async (q) => {
      await q(`insert into absences (org_id, agent_id, starts_at, ends_at, reason, declared_by) values ($1, $2, now(), now() + interval '1 day', 'maladie', $3)`, [orgA, agentA, agentUserA]);
      await expect(q(`insert into absences (org_id, agent_id, starts_at, ends_at, reason, declared_by) values ($1, $2, now(), now() + interval '1 day', 'maladie', $3)`, [orgA, agentA2, agentUserA]))
        .rejects.toThrow(/row-level security/);
    });
  });
});

describe('planning', () => {
  it('interdit la double affectation d’un agent', async () => {
    await expect(db.query(`insert into shifts (org_id, site_id, agent_id, starts_at, ends_at) values
      ($1, $2, $3, '2027-01-04 06:00+01', '2027-01-04 09:00+01'),
      ($1, $4, $3, '2027-01-04 08:00+01', '2027-01-04 10:00+01')`, [orgA, siteA1, agentA2, siteA2])).rejects.toThrow(/shifts_no_double_booking/);
  });

  it('autorise deux vacations qui se suivent (vacations coupées)', async () => {
    await db.query(`insert into shifts (org_id, site_id, agent_id, starts_at, ends_at) values
      ($1, $2, $3, '2027-01-05 06:00+01', '2027-01-05 09:00+01'),
      ($1, $4, $3, '2027-01-05 09:00+01', '2027-01-05 10:00+01')`, [orgA, siteA1, agentA2, siteA2]);
  });
});

describe('limites de forfait', () => {
  it('bloque l’ajout d’agents au-delà du forfait Découverte une fois l’essai expiré', async () => {
    await db.query(`update organizations set trial_ends_at = now() - interval '1 day' where id = $1`, [orgB]);
    for (const n of [1, 2, 3]) {
      await db.query(`insert into agents (org_id, first_name, last_name, weekly_contract_hours) values ($1, 'A', $2, 10)`, [orgB, `N${n}`]);
    }
    await expect(db.query(`insert into agents (org_id, first_name, last_name, weekly_contract_hours) values ($1, 'A', 'N4', 10)`, [orgB]))
      .rejects.toThrow(/PLAN_LIMIT_AGENTS/);
    // Un agent inactif ne compte pas.
    await db.query(`insert into agents (org_id, first_name, last_name, weekly_contract_hours, status) values ($1, 'A', 'Parti', 10, 'left')`, [orgB]);
  });

  it('bloque le 3e site en Découverte', async () => {
    const c = (await one(db.query<{ id: string }>(`select id from clients where org_id = $1`, [orgB]))).id;
    await db.query(`insert into sites (org_id, client_id, name) values ($1, $2, 'Site B2')`, [orgB, c]);
    await expect(db.query(`insert into sites (org_id, client_id, name) values ($1, $2, 'Site B3')`, [orgB, c])).rejects.toThrow(/PLAN_LIMIT_SITES/);
  });
});

describe('invitations', () => {
  it('accepte une invitation valide uniquement pour la bonne adresse', async () => {
    const invitee = await createUser(db, 'nouveau.chef@a.fr');
    const token = 'jeton-de-test-0123456789';
    await db.query(`insert into invitations (org_id, email, role, token_hash) values ($1, 'Nouveau.Chef@a.fr', 'chef_equipe',
      encode(sha256(convert_to($2, 'UTF8')), 'hex'))`, [orgA, token]);
    await expect(asUser(db, inconnu, (q) => q(`select public.accept_invitation($1)`, [token]))).rejects.toThrow(/autre adresse/);
    await asUser(db, invitee, (q) => q(`select public.accept_invitation($1)`, [token]), true);
    const m = await one(db.query<{ role: string }>(`select role from memberships where org_id = $1 and user_id = $2`, [orgA, invitee]));
    expect(m.role).toBe('chef_equipe');
    await expect(asUser(db, invitee, (q) => q(`select public.accept_invitation($1)`, [token]))).rejects.toThrow(/expirée/);
  });

  it('le propriétaire ne peut pas être retiré', async () => {
    const owner = (await one(db.query<{ id: string }>(`select id from memberships where org_id = $1 and is_owner`, [orgA]))).id;
    await expect(asUser(db, gerantA, (q) => q(`select public.remove_member($1)`, [owner]))).rejects.toThrow(/propriétaire/);
  });
});

describe('facturation', () => {
  it('numérote sans trou et fige une facture émise', async () => {
    const n1 = await one(db.query<{ n: number }>(`select public.next_document_number($1, 'invoice', 2026) as n`, [orgA]));
    const n2 = await one(db.query<{ n: number }>(`select public.next_document_number($1, 'invoice', 2026) as n`, [orgA]));
    expect([n1.n, n2.n]).toEqual([1, 2]);
    const c = (await one(db.query<{ id: string }>(`select id from clients where org_id = $1`, [orgA]))).id;
    const inv = (await one(db.query<{ id: string }>(
      `insert into invoices (org_id, client_id, status, number, issue_date, total_ht_cents) values ($1, $2, 'issued', 'F-2026-0001', '2026-11-14', 10000) returning id`, [orgA, c]))).id;
    await expect(db.query(`update invoices set total_ht_cents = 1 where id = $1`, [inv])).rejects.toThrow(/non modifiable/);
    await expect(db.query(`delete from invoices where id = $1`, [inv])).rejects.toThrow(/avoir/);
    await db.query(`update invoices set status = 'paid', paid_at = now() where id = $1`, [inv]);
  });

  it('les fonctions serveur ne sont pas appelables par un utilisateur', async () => {
    await expect(asUser(db, gerantA, (q) => q(`select public.next_document_number($1, 'invoice', 2026)`, [orgA]))).rejects.toThrow(/permission denied/);
  });
});

describe('audit et RLS globale', () => {
  it('journalise les écritures sensibles', async () => {
    const r = await one(db.query<{ n: number }>(`select count(*)::int as n from audit_log where org_id = $1 and table_name = 'agents'`, [orgA]));
    expect(r.n).toBeGreaterThan(0);
  });

  it('la RLS est activée sur toutes les tables publiques', async () => {
    const r = await db.query<{ relname: string }>(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`);
    expect(r.rows).toEqual([]);
  });
});
