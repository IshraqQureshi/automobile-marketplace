-- Extends vehicle_inquiries (20260903201309) to support the "Send Message"
-- CTA actually being built: a non-authenticated visitor must be able to
-- submit an inquiry too (name/email/phone entered by hand), not just a
-- signed-in customer — the original schema required customer_id (and thus
-- auth.uid()) on every row. contact_name/contact_email/contact_phone now
-- capture what was actually submitted at inquiry time for EVERY inquiry
-- (logged-in or not) — a stable snapshot, rather than joining back through
-- customer_id to profiles/auth.users (whose values can change later).

alter table public.vehicle_inquiries
  alter column customer_id drop not null,
  add column contact_name text not null,
  add column contact_email text not null,
  add column contact_phone text not null;

alter table public.vehicle_inquiries
  add constraint vehicle_inquiries_contact_name_not_blank check (btrim(contact_name) <> ''),
  add constraint vehicle_inquiries_contact_email_not_blank check (btrim(contact_email) <> ''),
  add constraint vehicle_inquiries_contact_phone_not_blank check (btrim(contact_phone) <> '');

drop policy vehicle_inquiries_insert_customer on public.vehicle_inquiries;

-- One policy, `to public`, gated on auth.uid() rather than the connecting
-- SQL role — `vehicles_select_public_or_owner_or_admin` (20260903203104)
-- already establishes this project's convention of scoping a
-- publicly-reachable policy `to public`, not `to anon`: PostgREST's
-- anonymous requests here connect as `authenticator`, never literally
-- switching to a Postgres role named `anon`, so a `to anon`-scoped policy
-- silently never applies to them (confirmed live — a real 42501 on every
-- anonymous insert attempt). Splitting into two roles instead of gating on
-- auth.uid() would also let a signed-in caller bypass their own
-- customer_id = auth.uid() requirement simply by sending customer_id: null
-- directly against the REST API (Postgres ORs every applicable permissive
-- policy) — auth.uid() is NULL only for a genuinely unauthenticated
-- request, so that gap doesn't exist here.
create policy vehicle_inquiries_insert_public
  on public.vehicle_inquiries for insert
  to public
  with check (
    (auth.uid() is not null and customer_id = auth.uid())
    or (auth.uid() is null and customer_id is null)
  );
