-- Client feedback: the showroom's TikTok field (tiktok_url,
-- 20260916020000) is just a "Follow on TikTok" link — no actual embedded
-- videos. True "pull the latest N videos automatically" needs TikTok's
-- OAuth Display API (per-showroom login/consent, token storage/refresh),
-- a much bigger build the client explicitly decided against in favor of
-- manually-pasted video links — same owner-editable convention as
-- tiktok_url itself, and the same "app decides not to build OAuth
-- automation" call already made for YouTube (replaced by a single
-- manually-set playlist URL, 20260907010000/20260913040000).
alter table public.showrooms add column tiktok_video_urls text[];

alter table public.showrooms
  add constraint showrooms_tiktok_video_urls_max_four
  check (tiktok_video_urls is null or array_length(tiktok_video_urls, 1) <= 4);

comment on column public.showrooms.tiktok_video_urls is
  'Up to 4 individual TikTok video URLs the showroom owner pastes in, embedded directly on their public page. Owner-editable, same as tiktok_url.';
