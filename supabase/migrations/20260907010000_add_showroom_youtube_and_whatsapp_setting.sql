-- Showroom Detail Page (public marketplace-facing). Two additions:
--
-- 1. Per-showroom YouTube fields — each showroom can add their own channel
--    link and one embedded video, shown on their own public detail page.
--    `opening_hours` (added Day 1, unused until now) already covers the
--    "timing" field requested for the admin showroom CRUD — no new column
--    needed for that one, just wiring it up to real UI for the first time.
alter table public.showrooms
  add column youtube_channel_url text,
  add column youtube_video_url text;

comment on column public.showrooms.opening_hours is
  'Free-text display string (e.g. "Mon-Sat, 8am-6pm"), shown on the showroom''s public detail page. Stored as a plain jsonb string, not a structured per-day schedule -- matches the single-line display the design calls for; no code parses it beyond displaying it as-is.';

-- 2. A single global WhatsApp contact number (not per-showroom) that the
-- showroom detail page's "Message" button opens a chat to -- configured
-- once, super-admin-only, reused across every showroom's page. Follows the
-- exact seeding pattern already established for the homepage's TikTok/
-- YouTube social links (20260906010000_create_homepage_highlights.sql).
insert into public.system_settings (key, value, value_type, description, category, is_public, is_editable) values
  ('whatsapp_contact_number', '""', 'STRING', 'Global WhatsApp number (digits only, with country code, e.g. 254712345678) the "Message" button on every showroom detail page opens a chat to.', 'general', true, true);
