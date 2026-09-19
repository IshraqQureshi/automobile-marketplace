-- Client request: a super-admin block to inject scripts into <head> (Google
-- Analytics / Tag Manager / Search Console verification, etc.). Stored as one
-- system_settings row, same seeding pattern as whatsapp_contact_number
-- (20260907010000). is_public = true is required (not a leak): the snippet
-- is emitted into every public page's HTML anyway, and the root layout reads
-- it with the visitor's own (often anonymous) session, which
-- system_settings_select_public_or_admin only permits for public rows.
-- Writes stay admin-only via system_settings_update_admin_editable_only.
insert into public.system_settings (key, value, value_type, description, category, is_public, is_editable) values
  ('custom_head_scripts', '""', 'STRING', 'Raw HTML snippet (script/style/meta/link/noscript tags only) injected into the <head> of public pages — e.g. Google Analytics, Tag Manager, Search Console verification. Not injected on /admin, /dashboard, auth pages, or /api.', 'general', true, true);
