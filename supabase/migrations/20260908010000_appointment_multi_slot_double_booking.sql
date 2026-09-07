-- APT-003 previously let a customer attach any number of vehicles to one
-- appointment, but all of them shared the SAME single time slot — i.e.
-- booking 5 cars didn't actually reserve the showroom's capacity for 5
-- slots. Per explicit user request ("book 5 cars, that should be 5
-- slots"), an appointment for N vehicles now spans N consecutive slots
-- (start_time/end_time widened accordingly by the application layer —
-- see submitAppointmentAction). Double-booking prevention has to change
-- to match: the old partial UNIQUE index on (showroom_id, appointment_date,
-- start_time) only ever compared exact start times, which can no longer
-- catch a genuine conflict where one appointment's widened range overlaps
-- another's without their start_times being identical.
--
-- Replaced with a real range-overlap EXCLUDE constraint (still a DB-level,
-- atomic guard — not an application-layer check-then-insert, same
-- principle the original partial unique index was built on for APT-004).
drop index if exists public.appointments_no_double_booking;

create extension if not exists btree_gist with schema extensions;

-- date + time = timestamp (immutable, so valid in a generated column).
alter table public.appointments
  add column range_start timestamp generated always as (appointment_date + start_time) stored,
  add column range_end timestamp generated always as (appointment_date + end_time) stored;

comment on column public.appointments.range_start is
  'Generated from appointment_date+start_time — exists only to back appointments_no_double_booking''s range-overlap exclusion constraint below.';
comment on column public.appointments.range_end is
  'Generated from appointment_date+end_time — see range_start.';

alter table public.appointments
  add constraint appointments_no_double_booking
  exclude using gist (
    showroom_id with =,
    tsrange(range_start, range_end, '[)') with &&
  )
  where (status in ('PENDING', 'CONFIRMED'));
