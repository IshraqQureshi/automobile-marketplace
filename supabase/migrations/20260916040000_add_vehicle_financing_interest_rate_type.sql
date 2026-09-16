-- Client feedback: the admin/owner vehicle form's Interest Rate field was a
-- single %/year number, with no way to enter a flat fixed amount — same gap
-- financing_down_payment_type/financing_down_payment_amount already solved
-- for the down payment field (20260905070000). Mirrors that exact pattern:
-- financing_interest_rate (existing column) stays the percent figure,
-- financing_interest_rate_amount holds the new fixed-amount alternative,
-- and financing_interest_rate_type selects which one is active.

alter table public.vehicles
  add column financing_interest_rate_type text not null default 'PERCENT',
  add column financing_interest_rate_amount numeric(12, 2);

alter table public.vehicles
  add constraint vehicles_financing_interest_rate_type_check
  check (financing_interest_rate_type in ('PERCENT', 'FIXED'));

alter table public.vehicles
  add constraint vehicles_financing_interest_rate_amount_non_negative
  check (financing_interest_rate_amount is null or financing_interest_rate_amount >= 0);

comment on column public.vehicles.financing_interest_rate_type is
  'Whether financing_interest_rate (percent per year) or financing_interest_rate_amount (flat amount) is the active interest figure for this listing.';
comment on column public.vehicles.financing_interest_rate_amount is
  'Flat total interest amount, used instead of financing_interest_rate when financing_interest_rate_type is FIXED.';
