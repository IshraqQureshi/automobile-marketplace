-- The owner-managed multi-video system this table backed was fully replaced
-- by a single admin-managed youtube_playlist_url column on showrooms (see
-- 20260913020000_showroom_youtube_playlist.sql) per direct client request —
-- every application reference to showroom_videos (actions, schemas,
-- components, tests) was already removed in that same change. Dropping the
-- table itself here rather than leaving it as unreferenced dead schema.
drop table if exists public.showroom_videos;
