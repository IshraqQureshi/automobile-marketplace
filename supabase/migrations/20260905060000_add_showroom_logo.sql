-- Adds an optional logo to showrooms, same convention as brands.logo_storage_path
-- (added 20260905030000) — a bucket-relative storage path, public URL built
-- at render time via supabase.storage.from('showroom-logos').getPublicUrl(path).

alter table public.showrooms add column logo_storage_path text;

comment on column public.showrooms.logo_storage_path is
  'Bucket-relative path in the showroom-logos Storage bucket, e.g. "<showroom_id>/logo-<uuid>.png". Null if no logo has been uploaded yet.';
