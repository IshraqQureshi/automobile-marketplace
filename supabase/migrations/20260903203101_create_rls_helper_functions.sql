-- Reusable, security-definer helper functions for RLS policies.
--
-- These are `security definer` + pinned `search_path` deliberately: without
-- that, each helper's own internal SELECT against `profiles`/`showrooms`
-- would itself be subject to RLS on those tables, which is either circular
-- (profiles checking profiles) or wrong (a showroom-ownership check that
-- can't see the showrooms table because the caller isn't its owner — the
-- exact question being asked). `stable` lets the planner cache repeated
-- calls within one statement instead of re-evaluating per row.

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- The service-role client (used by trusted server-side code, e.g.
-- src/lib/supabase/admin.ts) authenticates with a JWT that has no `sub`
-- claim, so auth.uid() is NULL for it — it would otherwise fail this check
-- even though it's the most trusted caller there is. RLS *policies*
-- transparently bypass for service_role (BYPASSRLS), but ordinary triggers
-- do not get that bypass, so any trigger using is_admin() as a gate (e.g.
-- prevent_showroom_self_approval) needs this function to recognize
-- service_role explicitly, not just an app-level ADMIN profile.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(auth.role() = 'service_role', false)
    or coalesce((select role = 'ADMIN' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.owns_showroom(target_showroom_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.showrooms
    where id = target_showroom_id and owner_user_id = auth.uid()
  );
$$;
