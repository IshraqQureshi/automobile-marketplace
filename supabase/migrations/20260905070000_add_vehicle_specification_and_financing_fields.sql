-- Additional vehicle specification and financing fields, requested after
-- the initial vehicle management feature (PR #26) shipped — the original
-- vehicles table (20260903201306) covered the MVP requirements doc's
-- financing fields (down payment %, interest rate, tenure, partner,
-- insurance %, tracker options) but not these newly-requested spec fields,
-- nor a fixed-amount alternative to percentage-based down payment, nor the
-- installment/bank-finance toggles.

alter table public.vehicles
  add column engine text,
  add column interior text,
  add column doors integer,
  add column seats integer,
  add column country_of_origin text,
  add column financing_down_payment_type text not null default 'PERCENT',
  add column financing_down_payment_amount numeric(12, 2),
  add column installment_enabled boolean not null default false,
  add column bank_finance_enabled boolean not null default false;

alter table public.vehicles
  add constraint vehicles_financing_down_payment_type_check
  check (financing_down_payment_type in ('PERCENT', 'FIXED'));

alter table public.vehicles
  add constraint vehicles_financing_down_payment_amount_non_negative
  check (financing_down_payment_amount is null or financing_down_payment_amount >= 0);

alter table public.vehicles
  add constraint vehicles_doors_range
  check (doors is null or doors between 1 and 10);

alter table public.vehicles
  add constraint vehicles_seats_range
  check (seats is null or seats between 1 and 20);

comment on column public.vehicles.financing_down_payment_type is
  'Whether financing_down_payment_percent or financing_down_payment_amount is the active down payment figure for this listing.';
comment on column public.vehicles.installment_enabled is
  'Showroom has opted this listing into HP/installment financing — the per-listing finance calculator (MKT-008) only shows for a listing where this is true.';
comment on column public.vehicles.bank_finance_enabled is
  'Showroom has opted this listing into third-party bank finance — informational flag only, no calculator attached to it.';
