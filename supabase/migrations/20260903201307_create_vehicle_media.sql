-- vehicle_media: vehicle image metadata. Actual files live in Supabase
-- Storage (bucket + policies land in FND-004); this table tracks the path.

create table public.vehicle_media (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  storage_path text not null,
  media_type text not null default 'image',
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

-- At most one primary image per vehicle.
create unique index vehicle_media_one_primary_per_vehicle
  on public.vehicle_media (vehicle_id)
  where is_primary = true;

comment on table public.vehicle_media is
  'Media belongs to exactly one vehicle. Storage authorization must match this table''s ownership (FND-004).';
