-- system_settings: database-backed source of truth for configurable
-- application/business behavior. Secrets must NEVER be stored here — see
-- DATABASE.md §19. Seeding approved default values happens in FND-004,
-- alongside the RLS policies that make is_public/is_editable meaningful.

create table public.system_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  value jsonb not null,
  value_type public.system_setting_value_type not null,
  description text,
  category text not null,
  is_public boolean not null default false,
  is_editable boolean not null default true,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint system_settings_key_unique unique (key),
  constraint system_settings_key_not_blank check (btrim(key) <> '')
);

comment on table public.system_settings is
  'Application/business configuration only — never credentials. Client must never freely set key/value_type/is_editable; validate against an approved registry (FND-004+).';
