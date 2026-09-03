-- showrooms: businesses selling/listing vehicles.
-- MVP is showroom-only — individual sellers are confirmed Phase 2 (2026-09-04).

create table public.showrooms (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles (id) on delete restrict,
  business_name text not null,
  description text,
  phone text not null,
  email text not null,
  address text,
  city text,
  latitude numeric,
  longitude numeric,
  opening_hours jsonb,
  status public.showroom_status not null default 'PENDING',
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint showrooms_business_name_not_blank check (btrim(business_name) <> '')
);

comment on table public.showrooms is
  'One showroom belongs to one owning profile. Only status = APPROVED showrooms may operate publicly.';
