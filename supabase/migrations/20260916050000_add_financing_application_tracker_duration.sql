-- Client feedback: "Apply for Finance" should offer the same tracker fee
-- choice the finance calculator already has, not just down payment and
-- loan term. Nullable — only vehicles with tracker options configured show
-- this field at all (see FinancingApplicationButton), so most applications
-- have none.
alter table public.financing_applications
  add column desired_tracker_duration text;

comment on column public.financing_applications.desired_tracker_duration is
  'The tracker fee option label (e.g. "1 Year") the applicant picked, matching one of the vehicle''s own financing_tracker_options durations. Null when the vehicle has no tracker options or the applicant left it unset.';
