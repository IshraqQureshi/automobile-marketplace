-- APT-008 (Reschedule Appointment) — the showroom (or admin) can move a
-- PENDING/CONFIRMED/RESCHEDULED appointment to a new date/time, per
-- ACCEPTANCE_CRITERIA.md's lifecycle diagram (Pending/Confirmed →
-- Rescheduled → Confirmed/Rescheduled/Declined/Cancelled).
--
-- appointments_prevent_customer_status_change (PR #53's own code-review
-- fix) only ever guarded the `status` column — but the SAME
-- appointments_update_customer_or_showroom_or_admin RLS policy that lets a
-- customer update their own row (for notes) also lets a customer change
-- appointment_date/start_time/end_time directly, completely bypassing the
-- showroom-initiated reschedule workflow this migration introduces (and
-- potentially self-double-booking, since the exclusion constraint only
-- prevents overlap, not an unauthorized change in the first place).
-- Extended to cover the schedule columns too, not just status.
create or replace function public.prevent_appointment_customer_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.status is distinct from old.status
      or new.appointment_date is distinct from old.appointment_date
      or new.start_time is distinct from old.start_time
      or new.end_time is distinct from old.end_time)
     and not public.owns_showroom(old.showroom_id)
     and not public.is_admin() then
    raise exception 'Only the showroom or an admin may change an appointment''s status or schedule.';
  end if;
  return new;
end;
$$;
