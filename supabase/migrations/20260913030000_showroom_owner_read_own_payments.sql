-- Per direct request: a showroom owner can now see their own subscription
-- payment/invoice history and due status in their own dashboard sidebar —
-- previously manual_payments was admin-only, full stop (see
-- 20260907000000_add_showroom_subscription_to_manual_payments.sql's own
-- note that no policy change was needed *yet*). Read-only: insert/update
-- stay admin-only (manual_payments_insert_admin_only/_update_admin_only,
-- 20260903203104_create_rls_policies.sql) — an owner can view but never
-- create/edit/void a payment record themselves.
--
-- Scoped to showroom_id is not null (a subscription payment) — an
-- appointment-linked payment (showroom_id null) stays admin-only, since a
-- showroom owner has no legitimate reason to read those rows at all.
create policy manual_payments_select_own_showroom
  on public.manual_payments for select
  to authenticated
  using (showroom_id is not null and public.owns_showroom(showroom_id));
