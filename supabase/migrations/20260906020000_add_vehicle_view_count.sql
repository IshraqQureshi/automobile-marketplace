-- Real page-view counting for the vehicle detail page. A plain client-side
-- UPDATE isn't possible (vehicles' write RLS is owner/admin-only — see
-- 20260903203104_create_rls_policies.sql), so a narrow security-definer
-- function is the only way an anonymous visitor's view can be counted at
-- all, same reasoning as is_admin()/owns_showroom() in
-- 20260903203101_create_rls_helper_functions.sql. It does exactly one
-- bounded thing (increment one integer column by 1 for one row) and returns
-- nothing, so it can't be used to read or write anything else.

alter table public.vehicles
  add column view_count integer not null default 0;

comment on column public.vehicles.view_count is
  'Real, not-deduplicated count of detail-page loads — incremented via increment_vehicle_view_count(), not written directly. Callable directly by anon (not just via the page), so a scripted caller could inflate it; acceptable for an informational counter with no fraud/rate-limiting requirement, not acceptable if this ever backs a ranking or payout decision.';

create or replace function public.increment_vehicle_view_count(target_vehicle_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.vehicles
  set view_count = view_count + 1
  where id = target_vehicle_id and status = 'ACTIVE';
$$;

grant execute on function public.increment_vehicle_view_count(uuid) to anon, authenticated;
