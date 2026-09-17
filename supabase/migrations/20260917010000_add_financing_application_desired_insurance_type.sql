-- Client feedback: "All the values for finance calculator should be in the
-- apply for finance form like insurance interest all field values" — the
-- calculator's insurance PSV/Private choice (20260916070000) wasn't yet
-- collected on "Apply for Financing", unlike down payment/tenure/tracker,
-- which already were. Same nullable, label-only convention as
-- desired_tracker_duration (20260916050000): only vehicles with insurance
-- configured show this field at all (see FinancingApplicationButton), and
-- only when BOTH PSV and Private are set does the applicant actually pick
-- one (a vehicle with just one configured has nothing to choose between).
alter table public.financing_applications
  add column desired_insurance_type text;

alter table public.financing_applications
  add constraint financing_applications_desired_insurance_type_valid
  check (desired_insurance_type is null or desired_insurance_type in ('PSV', 'PRIVATE'));

comment on column public.financing_applications.desired_insurance_type is
  'PSV or PRIVATE — which of the vehicle''s two insurance rates the applicant picked, matching the finance calculator''s own selector. Null when the vehicle has only one (or no) insurance rate configured, or the applicant left it unset.';
