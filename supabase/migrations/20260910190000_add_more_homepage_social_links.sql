-- Extends the social-profile-link settings already established by
-- 20260906010000_create_homepage_highlights.sql (homepage_tiktok_profile_url,
-- homepage_youtube_channel_url) with the remaining platforms the footer's
-- "Follow us" section needs, so all five are admin-editable in one place
-- and the footer can render real links instead of inert placeholder text.

insert into public.system_settings (key, value, value_type, description, category, is_public, is_editable) values
  ('homepage_facebook_url', '""', 'STRING', 'Facebook page URL, linked from the footer''s "Follow us" section.', 'homepage', true, true),
  ('homepage_instagram_url', '""', 'STRING', 'Instagram profile URL, linked from the footer''s "Follow us" section.', 'homepage', true, true),
  ('homepage_x_url', '""', 'STRING', 'X (Twitter) profile URL, linked from the footer''s "Follow us" section.', 'homepage', true, true);
