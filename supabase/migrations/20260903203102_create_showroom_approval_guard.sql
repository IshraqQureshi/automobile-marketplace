-- Mirrors prevent_profile_self_role_escalation (FND-003): a showroom owner
-- can update their own showroom's business info, but approval fields
-- (status, verified) must stay under admin control even though the RLS
-- UPDATE policy on showrooms allows owners to update their own row broadly.
-- RLS's WITH CHECK can't compare NEW against OLD, so this is a trigger.

create or replace function public.prevent_showroom_self_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() and (
    new.status is distinct from old.status
    or new.verified is distinct from old.verified
  ) then
    raise exception 'Only an admin can change a showroom''s approval status.';
  end if;
  return new;
end;
$$;

create trigger prevent_showroom_self_approval
  before update on public.showrooms
  for each row execute function public.prevent_showroom_self_approval();
