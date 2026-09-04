-- brand-logos storage policies. Unlike vehicle-media/showroom-documents,
-- there's no per-owner scoping here — brand logos are admin-managed just
-- like the brands table itself (see brands_insert_admin_only etc. in
-- 20260905010001_create_catalog_rls_policies.sql), so every write is
-- gated on public.is_admin() alone, with no storage.foldername() ownership
-- check needed.

create policy brand_logos_storage_select_public
  on storage.objects for select
  using (bucket_id = 'brand-logos');

create policy brand_logos_storage_insert_admin_only
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'brand-logos' and public.is_admin());

create policy brand_logos_storage_update_admin_only
  on storage.objects for update
  to authenticated
  using (bucket_id = 'brand-logos' and public.is_admin())
  with check (bucket_id = 'brand-logos' and public.is_admin());

create policy brand_logos_storage_delete_admin_only
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'brand-logos' and public.is_admin());
