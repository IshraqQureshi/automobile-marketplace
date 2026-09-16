-- A showroom's own TikTok account link, per direct request: "add tiktok
-- option on showroom page under Youtube playlist. This will be the
-- showroom own account." Unlike youtube_playlist_url (admin-curated,
-- content from HarakaGari's own YouTube channel — see
-- 20260913020000_showroom_youtube_playlist.sql), this is the showroom's
-- own identity, so it's normal owner-editable profile info (like phone/
-- email/address already are), not admin-only — no self-edit-blocking
-- trigger needed here.
alter table public.showrooms add column tiktok_url text;

comment on column public.showrooms.tiktok_url is
  'The showroom''s own TikTok account URL, shown on their public detail page below the admin-managed YouTube playlist. Owner-editable, same as phone/email/address.';
