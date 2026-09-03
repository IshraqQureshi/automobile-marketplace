-- manual_payments: admin-recorded payment information (MVP has no automated
-- payment processing — Phase 2). Only authorized admins may write here
-- (enforced by RLS, FND-004).

create table public.manual_payments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments (id) on delete set null,
  customer_id uuid references public.profiles (id) on delete set null,
  amount numeric(12, 2) not null,
  currency text not null default 'KES',
  payment_method text not null,
  reference text,
  status public.manual_payment_status not null default 'RECORDED',
  notes text,
  recorded_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint manual_payments_amount_non_negative check (amount >= 0)
);

comment on table public.manual_payments is
  'Manual admin entry only. No automated card/online payment processing occurs in MVP.';
