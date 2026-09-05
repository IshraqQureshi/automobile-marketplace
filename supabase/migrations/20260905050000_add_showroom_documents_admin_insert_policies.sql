-- showroom_documents_insert_owner (20260903203104_create_rls_policies.sql)
-- and showroom_documents_storage_insert_owner
-- (20260903203106_create_storage_policies.sql) both require
-- owns_showroom(showroom_id) — an admin attaching a document while
-- creating a showroom on behalf of someone else has no INSERT path today.
-- Purely additive (policies are OR'd together), mirroring
-- showrooms_insert_admin from 20260905040000.
create policy showroom_documents_insert_admin
  on public.showroom_documents for insert
  to authenticated
  with check (public.is_admin());

create policy showroom_documents_storage_insert_admin
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'showroom-documents'
    and public.is_admin()
  );
