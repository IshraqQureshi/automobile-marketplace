-- The signup design (design/signup-page.png) requires a phone number field
-- that handle_new_user (FND-003) didn't capture. Unlike `role`, phone is
-- not a privilege field — trusting it from signup metadata carries no
-- escalation risk, so no new guard trigger is needed, just extending what
-- the existing trigger writes to the profile it creates.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone',
    'CUSTOMER'
  );
  return new;
end;
$$;
