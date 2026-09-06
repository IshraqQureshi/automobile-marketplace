-- Extends manual_payments (ADM-006) to also model a showroom's
-- subscription/listing-fee payment period, per direct user request: admin
-- manually records a payment for a showroom with a start/end date, and is
-- reminded when it's approaching expiry or overdue.
--
-- Reuses this table rather than creating a new one: appointment_id/
-- customer_id are already nullable (this table was already generic enough
-- to allow a non-appointment-linked payment), and amount/currency/
-- payment_method/reference/notes/status/recorded_by all apply identically
-- to a subscription payment. showroom_id is the discriminator — set for a
-- subscription payment, null for an appointment-linked one.
alter table public.manual_payments
  add column showroom_id uuid references public.showrooms (id) on delete cascade,
  add column subscription_start_date date,
  add column subscription_end_date date,
  add column reminder_sent_at timestamptz;

alter table public.manual_payments
  add constraint manual_payments_subscription_dates_valid
    check (
      subscription_start_date is null
      or subscription_end_date is null
      or subscription_end_date >= subscription_start_date
    );

comment on column public.manual_payments.showroom_id is
  'Set for a showroom subscription/listing-fee payment; null for an appointment-linked payment.';
comment on column public.manual_payments.reminder_sent_at is
  'When the one-time expiry-approaching/overdue reminder email was sent for this subscription period. Never re-sent for the same row — reset to null if the period''s end date is edited, so a new reminder can fire for the new date.';

-- Existing manual_payments_select_admin_only / _insert_admin_only /
-- _update_admin_only RLS policies (20260903203104_create_rls_policies.sql)
-- already cover every column on this table — no policy change needed.
