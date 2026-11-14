-- =============================================================================
-- Vacatio — 0006 : Supabase Storage (buckets privés, isolés par entreprise)
-- Convention de chemin : {org_id}/{…}. Le premier dossier est TOUJOURS l'org.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('agent-documents', 'agent-documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('absence-proofs',  'absence-proofs',  false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('quality-photos',  'quality-photos',  false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('signatures',      'signatures',      false, 1048576,  array['image/png', 'image/svg+xml']),
  ('reports',         'reports',         false, 20971520, array['application/pdf']),
  ('complaints',      'complaints',      false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('invoices',        'invoices',        false, 20971520, array['application/pdf', 'application/xml', 'text/xml']),
  ('exports',         'exports',         false, 52428800, null),
  ('logos',           'logos',           false, 2097152,  array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'])
on conflict (id) do nothing;

create or replace function app.storage_org(p_name text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin
  return (string_to_array(p_name, '/'))[1]::uuid;
exception when others then
  return null;
end;
$$;
grant execute on function app.storage_org(text) to authenticated, service_role;

-- Équipe (gérant + chef) : photos qualité, signatures, rapports, réclamations, logos.
create policy storage_staff_read on storage.objects for select to authenticated using (
  bucket_id in ('quality-photos', 'signatures', 'reports', 'complaints', 'logos', 'absence-proofs')
  and app.is_staff(app.storage_org(name)));
create policy storage_staff_write on storage.objects for insert to authenticated with check (
  bucket_id in ('quality-photos', 'signatures', 'reports', 'complaints')
  and app.is_staff(app.storage_org(name)));

-- Gérant seulement : documents RH, factures, exports, logo.
create policy storage_gerant_all on storage.objects for all to authenticated using (
  bucket_id in ('agent-documents', 'invoices', 'exports', 'logos', 'absence-proofs', 'quality-photos',
                'signatures', 'reports', 'complaints')
  and app.is_gerant(app.storage_org(name)))
with check (
  bucket_id in ('agent-documents', 'invoices', 'exports', 'logos', 'absence-proofs', 'quality-photos',
                'signatures', 'reports', 'complaints')
  and app.is_gerant(app.storage_org(name)));

-- Agent : dépôt de ses justificatifs d'absence dans {org_id}/{agent_id}/…
create policy storage_agent_proofs on storage.objects for insert to authenticated with check (
  bucket_id = 'absence-proofs'
  and (string_to_array(name, '/'))[2] = app.my_agent_id(app.storage_org(name))::text);
create policy storage_agent_proofs_read on storage.objects for select to authenticated using (
  bucket_id = 'absence-proofs'
  and (string_to_array(name, '/'))[2] = app.my_agent_id(app.storage_org(name))::text);
