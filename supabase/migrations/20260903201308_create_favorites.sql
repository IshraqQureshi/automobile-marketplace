-- favorites: customer favorite vehicles.

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint favorites_unique_customer_vehicle unique (customer_id, vehicle_id)
);

comment on table public.favorites is
  'Only authenticated customers may create favorites; duplicates are prevented at the database level.';
