-- updateShowroomAvailabilityAction previously did a delete-then-insert as two
-- separate Supabase calls: if the delete succeeded but the insert failed
-- (network blip, unexpected constraint violation), the showroom was left
-- with zero configured availability days, silently taking "Schedule Test
-- Drive" offline for that showroom. A single plpgsql function call runs as
-- one statement, so the delete+insert inside it are atomic — no `security
-- definer` needed here, RLS still applies against the calling user exactly
-- as it did for the two separate calls this replaces.
create or replace function public.replace_showroom_availability(p_showroom_id uuid, p_days jsonb)
returns void
language plpgsql
set search_path = public
as $$
begin
  delete from public.showroom_availability where showroom_id = p_showroom_id;

  insert into public.showroom_availability (showroom_id, day_of_week, start_time, end_time, is_available)
  select
    p_showroom_id,
    (day->>'dayOfWeek')::int,
    (day->>'startTime')::time,
    (day->>'endTime')::time,
    true
  from jsonb_array_elements(p_days) as day;
end;
$$;
