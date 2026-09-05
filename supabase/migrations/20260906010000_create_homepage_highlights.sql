-- MKT-001 homepage "Watch & Discover" (TikTok) / "Reviews & Guides"
-- (YouTube) sections — per MVP_REQUIREMENTS.md §4.1 and §29.1's Design
-- Review Decisions, these are static/manually-curated embeds (the admin
-- supplies a video link + thumbnail image); no live TikTok/YouTube API
-- integration or auto-sync for MVP.

create type public.homepage_highlight_platform as enum ('TIKTOK', 'YOUTUBE');

create table public.homepage_highlights (
  id uuid primary key default gen_random_uuid(),
  platform public.homepage_highlight_platform not null,
  title text not null,
  video_url text not null,
  thumbnail_storage_path text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint homepage_highlights_title_not_blank check (btrim(title) <> ''),
  constraint homepage_highlights_video_url_not_blank check (btrim(video_url) <> '')
);

comment on table public.homepage_highlights is
  'Admin-curated TikTok/YouTube video cards shown on the public homepage''s "Watch & Discover" and "Reviews & Guides" sections. MVP is static/manually-curated only — see MVP_REQUIREMENTS.md §4.1/§29.1.';

create index homepage_highlights_platform_sort_idx on public.homepage_highlights (platform, sort_order);

alter table public.homepage_highlights enable row level security;

-- The public homepage only ever queries is_active = true, but the RLS
-- SELECT policy is the real boundary (not just the homepage's own query
-- filter) — a disabled/draft highlight must not be readable via a direct
-- API call either, same "security enforced at the RLS layer, not just the
-- frontend" discipline as every other table in this project. Admins can
-- still see inactive rows (to manage/re-enable them).
create policy homepage_highlights_select_active_or_admin
  on public.homepage_highlights for select
  using (is_active or public.is_admin());

create policy homepage_highlights_insert_admin_only
  on public.homepage_highlights for insert
  to authenticated
  with check (public.is_admin());

create policy homepage_highlights_update_admin_only
  on public.homepage_highlights for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy homepage_highlights_delete_admin_only
  on public.homepage_highlights for delete
  to authenticated
  using (public.is_admin());

-- homepage-highlights: public bucket for the thumbnail images on those
-- cards — same shape as brand-logos (admin-managed, no per-row ownership
-- scoping needed).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'homepage-highlights',
  'homepage-highlights',
  true,
  2097152, -- 2MB
  array['image/jpeg', 'image/png', 'image/webp']
);

create policy homepage_highlights_storage_select_public
  on storage.objects for select
  using (bucket_id = 'homepage-highlights');

create policy homepage_highlights_storage_insert_admin_only
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'homepage-highlights' and public.is_admin());

create policy homepage_highlights_storage_update_admin_only
  on storage.objects for update
  to authenticated
  using (bucket_id = 'homepage-highlights' and public.is_admin())
  with check (bucket_id = 'homepage-highlights' and public.is_admin());

create policy homepage_highlights_storage_delete_admin_only
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'homepage-highlights' and public.is_admin());

-- Admin-configurable social profile links shown on each section's
-- "@HarakaGari"-style button — reuses the existing system_settings catalog
-- (category 'homepage' is new) rather than a dedicated table, since this is
-- exactly two scalar config values, not a list of records.
insert into public.system_settings (key, value, value_type, description, category, is_public, is_editable) values
  ('homepage_tiktok_profile_url', '""', 'STRING', 'TikTok profile URL linked from the homepage''s "Watch & Discover" section.', 'homepage', true, true),
  ('homepage_youtube_channel_url', '""', 'STRING', 'YouTube channel URL linked from the homepage''s "Reviews & Guides" section.', 'homepage', true, true);
