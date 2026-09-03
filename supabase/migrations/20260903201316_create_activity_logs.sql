-- activity_logs: audit-friendly activity records. Append-oriented — normal
-- users must never have write access (enforced by RLS, FND-004).

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

comment on table public.activity_logs is
  'Append-oriented audit trail. Must not store unnecessary sensitive information in metadata.';
