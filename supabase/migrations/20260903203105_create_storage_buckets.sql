-- Storage buckets. vehicle-media is public (approved marketplace listing
-- images); showroom-documents is private (KYC/verification documents).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-media',
  'vehicle-media',
  true,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp']
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'showroom-documents',
  'showroom-documents',
  false,
  10485760, -- 10 MB
  array['application/pdf', 'image/jpeg', 'image/png']
);
