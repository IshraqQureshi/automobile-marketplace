-- Controlled enums for application lifecycle states.
-- Values must stay synchronized with .claude/docs/requirements/ACCEPTANCE_CRITERIA.md.

create type public.user_role as enum ('CUSTOMER', 'SHOWROOM', 'ADMIN');

create type public.showroom_status as enum ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

create type public.showroom_document_status as enum ('PENDING', 'APPROVED', 'REJECTED');

create type public.vehicle_status as enum (
  'DRAFT',
  'PENDING_REVIEW',
  'ACTIVE',
  'SOLD',
  'INACTIVE',
  'REJECTED'
);

-- Added 2026-09-04 (design review): one-way vehicle inquiry form status.
create type public.vehicle_inquiry_status as enum ('NEW', 'VIEWED');

create type public.appointment_status as enum (
  'PENDING',
  'CONFIRMED',
  'RESCHEDULED',
  'DECLINED',
  'CANCELLED',
  'COMPLETED'
);

create type public.notification_channel as enum ('EMAIL', 'WHATSAPP');

create type public.notification_type as enum (
  'BOOKING_CREATED',
  'BOOKING_CONFIRMED',
  'BOOKING_RESCHEDULED',
  'BOOKING_DECLINED',
  'BOOKING_CANCELLED',
  'BOOKING_REMINDER'
);

create type public.notification_status as enum ('PENDING', 'SENT', 'FAILED');

create type public.manual_payment_status as enum ('RECORDED', 'VOIDED');

create type public.vehicle_import_status as enum (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'COMPLETED_WITH_ERRORS',
  'FAILED'
);

create type public.system_setting_value_type as enum ('STRING', 'NUMBER', 'BOOLEAN', 'JSON');
