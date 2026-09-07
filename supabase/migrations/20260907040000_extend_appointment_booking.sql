-- Extends the Day-1 appointment-booking schema (previously unused schema-
-- only scaffolding) for the real "Schedule Test Drive" feature: guest
-- booking support, per-showroom slot/buffer configuration, and real
-- double-booking prevention (APT-004, a written release blocker) via a
-- DB-level constraint rather than only an application-layer
-- check-then-insert, which has a genuine race window under concurrent
-- submissions for the same slot.

-- showroom_availability (20260903201310) only ever encoded per-day-of-week
-- open/close windows — slot duration and buffer time are one flat
-- per-showroom setting, not per-day, matching how the showroom owner
-- actually configures them ("set slot time and buffer time").
alter table public.showrooms
  add column slot_duration_minutes integer not null default 30,
  add column buffer_minutes integer not null default 0;

alter table public.showrooms
  add constraint showrooms_slot_duration_minutes_positive check (slot_duration_minutes > 0),
  add constraint showrooms_buffer_minutes_non_negative check (buffer_minutes >= 0);

-- Guest booking support — same contact-snapshot pattern already used by
-- vehicle_inquiries (20260906040000) and financing_applications
-- (20260907030000): a non-authenticated visitor must be able to book a
-- test drive too, not just a signed-in customer.
alter table public.appointments
  alter column customer_id drop not null,
  add column contact_name text,
  add column contact_email text,
  add column contact_phone text;

-- Defensive backfill, not expected to touch any real row — this table has
-- never been written to by application code before this migration.
update public.appointments
set contact_name = coalesce(contact_name, 'Unknown'), contact_email = coalesce(contact_email, 'unknown@example.com'), contact_phone = coalesce(contact_phone, 'unknown')
where contact_name is null or contact_email is null or contact_phone is null;

alter table public.appointments
  alter column contact_name set not null,
  alter column contact_email set not null,
  alter column contact_phone set not null;

alter table public.appointments
  add constraint appointments_contact_name_not_blank check (btrim(contact_name) <> ''),
  add constraint appointments_contact_email_not_blank check (btrim(contact_email) <> ''),
  add constraint appointments_contact_phone_not_blank check (btrim(contact_phone) <> '');

drop policy appointments_insert_customer on public.appointments;

-- `to public`, gated on auth.uid() rather than the connecting SQL role —
-- exact same reasoning as vehicle_inquiries_insert_public /
-- financing_applications_insert_public: PostgREST's anonymous requests
-- connect as `authenticator`, never literally as a role named `anon`, so a
-- `to anon`-scoped policy would silently never apply.
create policy appointments_insert_public
  on public.appointments for insert
  to public
  with check (
    ((auth.uid() is not null and customer_id = auth.uid()) or (auth.uid() is null and customer_id is null))
    and status = 'PENDING'
  );

drop policy appointment_vehicles_insert_customer on public.appointment_vehicles;

-- A plain EXISTS subquery here would silently fail for an anonymous
-- submitter: appointments_select_customer_or_showroom_or_admin is
-- `to authenticated` only, so an anonymous caller has no SELECT
-- visibility into appointments at all, and the subquery would see
-- nothing regardless of whether the row actually matches. A
-- security-definer function (same fix as owns_showroom()/is_admin()
-- elsewhere in this schema) checks the real table directly, bypassing
-- that RLS-visibility chain, while still only matching the caller's own
-- appointment (their own customer_id, or both sides anonymous).
create or replace function public.appointment_allows_public_vehicle_insert(target_appointment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.appointments a
    where a.id = target_appointment_id
      and (a.customer_id = auth.uid() or (auth.uid() is null and a.customer_id is null))
  );
$$;

create policy appointment_vehicles_insert_public
  on public.appointment_vehicles for insert
  to public
  with check (public.appointment_allows_public_vehicle_insert(appointment_id));

-- Real double-booking prevention (APT-004) — a unique index is atomic
-- under concurrent submissions, unlike a check-then-insert in application
-- code. Partial: only PENDING/CONFIRMED rows occupy a slot, so a
-- DECLINED/CANCELLED appointment doesn't permanently block it forever.
create unique index appointments_no_double_booking
  on public.appointments (showroom_id, appointment_date, start_time)
  where status in ('PENDING', 'CONFIRMED');
