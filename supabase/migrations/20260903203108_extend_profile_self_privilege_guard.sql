-- Code review (FND-004, PR #4) found that prevent_profile_self_role_escalation
-- (FND-003) guarded `role` but not `is_active` — a user could reactivate
-- their own account after an admin deactivated it via the broad
-- profiles_update_own_or_admin RLS policy, making is_active non-functional
-- as an admin suspension control. This is a fresh migration rather than
-- editing the FND-003 one, which already merged to main.
--
-- Renamed to reflect the broader responsibility: this now guards every
-- profile field that must stay admin-controlled, not just role.

drop trigger if exists prevent_profile_self_role_escalation on public.profiles;
drop function if exists public.prevent_profile_self_role_escalation();

create or replace function public.prevent_profile_self_privilege_changes()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() = old.id and (
    new.role is distinct from old.role
    or new.is_active is distinct from old.is_active
  ) then
    raise exception 'You cannot change your own role or active status.';
  end if;
  return new;
end;
$$;

create trigger prevent_profile_self_privilege_changes
  before update on public.profiles
  for each row execute function public.prevent_profile_self_privilege_changes();
