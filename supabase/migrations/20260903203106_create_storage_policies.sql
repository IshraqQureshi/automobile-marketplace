-- Storage policies. Paths are scoped by showroom_id as the first path
-- segment (DATABASE.md §36):
--   vehicle-media/{showroom_id}/{vehicle_id}/{file}
--   showroom-documents/{showroom_id}/{file}
--
-- storage.foldername(name) splits the object path into segments; segment 1
-- is always the showroom_id. Ownership is never inferred from client input —
-- (storage.foldername(name))[1] is the path Supabase itself resolved the
-- request against, and owns_showroom() checks it against the real
-- showrooms table.

-- ============================================================================
-- vehicle-media (public bucket — public read; owner-only write)
-- ============================================================================

create policy vehicle_media_storage_select_public
  on storage.objects for select
  using (bucket_id = 'vehicle-media');

create policy vehicle_media_storage_insert_owner
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'vehicle-media'
    and public.owns_showroom(((storage.foldername(name))[1])::uuid)
  );

create policy vehicle_media_storage_update_owner_or_admin
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'vehicle-media'
    and (public.owns_showroom(((storage.foldername(name))[1])::uuid) or public.is_admin())
  )
  with check (
    bucket_id = 'vehicle-media'
    and (public.owns_showroom(((storage.foldername(name))[1])::uuid) or public.is_admin())
  );

create policy vehicle_media_storage_delete_owner_or_admin
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'vehicle-media'
    and (public.owns_showroom(((storage.foldername(name))[1])::uuid) or public.is_admin())
  );

-- ============================================================================
-- showroom-documents (private bucket — owner or admin only, never public)
-- ============================================================================

create policy showroom_documents_storage_select_owner_or_admin
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'showroom-documents'
    and (public.owns_showroom(((storage.foldername(name))[1])::uuid) or public.is_admin())
  );

create policy showroom_documents_storage_insert_owner
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'showroom-documents'
    and public.owns_showroom(((storage.foldername(name))[1])::uuid)
  );

create policy showroom_documents_storage_update_owner_or_admin
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'showroom-documents'
    and (public.owns_showroom(((storage.foldername(name))[1])::uuid) or public.is_admin())
  )
  with check (
    bucket_id = 'showroom-documents'
    and (public.owns_showroom(((storage.foldername(name))[1])::uuid) or public.is_admin())
  );

create policy showroom_documents_storage_delete_owner_or_admin
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'showroom-documents'
    and (public.owns_showroom(((storage.foldername(name))[1])::uuid) or public.is_admin())
  );
