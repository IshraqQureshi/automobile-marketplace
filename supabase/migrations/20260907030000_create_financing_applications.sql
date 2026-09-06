-- financing_applications: one-way "Apply for Financing" form on the
-- vehicle detail page — same one-way, snapshot-based model as
-- vehicle_inquiries (no reply/read-state thread, just a NEW/VIEWED status),
-- but collects the extra KYC/affordability fields a financing partner
-- actually needs (employment, income, national ID, desired down payment
-- and loan term) rather than a free-text message.
create type public.financing_application_status as enum ('NEW', 'VIEWED');

create table public.financing_applications (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  -- Trigger-derived from vehicle_id (set_financing_application_showroom,
  -- below) — never trusted from client input, same convention as
  -- vehicle_inquiries.showroom_id.
  showroom_id uuid not null references public.showrooms (id) on delete cascade,
  -- Nullable: an anonymous visitor can apply too, same as vehicle_inquiries
  -- (20260906040000) — contact_name/email/phone below are always the real
  -- snapshot of what was submitted, logged-in or not.
  customer_id uuid references public.profiles (id) on delete cascade,
  contact_name text not null,
  contact_email text not null,
  contact_phone text not null,
  employment_status text not null,
  monthly_income numeric not null,
  national_id text not null,
  desired_down_payment numeric not null,
  desired_tenure_months integer not null,
  notes text,
  status public.financing_application_status not null default 'NEW',
  created_at timestamptz not null default now(),

  constraint financing_applications_contact_name_not_blank check (btrim(contact_name) <> ''),
  constraint financing_applications_contact_email_not_blank check (btrim(contact_email) <> ''),
  constraint financing_applications_contact_phone_not_blank check (btrim(contact_phone) <> ''),
  constraint financing_applications_employment_status_valid check (employment_status in ('EMPLOYED', 'SELF_EMPLOYED', 'BUSINESS_OWNER')),
  constraint financing_applications_monthly_income_positive check (monthly_income > 0),
  constraint financing_applications_national_id_not_blank check (btrim(national_id) <> ''),
  constraint financing_applications_desired_down_payment_non_negative check (desired_down_payment >= 0),
  constraint financing_applications_desired_tenure_months_positive check (desired_tenure_months > 0)
);

comment on table public.financing_applications is
  'One-way "Apply for Financing" submissions against a vehicle listing. Not a chat/thread table — no reply/read-state modeling beyond NEW/VIEWED. showroom_id is trigger-derived from vehicle_id, never client-supplied.';

create index financing_applications_showroom_id_status_idx on public.financing_applications (showroom_id, status);

alter table public.financing_applications enable row level security;

create policy financing_applications_select_customer_or_showroom_or_admin
  on public.financing_applications for select
  to authenticated
  using (customer_id = auth.uid() or public.owns_showroom(showroom_id) or public.is_admin());

-- `to public`, gated on auth.uid() rather than the connecting SQL role —
-- exact same reasoning as vehicle_inquiries_insert_public
-- (20260906040000_add_vehicle_inquiry_contact_fields.sql): PostgREST's
-- anonymous requests connect as `authenticator`, never literally as a role
-- named `anon`, so a `to anon`-scoped policy would silently never apply.
create policy financing_applications_insert_public
  on public.financing_applications for insert
  to public
  with check (
    (auth.uid() is not null and customer_id = auth.uid())
    or (auth.uid() is null and customer_id is null)
  );

create policy financing_applications_update_showroom_or_admin
  on public.financing_applications for update
  to authenticated
  using (public.owns_showroom(showroom_id) or public.is_admin())
  with check (public.owns_showroom(showroom_id) or public.is_admin());
-- Showroom/admin marks NEW -> VIEWED; the applicant cannot edit a submitted application.

-- Mirrors set_vehicle_inquiry_showroom (20260903201319_create_functions.sql)
-- exactly — security definer + pinned search_path so this lookup doesn't
-- depend on the calling customer's own RLS visibility into vehicles.
create or replace function public.set_financing_application_showroom()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select showroom_id into new.showroom_id
    from public.vehicles where id = new.vehicle_id;

  if new.showroom_id is null then
    raise exception 'Vehicle % does not exist.', new.vehicle_id;
  end if;

  return new;
end;
$$;

create trigger set_financing_application_showroom
  before insert on public.financing_applications
  for each row execute function public.set_financing_application_showroom();
