-- vehicle_inquiries: one-way customer inquiry against a vehicle listing
-- ("Send Message" CTA — added 2026-09-04, from design review).
-- Deliberately NOT a chat/thread table — no reply/read-state modeling.
-- Real-time chat remains Phase 2.
--
-- showroom_id is populated by a trigger (set_vehicle_inquiry_showroom, in
-- the 018 migration) derived from vehicle_id — it must never be trusted
-- from client input.

create table public.vehicle_inquiries (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  showroom_id uuid not null references public.showrooms (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  message text not null,
  status public.vehicle_inquiry_status not null default 'NEW',
  created_at timestamptz not null default now(),

  constraint vehicle_inquiries_message_not_blank check (btrim(message) <> '')
);

comment on table public.vehicle_inquiries is
  'One-way inquiry form, not a chat thread. showroom_id is trigger-derived from vehicle_id, never client-supplied.';
