-- Extends showroom-logos storage write access to the owning showroom, not
-- just admins — anticipated by the original migration's own comment
-- (20260905060002_create_showroom_logos_storage_policies.sql) for exactly
-- this moment: a showroom-owner-facing profile editor now exists
-- (self-service showroom profile editing), and its logo upload was
-- confirmed live to fail with "new row violates row-level security policy"
-- against the admin-only policies. Mirrors vehicle-media's owner-or-admin
-- pattern exactly — path convention is showroom-logos/{showroom_id}/logo-
-- {uuid}.{ext}, so (storage.foldername(name))[1] is the showroom id.

drop policy showroom_logos_storage_insert_admin_only on storage.objects;
drop policy showroom_logos_storage_update_admin_only on storage.objects;
drop policy showroom_logos_storage_delete_admin_only on storage.objects;

create policy showroom_logos_storage_insert_owner_or_admin
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'showroom-logos'
    and (public.owns_showroom(((storage.foldername(name))[1])::uuid) or public.is_admin())
  );

create policy showroom_logos_storage_update_owner_or_admin
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'showroom-logos'
    and (public.owns_showroom(((storage.foldername(name))[1])::uuid) or public.is_admin())
  )
  with check (
    bucket_id = 'showroom-logos'
    and (public.owns_showroom(((storage.foldername(name))[1])::uuid) or public.is_admin())
  );

create policy showroom_logos_storage_delete_owner_or_admin
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'showroom-logos'
    and (public.owns_showroom(((storage.foldername(name))[1])::uuid) or public.is_admin())
  );
