-- Vehicle catalog reference data: Brands, Models (nested under a Brand), and
-- Types (body/fuel category, independent of Brand/Model). Showrooms select
-- from these when adding a vehicle (SHR-005/006, Day 2) rather than free-
-- typing a make/model — keeps the header's existing Brands/Model/Type nav
-- (src/components/layout/header.tsx) and vehicle listings on one controlled
-- vocabulary. Admin-managed (see RLS policies in the next migration).

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint brands_name_not_blank check (btrim(name) <> ''),
  constraint brands_name_unique unique (name)
);

comment on table public.brands is
  'Vehicle manufacturer/marque catalog (e.g. Toyota, BMW) — admin-managed, publicly readable.';

create table public.models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint models_name_not_blank check (btrim(name) <> ''),
  constraint models_brand_id_name_unique unique (brand_id, name)
);

comment on table public.models is
  'Vehicle model catalog, scoped to one Brand (e.g. Camry under Toyota) — admin-managed, publicly readable.';

create table public.vehicle_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint vehicle_types_name_not_blank check (btrim(name) <> ''),
  constraint vehicle_types_name_unique unique (name)
);

comment on table public.vehicle_types is
  'Vehicle body/fuel type catalog (e.g. Sedan, SUV, Electric) — admin-managed, publicly readable.';

create trigger set_updated_at before update on public.brands
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.models
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.vehicle_types
  for each row execute function public.set_updated_at();
