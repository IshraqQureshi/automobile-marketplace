-- Replaces the flat per-render increment (20260906020000) with a real,
-- deduplicated view counter per user requirement:
--   - one view per logged-in user, ever (not per page load)
--   - one view per anonymous visitor, keyed by IP
--   - the vehicle's own showroom owner viewing their own listing never counts
--   - an admin viewing any listing never counts
--   - only a genuine customer visit increments the count
--
-- vehicle_views is the dedup ledger; vehicles.view_count stays a cached
-- counter (kept in sync by record_vehicle_view()) so the detail page can
-- keep reading a plain integer column rather than a count(*) subquery.

create table public.vehicle_views (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  -- 'user:<profile id>' for a logged-in viewer (from auth.uid(), never
  -- client-supplied) or 'ip:<sha256 of the request IP>' for anonymous —
  -- hashed rather than storing raw IPs, since this only needs to dedupe,
  -- not to identify anyone.
  viewer_key text not null,
  created_at timestamptz not null default now(),

  constraint vehicle_views_unique unique (vehicle_id, viewer_key)
);

comment on table public.vehicle_views is
  'Dedup ledger backing vehicles.view_count — one row per (vehicle, real viewer). No client-facing RLS policies; only record_vehicle_view() (security definer) touches this table.';

alter table public.vehicle_views enable row level security;

drop function if exists public.increment_vehicle_view_count(uuid);

create or replace function public.record_vehicle_view(target_vehicle_id uuid, anon_viewer_ip_hash text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_showroom_id uuid;
  v_viewer_key text;
begin
  if auth.uid() is not null then
    -- Admin and the listing's own showroom owner browsing their own
    -- inventory are real visits, but not customer interest — never counted.
    if public.is_admin() then
      return;
    end if;

    select showroom_id into v_showroom_id
    from public.vehicles
    where id = target_vehicle_id and status = 'ACTIVE';

    if v_showroom_id is null then
      return;
    end if;

    if public.owns_showroom(v_showroom_id) then
      return;
    end if;

    v_viewer_key := 'user:' || auth.uid()::text;
  else
    if anon_viewer_ip_hash is null or btrim(anon_viewer_ip_hash) = '' then
      return;
    end if;
    v_viewer_key := 'ip:' || anon_viewer_ip_hash;
  end if;

  insert into public.vehicle_views (vehicle_id, viewer_key)
  values (target_vehicle_id, v_viewer_key)
  on conflict (vehicle_id, viewer_key) do nothing;

  -- FOUND reflects whether the INSERT actually added a row (false when
  -- ON CONFLICT DO NOTHING skipped it) — only a genuinely new viewer
  -- increments the cached counter.
  if found then
    update public.vehicles set view_count = view_count + 1 where id = target_vehicle_id;
  end if;
end;
$$;

grant execute on function public.record_vehicle_view(uuid, text) to anon, authenticated;
