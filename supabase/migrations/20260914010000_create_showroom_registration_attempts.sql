-- Abuse guard for the new public (unauthenticated) showroom registration
-- endpoint (registerShowroomPublicAction) — that action creates a real
-- Supabase Auth account and sends a real email for every submission, with
-- no session/CAPTCHA in front of it, so without some throttle a script
-- could create unlimited accounts and email-bomb arbitrary addresses.
--
-- No client-facing RLS policies at all (same reasoning as vehicle_views'
-- own migration comment) — only the server action, via the service-role
-- client, ever reads or writes this table.
create table public.showroom_registration_attempts (
  id uuid primary key default gen_random_uuid(),
  -- Hashed the same way vehicle_views hashes an anonymous viewer's IP
  -- (src/features/vehicle/view-tracking.ts's hashClientIp) — this only
  -- needs to dedupe/count, never to identify anyone.
  ip_hash text,
  email text not null,
  created_at timestamptz not null default now()
);

comment on table public.showroom_registration_attempts is
  'Every public showroom-registration submission attempt (success or failure), logged before the invite is sent, so a rate-limit check counts retries too. No client-facing RLS — service-role only.';

create index showroom_registration_attempts_ip_hash_created_at_idx on public.showroom_registration_attempts (ip_hash, created_at);
create index showroom_registration_attempts_email_created_at_idx on public.showroom_registration_attempts (email, created_at);

alter table public.showroom_registration_attempts enable row level security;
