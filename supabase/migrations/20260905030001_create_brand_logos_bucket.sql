-- brand-logos: public bucket for vehicle-brand logos (admin-managed, same
-- catalog surface as the brands/models/vehicle_types tables). Public read
-- (logos are shown to every visitor), admin-only write — see the policies
-- in the next migration.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand-logos',
  'brand-logos',
  true,
  2097152, -- 2MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
);
