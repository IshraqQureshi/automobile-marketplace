-- Catalog tables (brands/models/vehicle_types) are reference data: anyone
-- (including anonymous visitors) can read them — the public header nav and
-- vehicle detail pages need them — but only admins can create/edit/delete
-- entries, matching the is_admin() write-gating pattern used throughout
-- (see supabase/migrations/20260903203104_create_rls_policies.sql).

alter table public.brands enable row level security;
alter table public.models enable row level security;
alter table public.vehicle_types enable row level security;

create policy brands_select_all
  on public.brands for select
  using (true);

create policy brands_insert_admin_only
  on public.brands for insert
  to authenticated
  with check (public.is_admin());

create policy brands_update_admin_only
  on public.brands for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy brands_delete_admin_only
  on public.brands for delete
  to authenticated
  using (public.is_admin());

create policy models_select_all
  on public.models for select
  using (true);

create policy models_insert_admin_only
  on public.models for insert
  to authenticated
  with check (public.is_admin());

create policy models_update_admin_only
  on public.models for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy models_delete_admin_only
  on public.models for delete
  to authenticated
  using (public.is_admin());

create policy vehicle_types_select_all
  on public.vehicle_types for select
  using (true);

create policy vehicle_types_insert_admin_only
  on public.vehicle_types for insert
  to authenticated
  with check (public.is_admin());

create policy vehicle_types_update_admin_only
  on public.vehicle_types for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy vehicle_types_delete_admin_only
  on public.vehicle_types for delete
  to authenticated
  using (public.is_admin());
