-- notifications: tracks system-generated Email/WhatsApp notifications.
-- A notification failure must never roll back a valid appointment — this
-- table only records attempts, it never participates in the transaction
-- that creates/updates the appointment itself.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  appointment_id uuid references public.appointments (id) on delete set null,
  channel public.notification_channel not null,
  notification_type public.notification_type not null,
  status public.notification_status not null default 'PENDING',
  recipient text not null,
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.notifications is
  'Provider credentials (Meta/SMTP) remain in environment secrets, never in this table.';
