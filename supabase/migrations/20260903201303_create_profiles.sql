-- profiles: extends auth.users with application-level user information.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'CUSTOMER',
  full_name text not null default '',
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Extends auth.users. A user has exactly one application role. Role changes must go through a trusted server/admin process — see prevent_profile_self_role_escalation trigger.';
