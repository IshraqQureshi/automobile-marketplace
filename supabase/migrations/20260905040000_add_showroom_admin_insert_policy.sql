-- showrooms_insert_own (20260903203104_create_rls_policies.sql) requires
-- owner_user_id = auth.uid(), so an admin creating a showroom on behalf of
-- an existing user has no INSERT path today — RLS policies are OR'd
-- together, so this is a purely additive second policy rather than a
-- replacement of the existing owner-self-registration one.
create policy showrooms_insert_admin
  on public.showrooms for insert
  to authenticated
  with check (public.is_admin());
