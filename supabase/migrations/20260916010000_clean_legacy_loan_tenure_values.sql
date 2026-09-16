-- LOAN_TENURE_OPTIONS_MONTHS (src/features/vehicle/schemas.ts) was tightened
-- from [12,24,36,48,60,72] to [12,24,36] per direct client request, and the
-- dashboard vehicle form's checkboxes were updated to only ever offer/save
-- those three going forward. But any vehicle saved *before* that change
-- could still be carrying a legacy 48/60/72 value in its stored array —
-- the dashboard form has no checkbox to represent/uncheck a value outside
-- its own current options list, so there was no way for an owner to clear
-- it themselves, and it kept rendering publicly on that vehicle's own
-- financing calculator. One-time cleanup: drop any value outside the
-- current allowed set from every vehicle's stored array; an array left
-- empty becomes null (allowed by vehicles_financing_tenure_check).
update public.vehicles
set financing_tenure_options_months = (
  select case when count(*) = 0 then null else array_agg(v order by v) end
  from unnest(financing_tenure_options_months) as v
  where v in (12, 24, 36)
)
where financing_tenure_options_months is not null;
