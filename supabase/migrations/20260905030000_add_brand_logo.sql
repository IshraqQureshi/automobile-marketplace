-- Adds an optional logo to brands. Stores a bucket-relative storage path
-- (not a full URL), same convention as vehicle_media.storage_path — the
-- public URL is built at render time via
-- supabase.storage.from('brand-logos').getPublicUrl(path).

alter table public.brands add column logo_storage_path text;

comment on column public.brands.logo_storage_path is
  'Bucket-relative path in the brand-logos Storage bucket, e.g. "<brand_id>/logo-<uuid>.png". Null if no logo has been uploaded yet.';
