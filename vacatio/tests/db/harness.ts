/**
 * Banc d'essai base de données : applique les migrations Supabase dans PGlite
 * (PostgreSQL en WebAssembly) avec des bouchons minimaux pour auth et storage.
 * Permet de tester la RLS et les règles SQL sans Docker ni projet Supabase.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';

const STUBS = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  phone text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
grant usage on schema auth to anon, authenticated, service_role;
grant select on auth.users to service_role;

create schema storage;
create table storage.buckets (
  id text primary key, name text not null, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null,
  owner uuid
);
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects to authenticated, service_role;
`;

export async function createDb(): Promise<PGlite> {
  const db = new PGlite({ extensions: { btree_gist } });
  await db.exec(STUBS);
  const dir = join(__dirname, '../../supabase/migrations');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    try {
      await db.exec(readFileSync(join(dir, file), 'utf8'));
    } catch (error) {
      throw new Error(`Migration ${file} : ${(error as Error).message}`);
    }
  }
  return db;
}

/** Crée un utilisateur Auth (en superutilisateur) et renvoie son id. */
export async function createUser(db: PGlite, email: string, fullName = ''): Promise<string> {
  const res = await db.query<{ id: string }>(
    `insert into auth.users (email, raw_user_meta_data) values ($1, jsonb_build_object('full_name', $2::text)) returning id`,
    [email, fullName],
  );
  return res.rows[0]!.id;
}

/**
 * Exécute fn « en tant que » utilisateur authentifié (rôle authenticated + JWT simulé),
 * dans une transaction annulée à la fin sauf si commit = true.
 */
export async function asUser<T>(db: PGlite, userId: string | null, fn: (q: PGlite['query']) => Promise<T>, commit = false): Promise<T> {
  await db.exec('begin');
  try {
    await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? '']);
    await db.exec(userId ? 'set local role authenticated' : 'set local role anon');
    const result = await fn(db.query.bind(db));
    await db.exec(commit ? 'commit' : 'rollback');
    return result;
  } catch (error) {
    await db.exec('rollback');
    throw error;
  }
}
