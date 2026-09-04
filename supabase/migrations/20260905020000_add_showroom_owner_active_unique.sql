-- Enforces "one active showroom registration per owner" at the database
-- level (defense in depth alongside the application-layer check in
-- registerShowroomAction). PENDING/APPROVED/SUSPENDED all block a second
-- registration; REJECTED does not, so an owner whose application was
-- rejected can register again.

create unique index showrooms_owner_user_id_active_unique
  on public.showrooms (owner_user_id)
  where status in ('PENDING', 'APPROVED', 'SUSPENDED');
