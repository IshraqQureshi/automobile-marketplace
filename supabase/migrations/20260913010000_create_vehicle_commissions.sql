-- vehicle_commissions: platform commission owed/paid for a vehicle sold on
-- behalf of a showroom. Admin-entered manually per sale (no automated
-- calculation — the client's own explicit choice over a fixed global/
-- per-showroom percentage), same "MVP has no automated payment processing"
-- reasoning as manual_payments (20260903201314). Admin-only, full stop —
-- a showroom has no visibility into its own commission record; this is an
-- internal platform financial record, not something to show the seller.

create type public.commission_status as enum ('PENDING', 'PAID');

create table public.vehicle_commissions (
  id uuid primary key default gen_random_uuid(),
  -- One commission record per vehicle — a vehicle only sells once (its own
  -- status just moves to SOLD, it isn't re-listed), so this is a 1:1, not a
  -- history log. Admin edits the same row rather than creating a new one.
  vehicle_id uuid not null unique references public.vehicles (id) on delete cascade,
  amount numeric(12, 2) not null,
  status public.commission_status not null default 'PENDING',
  notes text,
  recorded_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint vehicle_commissions_amount_non_negative check (amount >= 0)
);

comment on table public.vehicle_commissions is
  'Admin-only, manually-entered commission per sold vehicle. No showroom-facing visibility — an internal platform financial record.';

alter table public.vehicle_commissions enable row level security;

create policy vehicle_commissions_select_admin_only
  on public.vehicle_commissions for select
  to authenticated
  using (public.is_admin());

create policy vehicle_commissions_insert_admin_only
  on public.vehicle_commissions for insert
  to authenticated
  with check (public.is_admin() and recorded_by = auth.uid());

create policy vehicle_commissions_update_admin_only
  on public.vehicle_commissions for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- No delete policy — a commission record is corrected by editing amount/
-- status, never removed, same "void, don't delete" reasoning as
-- manual_payments.
