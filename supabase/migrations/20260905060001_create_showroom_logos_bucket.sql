-- showroom-logos: public bucket for showroom logos (admin-managed via the
-- admin showroom CRUD screen — see src/features/admin/showroom-actions.ts).
-- Public read (logos are shown to every visitor once the marketplace lists
-- showrooms), admin-only write for now — see the policies in the next
-- migration. Mirrors brand-logos exactly (20260905030001/30002).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'showroom-logos',
  'showroom-logos',
  true,
  2097152, -- 2MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
);
