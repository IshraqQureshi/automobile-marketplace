-- appointments: customer appointments with a showroom.
-- Conflict prevention (concurrent booking safety) is APT-004 — a dedicated
-- concurrency mechanism (transaction/locking/constraint) is implemented
-- alongside the booking feature itself, not as bare schema here.

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  showroom_id uuid not null references public.showrooms (id) on delete cascade,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  status public.appointment_status not null default 'PENDING',
  customer_notes text,
  showroom_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint appointments_booking_reference_unique unique (booking_reference),
  constraint appointments_time_range check (start_time < end_time)
);

comment on table public.appointments is
  'Every appointment belongs to one customer and one showroom. Status transitions must follow the approved state machine (SYSTEM_ARCHITECTURE.md §14).';
