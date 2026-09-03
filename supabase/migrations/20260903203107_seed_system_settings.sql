-- Seed the approved MVP system_settings catalog (DATABASE_MIGRATION_PLAN.md
-- §21). is_public marks values safe to expose to unauthenticated/anon
-- reads (UI behavior — pagination sizes, upload limits, feature toggles the
-- frontend needs to render correctly); everything else is admin-only.
--
-- appointment_reminder_hours is a JSON array ([24, 1]) rather than a single
-- number — closes the gap flagged during design review (2026-09-04): the
-- Proposal specifies two reminder touchpoints (24h and 1h before), which a
-- single scalar setting couldn't represent.

insert into public.system_settings (key, value, value_type, description, category, is_public, is_editable) values
  ('site_name', '"HarakaGari"', 'STRING', 'Public site name.', 'general', true, true),
  ('support_email', '"support@harakagari.example"', 'STRING', 'Public support contact email.', 'general', true, true),
  ('support_phone', '""', 'STRING', 'Public support contact phone.', 'general', true, true),
  ('currency', '"KES"', 'STRING', 'ISO currency code.', 'general', true, true),
  ('currency_symbol', '"KSh"', 'STRING', 'Currency symbol for display.', 'general', true, true),
  ('timezone', '"Africa/Nairobi"', 'STRING', 'Business timezone for scheduling.', 'general', true, true),

  ('maintenance_mode', 'false', 'BOOLEAN', 'When true, public access is restricted.', 'maintenance', true, true),
  ('maintenance_message', '""', 'STRING', 'Message shown during maintenance mode.', 'maintenance', true, true),
  ('maintenance_allowed_roles', '["ADMIN"]', 'JSON', 'Roles that retain access during maintenance mode.', 'maintenance', false, true),

  ('email_notifications_enabled', 'true', 'BOOLEAN', 'Master toggle for email notifications.', 'notifications', false, true),
  ('whatsapp_notifications_enabled', 'true', 'BOOLEAN', 'Master toggle for WhatsApp Cloud API notifications.', 'notifications', false, true),
  ('booking_confirmation_enabled', 'true', 'BOOLEAN', 'Send a notification on booking confirmation.', 'notifications', false, true),
  ('booking_reminder_enabled', 'true', 'BOOLEAN', 'Send appointment reminder notifications.', 'notifications', false, true),
  ('booking_change_notification_enabled', 'true', 'BOOLEAN', 'Notify on reschedule/decline/cancel.', 'notifications', false, true),
  ('admin_emails', '[]', 'JSON', 'Array of admin notification recipient emails.', 'notifications', false, true),
  ('admin_cc_emails', '[]', 'JSON', 'Array of admin CC recipient emails.', 'notifications', false, true),

  ('appointment_default_duration', '30', 'NUMBER', 'Default appointment length, minutes.', 'appointments', true, true),
  ('appointment_reminder_hours', '[24, 1]', 'JSON', 'Hours-before-appointment reminder touchpoints.', 'appointments', true, true),
  ('appointment_minimum_notice_hours', '2', 'NUMBER', 'Minimum notice required to book, hours.', 'appointments', true, true),
  ('appointment_max_days_ahead', '30', 'NUMBER', 'Furthest a customer can book ahead, days.', 'appointments', true, true),
  ('customer_cancellation_enabled', 'true', 'BOOLEAN', 'Whether customers may cancel their own appointments.', 'appointments', true, true),
  ('customer_reschedule_enabled', 'false', 'BOOLEAN', 'Whether customers may reschedule directly (MVP: showroom-initiated only).', 'appointments', true, true),

  ('default_page_size', '20', 'NUMBER', 'Default marketplace listing page size.', 'marketplace', true, true),
  ('maximum_page_size', '100', 'NUMBER', 'Maximum page size the API will honor regardless of client input.', 'marketplace', true, true),
  ('public_listing_enabled', 'true', 'BOOLEAN', 'Master toggle for public marketplace visibility.', 'marketplace', true, true),

  ('customer_registration_enabled', 'true', 'BOOLEAN', 'Whether new customer registration is open.', 'registration', true, true),
  ('showroom_registration_enabled', 'true', 'BOOLEAN', 'Whether new showroom registration is open.', 'registration', true, true),

  ('maximum_vehicle_images', '12', 'NUMBER', 'Maximum images per vehicle listing.', 'vehicle', true, true),
  ('maximum_vehicle_image_size_mb', '10', 'NUMBER', 'Maximum size per vehicle image, MB.', 'vehicle', true, true),
  ('vehicle_listing_requires_approval', 'false', 'BOOLEAN', 'Whether new vehicle listings require admin approval before going ACTIVE.', 'vehicle', true, true),

  ('bulk_import_enabled', 'true', 'BOOLEAN', 'Master toggle for showroom bulk vehicle import.', 'bulk_import', true, true),
  ('bulk_import_max_file_size_mb', '5', 'NUMBER', 'Maximum spreadsheet file size, MB.', 'bulk_import', true, true),
  ('bulk_import_max_rows', '500', 'NUMBER', 'Maximum rows per import.', 'bulk_import', true, true),

  ('finance_calculator_enabled', 'true', 'BOOLEAN', 'Master toggle for the finance calculator.', 'finance', true, true),
  ('finance_default_interest_rate', '13', 'NUMBER', 'Fallback annual interest rate (%) when a listing has no showroom-configured rate.', 'finance', true, true),
  ('finance_default_duration', '24', 'NUMBER', 'Fallback loan duration (months) when a listing has no showroom-configured tenure.', 'finance', true, true);
