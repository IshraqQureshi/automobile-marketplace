-- Client requirement: the showroom's "Extra" field on a vehicle becomes
-- Fixed (one flat amount) or Yearly (a separate amount for a 1, 2 and 3 year
-- term). On the public page the buyer's chosen loan term (12/24/36 months)
-- picks which yearly amount applies.
--
-- 'PERCENT' stays a valid value so existing listings that use a %/year rate
-- keep calculating exactly as before until their showroom re-saves them
-- (the dashboard form no longer offers PERCENT, and the server rejects it
-- on save). No data is converted or deleted here, and the column's default
-- stays 'PERCENT' so direct inserts (seed scripts, fixtures) that rely on it
-- keep working — the app always sends the type explicitly.

alter table public.vehicles
  drop constraint vehicles_financing_interest_rate_type_check;

alter table public.vehicles
  add constraint vehicles_financing_interest_rate_type_check
  check (financing_interest_rate_type in ('PERCENT', 'FIXED', 'YEARLY'));

alter table public.vehicles
  add column financing_interest_amount_1yr numeric(12, 2),
  add column financing_interest_amount_2yr numeric(12, 2),
  add column financing_interest_amount_3yr numeric(12, 2);

alter table public.vehicles
  add constraint vehicles_financing_interest_amount_1yr_non_negative
    check (financing_interest_amount_1yr is null or financing_interest_amount_1yr >= 0),
  add constraint vehicles_financing_interest_amount_2yr_non_negative
    check (financing_interest_amount_2yr is null or financing_interest_amount_2yr >= 0),
  add constraint vehicles_financing_interest_amount_3yr_non_negative
    check (financing_interest_amount_3yr is null or financing_interest_amount_3yr >= 0);

comment on column public.vehicles.financing_interest_amount_1yr is
  'Total Extra amount for a 1-year (12 month) term, used when financing_interest_rate_type is YEARLY.';
comment on column public.vehicles.financing_interest_amount_2yr is
  'Total Extra amount for a 2-year (24 month) term, used when financing_interest_rate_type is YEARLY.';
comment on column public.vehicles.financing_interest_amount_3yr is
  'Total Extra amount for a 3-year (36 month) term, used when financing_interest_rate_type is YEARLY.';
