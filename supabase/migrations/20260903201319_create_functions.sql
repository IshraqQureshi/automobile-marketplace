-- Reusable trusted database functions/triggers. Kept intentionally small —
-- business logic stays in the application layer; only integrity rules that
-- must hold regardless of which code path writes to the table live here.

-- 1. Generic updated_at maintenance -----------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.showrooms
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.showroom_documents
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.vehicles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.showroom_availability
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.notifications
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.manual_payments
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.vehicle_imports
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.system_settings
  for each row execute function public.set_updated_at();

-- 2. Auto-create a profile row for every new auth.users row -----------------
--
-- Role is always hardcoded to CUSTOMER here. Client-supplied signup metadata
-- (e.g. raw_user_meta_data->>'role') must NEVER be trusted for role
-- assignment — that would be a self-registration privilege-escalation path.
-- Promotion to SHOWROOM/ADMIN happens only through a trusted server-side
-- process in later features (SHR-001, admin tooling).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'CUSTOMER'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Prevent a user from changing their own role -----------------------------
--
-- Defense in depth alongside RLS (FND-004): even a bug in a future RLS
-- policy must not let a customer promote themselves. auth.uid() is null for
-- service-role/admin operations, so trusted server-side role changes made
-- via the admin client are unaffected.
--
-- Blocks self-escalation only. Until FND-004 adds RLS, general write access
-- to this table (e.g. a different user's role) is otherwise unrestricted —
-- this trigger is not a substitute for RLS, only a narrower guarantee.
--
-- Does not need security definer: unlike the integrity triggers below, this
-- one only compares OLD/NEW on the row already being updated and reads
-- auth.uid() (a session-level GUC) — it performs no lookups against other
-- tables that a future RLS policy could restrict.

create or replace function public.prevent_profile_self_role_escalation()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() = old.id and new.role is distinct from old.role then
    raise exception 'You cannot change your own role.';
  end if;
  return new;
end;
$$;

create trigger prevent_profile_self_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_profile_self_role_escalation();

-- 4. Appointment/vehicle showroom integrity ----------------------------------
--
-- Every vehicle attached to an appointment must belong to that appointment's
-- showroom. Enforced here so no future code path (including bugs in the
-- booking feature itself) can violate it.
--
-- security definer + pinned search_path: this function looks up rows in
-- appointments/vehicles on behalf of whoever is inserting into
-- appointment_vehicles. Once FND-004 adds RLS, an invoker-rights version of
-- this lookup would run under the *calling user's* row visibility — e.g. a
-- customer who can't yet SELECT a given vehicle under their RLS policy would
-- make this lookup return no row, which the function would misreport as
-- "vehicle does not exist" for an otherwise legitimate booking. Marking it
-- security definer keeps this integrity check independent of the caller's
-- RLS visibility, which is what a data-integrity trigger should be.

create or replace function public.validate_appointment_vehicle_showroom()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment_showroom_id uuid;
  v_vehicle_showroom_id uuid;
begin
  select showroom_id into v_appointment_showroom_id
    from public.appointments where id = new.appointment_id;

  if v_appointment_showroom_id is null then
    raise exception 'Appointment % does not exist.', new.appointment_id;
  end if;

  select showroom_id into v_vehicle_showroom_id
    from public.vehicles where id = new.vehicle_id;

  if v_vehicle_showroom_id is null then
    raise exception 'Vehicle % does not exist.', new.vehicle_id;
  end if;

  if v_appointment_showroom_id <> v_vehicle_showroom_id then
    raise exception 'Vehicle % does not belong to the appointment''s showroom.', new.vehicle_id;
  end if;

  return new;
end;
$$;

create trigger validate_appointment_vehicle_showroom
  before insert on public.appointment_vehicles
  for each row execute function public.validate_appointment_vehicle_showroom();

-- 5. vehicle_inquiries.showroom_id is always trigger-derived -----------------
--
-- Never trust a client-supplied showroom_id for an inquiry — always derive
-- it from the vehicle being inquired about.
--
-- security definer + pinned search_path: same reasoning as
-- validate_appointment_vehicle_showroom above — this lookup against
-- vehicles must not depend on the calling customer's future RLS visibility,
-- otherwise a customer submitting an inquiry about a vehicle they can't
-- directly SELECT (depending on how FND-004 shapes that policy) would
-- incorrectly get "vehicle does not exist".

create or replace function public.set_vehicle_inquiry_showroom()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select showroom_id into new.showroom_id
    from public.vehicles where id = new.vehicle_id;

  if new.showroom_id is null then
    raise exception 'Vehicle % does not exist.', new.vehicle_id;
  end if;

  return new;
end;
$$;

create trigger set_vehicle_inquiry_showroom
  before insert on public.vehicle_inquiries
  for each row execute function public.set_vehicle_inquiry_showroom();
