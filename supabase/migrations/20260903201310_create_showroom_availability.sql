-- showroom_availability: showroom appointment availability windows.
--
-- Overlapping windows for the same showroom+day are NOT prevented at the
-- database level (DATABASE.md phrases this as "should be prevented or
-- normalized", not a hard requirement — a real overlap-exclusion constraint
-- needs btree_gist and is more machinery than FND-003's schema-only scope
-- justifies). APT-001 application logic must validate this when it lands.

create table public.showroom_availability (
  id uuid primary key default gen_random_uuid(),
  showroom_id uuid not null references public.showrooms (id) on delete cascade,
  day_of_week integer not null,
  start_time time not null,
  end_time time not null,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint showroom_availability_day_of_week_range check (day_of_week between 0 and 6),
  constraint showroom_availability_time_range check (start_time < end_time)
);

comment on table public.showroom_availability is
  'day_of_week: 0 = Sunday .. 6 = Saturday. Showroom users manage only their own availability (RLS, FND-004).';
