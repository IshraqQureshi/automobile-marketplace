-- appointment_vehicles: associates one or more vehicles with an appointment
-- (multi-car viewing, APT-003). Critical integrity rule enforced by the
-- validate_appointment_vehicle_showroom trigger (018 migration): every
-- vehicle attached to an appointment must belong to that appointment's
-- showroom_id.

create table public.appointment_vehicles (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint appointment_vehicles_unique unique (appointment_id, vehicle_id)
);

comment on table public.appointment_vehicles is
  'A customer must never be able to attach a vehicle from Showroom B to an appointment with Showroom A — enforced by trigger, not just application code.';
