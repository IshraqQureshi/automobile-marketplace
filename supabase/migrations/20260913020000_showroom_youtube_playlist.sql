-- Replaces the showroom-owner-managed YouTube channel link + individual
-- video list with a single admin-managed playlist URL per showroom, per
-- direct request: showroom owners no longer manage their own YouTube
-- content at all — an admin sets one playlist link (from the real
-- HarakaGari YouTube channel), and the showroom's public page embeds that
-- playlist directly. Renaming the existing column (not adding a new one)
-- since it's the same "one YouTube link per showroom, shown on their
-- detail page" concept, just admin-owned now and holding a playlist URL
-- instead of a channel URL.
alter table public.showrooms rename column youtube_channel_url to youtube_playlist_url;

comment on column public.showrooms.youtube_playlist_url is
  'Admin-set YouTube playlist URL (from the real HarakaGari channel), embedded on this showroom''s public detail page. Not owner-editable — see showrooms_update_owner_or_admin''s own column-level restriction, enforced by prevent_showroom_youtube_playlist_self_edit below.';

-- Mirrors prevent_showroom_self_approval (20260903203102) exactly: RLS lets
-- an owner update their own showroom row broadly, but this one column must
-- stay admin-only, and RLS's WITH CHECK can't compare NEW against OLD.
create or replace function public.prevent_showroom_youtube_playlist_self_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() and new.youtube_playlist_url is distinct from old.youtube_playlist_url then
    raise exception 'Only an admin can change a showroom''s YouTube playlist URL.';
  end if;
  return new;
end;
$$;

create trigger prevent_showroom_youtube_playlist_self_edit
  before update on public.showrooms
  for each row execute function public.prevent_showroom_youtube_playlist_self_edit();
