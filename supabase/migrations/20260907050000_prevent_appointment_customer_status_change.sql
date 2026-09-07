-- appointments_update_customer_or_showroom_or_admin is deliberately broad at
-- the RLS layer (see its own comment) so that a customer can update fields on
-- their own booking (e.g. notes). That same broadness means a customer's own
-- authenticated Supabase client can call `.update({ status: 'CONFIRMED' })`
-- directly, self-approving their own test drive and completely bypassing the
-- showroom/admin confirm-or-decline workflow this PR introduces
-- (confirmAppointmentAction/declineAppointmentAction only guard PENDING at
-- the application layer, which a caller going around the server action can
-- simply skip). A BEFORE UPDATE trigger is used instead of narrowing the RLS
-- policy itself, since RLS's `with check` cannot compare against the row's
-- previous value — only a trigger has access to both OLD and NEW.
create or replace function public.prevent_appointment_customer_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status
     and not public.owns_showroom(old.showroom_id)
     and not public.is_admin() then
    raise exception 'Only the showroom or an admin may change an appointment''s status.';
  end if;
  return new;
end;
$$;

create trigger appointments_prevent_customer_status_change
  before update on public.appointments
  for each row
  execute function public.prevent_appointment_customer_status_change();
