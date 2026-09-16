-- Client feedback: "For insurance, add 2 options to select: PSV or
-- Private. This option can be selected by user as well" — replaces the
-- single flat insurance rate with two real rates (a vehicle's insurance
-- cost genuinely differs by PSV vs Private use in Kenya), letting the
-- customer pick which applies to them on the finance calculator, same
-- pattern as the existing Tracker duration picker. "Please add 3rd year
-- for tracking" — a third tracker duration, same fixed-price convention
-- as the existing 1/2-year fields.
alter table public.vehicles
  add column financing_insurance_percent_psv numeric(5, 2),
  add column financing_insurance_percent_private numeric(5, 2),
  add column financing_tracker_3_year_price numeric(12, 2);

alter table public.vehicles
  add constraint vehicles_financing_insurance_percent_psv_range
  check (financing_insurance_percent_psv is null or financing_insurance_percent_psv between 0 and 100),
  add constraint vehicles_financing_insurance_percent_private_range
  check (financing_insurance_percent_private is null or financing_insurance_percent_private between 0 and 100),
  add constraint vehicles_financing_tracker_3_year_price_non_negative
  check (financing_tracker_3_year_price is null or financing_tracker_3_year_price >= 0);

-- Backfill: seed both new rates from the existing flat one rather than
-- leaving them null — we don't know which type the previously-configured
-- single rate was actually meant for, but leaving both blank would
-- silently blank out real, currently-displayed data on every vehicle
-- that already has financing configured. Showroom owners can correct
-- either rate afterward.
update public.vehicles
set financing_insurance_percent_psv = financing_insurance_percent,
    financing_insurance_percent_private = financing_insurance_percent
where financing_insurance_percent is not null;

alter table public.vehicles drop column financing_insurance_percent;

comment on column public.vehicles.financing_insurance_percent_psv is
  'Annual comprehensive insurance, % of price, for PSV (public service vehicle) use.';
comment on column public.vehicles.financing_insurance_percent_private is
  'Annual comprehensive insurance, % of price, for private use.';
comment on column public.vehicles.financing_tracker_3_year_price is
  'Flat tracker subscription fee for a 3-year plan, alongside the existing 1/2-year fields.';
