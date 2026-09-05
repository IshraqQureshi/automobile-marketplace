-- showroom-logos storage policies. Admin-only write for now — the only UI
-- that can set a showroom's logo today is the admin CRUD screen, not a
-- showroom-owner-facing profile editor (that doesn't exist yet). Extend
-- additively with an owns_showroom() branch (mirroring vehicle-media's
-- pattern) once that lands, same reasoning as brand-logos.

create policy showroom_logos_storage_select_public
  on storage.objects for select
  using (bucket_id = 'showroom-logos');

create policy showroom_logos_storage_insert_admin_only
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'showroom-logos' and public.is_admin());

create policy showroom_logos_storage_update_admin_only
  on storage.objects for update
  to authenticated
  using (bucket_id = 'showroom-logos' and public.is_admin())
  with check (bucket_id = 'showroom-logos' and public.is_admin());

create policy showroom_logos_storage_delete_admin_only
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'showroom-logos' and public.is_admin());
