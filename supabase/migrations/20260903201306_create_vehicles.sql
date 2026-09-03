-- vehicles: vehicle listings.
-- Financing fields (added 2026-09-04, from design review) drive the
-- per-listing finance calculator (MKT-008). All financing fields are
-- nullable — when unset, the calculator falls back to system_settings
-- platform defaults.

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  showroom_id uuid not null references public.showrooms (id) on delete cascade,
  title text not null,
  make text not null,
  model text not null,
  variant text,
  year integer not null,
  price numeric(12, 2) not null,
  mileage integer,
  fuel_type text,
  transmission text,
  body_type text,
  color text,
  description text,
  status public.vehicle_status not null default 'DRAFT',

  financing_down_payment_percent numeric(5, 2),
  financing_interest_rate numeric(5, 2),
  financing_tenure_options_months integer[],
  financing_partner text,
  financing_insurance_percent numeric(5, 2),
  financing_tracker_options jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint vehicles_price_non_negative check (price >= 0),
  constraint vehicles_mileage_non_negative check (mileage is null or mileage >= 0),
  constraint vehicles_year_reasonable check (
    year between 1900 and (extract(year from now())::integer + 1)
  ),
  constraint vehicles_financing_down_payment_percent_range check (
    financing_down_payment_percent is null
    or financing_down_payment_percent between 0 and 100
  ),
  constraint vehicles_financing_interest_rate_non_negative check (
    financing_interest_rate is null or financing_interest_rate >= 0
  ),
  constraint vehicles_financing_insurance_percent_range check (
    financing_insurance_percent is null
    or financing_insurance_percent between 0 and 100
  ),
  constraint vehicles_financing_tenure_options_non_empty check (
    financing_tenure_options_months is null
    or array_length(financing_tenure_options_months, 1) > 0
  ),
  constraint vehicles_financing_tracker_options_is_array check (
    financing_tracker_options is null
    or jsonb_typeof(financing_tracker_options) = 'array'
  )
);

comment on table public.vehicles is
  'Every vehicle belongs to exactly one showroom. Only appropriate statuses may appear publicly (enforced by RLS, FND-004).';
