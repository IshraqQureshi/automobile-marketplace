-- Replaces the single `showrooms.youtube_video_url` scalar with a proper
-- one-to-many table, so a showroom owner can add multiple YouTube videos
-- to their public detail page (/showrooms/[slug]) — same "Reviews & Guides"
-- grid-of-videos-plus-modal look as the homepage's own YouTube section
-- (homepage_highlights), but owner-managed per showroom rather than
-- admin-curated platform-wide. `youtube_channel_url` is unaffected — that
-- remains a single showroom-level scalar (the "View Channel" button),
-- a distinct concept from the list of individual featured videos.
create table public.showroom_videos (
  id uuid primary key default gen_random_uuid(),
  showroom_id uuid not null references public.showrooms (id) on delete cascade,
  title text not null,
  video_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint showroom_videos_title_not_blank check (btrim(title) <> ''),
  constraint showroom_videos_video_url_not_blank check (btrim(video_url) <> '')
);

comment on table public.showroom_videos is
  'A showroom''s own YouTube videos, shown on its public detail page. Owner-managed one-to-many (RLS scoped via owns_showroom()) — distinct from homepage_highlights, which is admin-curated and platform-wide.';

create index showroom_videos_showroom_id_sort_idx on public.showroom_videos (showroom_id, sort_order);

alter table public.showroom_videos enable row level security;

-- Same public-visibility rule as the showroom itself (status = 'APPROVED'),
-- plus the owner/admin escape hatch — mirrors vehicle_media's own
-- visibility-inherited-from-parent pattern.
create policy showroom_videos_select_public_or_owner_or_admin
  on public.showroom_videos for select
  using (
    exists (
      select 1 from public.showrooms s
      where s.id = showroom_videos.showroom_id
        and (s.status = 'APPROVED' or public.owns_showroom(s.id) or public.is_admin())
    )
  );

create policy showroom_videos_insert_owner_or_admin
  on public.showroom_videos for insert
  to authenticated
  with check (public.owns_showroom(showroom_id) or public.is_admin());

create policy showroom_videos_update_owner_or_admin
  on public.showroom_videos for update
  to authenticated
  using (public.owns_showroom(showroom_id) or public.is_admin())
  with check (public.owns_showroom(showroom_id) or public.is_admin());

create policy showroom_videos_delete_owner_or_admin
  on public.showroom_videos for delete
  to authenticated
  using (public.owns_showroom(showroom_id) or public.is_admin());

-- Preserve any showroom's existing single featured video as the first row
-- of the new table rather than silently discarding real data on migration.
insert into public.showroom_videos (showroom_id, title, video_url, sort_order)
select id, 'Featured video', youtube_video_url, 0
from public.showrooms
where youtube_video_url is not null and btrim(youtube_video_url) <> '';

alter table public.showrooms drop column youtube_video_url;
