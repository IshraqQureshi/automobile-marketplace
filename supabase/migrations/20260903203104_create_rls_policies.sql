-- RLS policies. Every table enabled in 20260903203103_enable_rls.sql gets
-- explicit policies here — anything not covered defaults to fully denied
-- (Postgres RLS default-deny), which is intentional for tables like
-- activity_logs and manual_payments where normal users get no write access
-- at all.

-- ============================================================================
-- profiles
-- ============================================================================

create policy profiles_select_own_or_admin
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update_own_or_admin
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- No INSERT policy: profile rows are created only by the handle_new_user
-- trigger (security definer, bypasses RLS). No DELETE policy: deactivate
-- via is_active instead of deleting.

-- ============================================================================
-- showrooms
-- ============================================================================

create policy showrooms_select_public_or_owner_or_admin
  on public.showrooms for select
  using (status = 'APPROVED' or owner_user_id = auth.uid() or public.is_admin());

create policy showrooms_insert_own
  on public.showrooms for insert
  to authenticated
  with check (owner_user_id = auth.uid());

create policy showrooms_update_owner_or_admin
  on public.showrooms for update
  to authenticated
  using (owner_user_id = auth.uid() or public.is_admin())
  with check (owner_user_id = auth.uid() or public.is_admin());
-- Approval-field protection (status/verified) is enforced by the
-- prevent_showroom_self_approval trigger, not by this policy.

create policy showrooms_delete_admin_only
  on public.showrooms for delete
  to authenticated
  using (public.is_admin());

-- ============================================================================
-- showroom_documents (never public)
-- ============================================================================

create policy showroom_documents_select_owner_or_admin
  on public.showroom_documents for select
  to authenticated
  using (public.owns_showroom(showroom_id) or public.is_admin());

create policy showroom_documents_insert_owner
  on public.showroom_documents for insert
  to authenticated
  with check (public.owns_showroom(showroom_id) and uploaded_by = auth.uid());

create policy showroom_documents_update_admin_only
  on public.showroom_documents for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
-- Review fields (status, reviewed_by, reviewed_at) are admin-controlled;
-- owners re-upload (insert a new row) rather than editing a submitted one.

create policy showroom_documents_delete_owner_or_admin
  on public.showroom_documents for delete
  to authenticated
  using (public.owns_showroom(showroom_id) or public.is_admin());

-- ============================================================================
-- vehicles
-- ============================================================================

-- Public visibility requires BOTH the vehicle being ACTIVE and its showroom
-- being APPROVED — a vehicle marked ACTIVE by a still-PENDING showroom must
-- not be publicly visible (core business rule: only approved showrooms may
-- operate as active marketplace businesses).
create policy vehicles_select_public_or_owner_or_admin
  on public.vehicles for select
  using (
    (
      status = 'ACTIVE'
      and exists (
        select 1 from public.showrooms s
        where s.id = vehicles.showroom_id and s.status = 'APPROVED'
      )
    )
    or public.owns_showroom(showroom_id)
    or public.is_admin()
  );

create policy vehicles_insert_owner
  on public.vehicles for insert
  to authenticated
  with check (public.owns_showroom(showroom_id));

create policy vehicles_update_owner_or_admin
  on public.vehicles for update
  to authenticated
  using (public.owns_showroom(showroom_id) or public.is_admin())
  with check (public.owns_showroom(showroom_id) or public.is_admin());

create policy vehicles_delete_owner_or_admin
  on public.vehicles for delete
  to authenticated
  using (public.owns_showroom(showroom_id) or public.is_admin());

-- ============================================================================
-- vehicle_media (visibility inherited from the parent vehicle)
-- ============================================================================

-- Same public-visibility rule as vehicles: ACTIVE vehicle AND APPROVED showroom.
create policy vehicle_media_select_public_or_owner_or_admin
  on public.vehicle_media for select
  using (
    exists (
      select 1 from public.vehicles v
      join public.showrooms s on s.id = v.showroom_id
      where v.id = vehicle_media.vehicle_id
        and (
          (v.status = 'ACTIVE' and s.status = 'APPROVED')
          or public.owns_showroom(v.showroom_id)
          or public.is_admin()
        )
    )
  );

create policy vehicle_media_insert_owner
  on public.vehicle_media for insert
  to authenticated
  with check (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_media.vehicle_id and public.owns_showroom(v.showroom_id)
    )
  );

create policy vehicle_media_update_owner_or_admin
  on public.vehicle_media for update
  to authenticated
  using (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_media.vehicle_id
        and (public.owns_showroom(v.showroom_id) or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_media.vehicle_id
        and (public.owns_showroom(v.showroom_id) or public.is_admin())
    )
  );

create policy vehicle_media_delete_owner_or_admin
  on public.vehicle_media for delete
  to authenticated
  using (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_media.vehicle_id
        and (public.owns_showroom(v.showroom_id) or public.is_admin())
    )
  );

-- ============================================================================
-- favorites (fully private to the owning customer)
-- ============================================================================

create policy favorites_select_own
  on public.favorites for select
  to authenticated
  using (customer_id = auth.uid());

create policy favorites_insert_own
  on public.favorites for insert
  to authenticated
  with check (customer_id = auth.uid());

create policy favorites_delete_own
  on public.favorites for delete
  to authenticated
  using (customer_id = auth.uid());

-- ============================================================================
-- vehicle_inquiries (one-way; showroom_id is trigger-derived, see FND-003)
-- ============================================================================

create policy vehicle_inquiries_select_customer_or_showroom_or_admin
  on public.vehicle_inquiries for select
  to authenticated
  using (customer_id = auth.uid() or public.owns_showroom(showroom_id) or public.is_admin());

create policy vehicle_inquiries_insert_customer
  on public.vehicle_inquiries for insert
  to authenticated
  with check (customer_id = auth.uid());

create policy vehicle_inquiries_update_showroom_or_admin
  on public.vehicle_inquiries for update
  to authenticated
  using (public.owns_showroom(showroom_id) or public.is_admin())
  with check (public.owns_showroom(showroom_id) or public.is_admin());
-- Showroom marks NEW -> VIEWED; customers cannot edit a submitted inquiry.

-- ============================================================================
-- showroom_availability (public read — customers need it to book)
-- ============================================================================

create policy showroom_availability_select_public
  on public.showroom_availability for select
  using (true);

create policy showroom_availability_insert_owner
  on public.showroom_availability for insert
  to authenticated
  with check (public.owns_showroom(showroom_id));

create policy showroom_availability_update_owner_or_admin
  on public.showroom_availability for update
  to authenticated
  using (public.owns_showroom(showroom_id) or public.is_admin())
  with check (public.owns_showroom(showroom_id) or public.is_admin());

create policy showroom_availability_delete_owner_or_admin
  on public.showroom_availability for delete
  to authenticated
  using (public.owns_showroom(showroom_id) or public.is_admin());

-- ============================================================================
-- appointments
-- ============================================================================

create policy appointments_select_customer_or_showroom_or_admin
  on public.appointments for select
  to authenticated
  using (customer_id = auth.uid() or public.owns_showroom(showroom_id) or public.is_admin());

create policy appointments_insert_customer
  on public.appointments for insert
  to authenticated
  with check (customer_id = auth.uid());

create policy appointments_update_customer_or_showroom_or_admin
  on public.appointments for update
  to authenticated
  using (customer_id = auth.uid() or public.owns_showroom(showroom_id) or public.is_admin())
  with check (customer_id = auth.uid() or public.owns_showroom(showroom_id) or public.is_admin());
-- Broad by design for FND-004 — which specific status transitions each
-- party may perform is enforced by application logic in APT-007/008/009/010,
-- not carved into RLS here.

create policy appointments_delete_admin_only
  on public.appointments for delete
  to authenticated
  using (public.is_admin());

-- ============================================================================
-- appointment_vehicles (access inherited from the parent appointment)
-- ============================================================================

create policy appointment_vehicles_select_via_appointment
  on public.appointment_vehicles for select
  to authenticated
  using (
    exists (
      select 1 from public.appointments a
      where a.id = appointment_vehicles.appointment_id
        and (a.customer_id = auth.uid() or public.owns_showroom(a.showroom_id) or public.is_admin())
    )
  );

create policy appointment_vehicles_insert_customer
  on public.appointment_vehicles for insert
  to authenticated
  with check (
    exists (
      select 1 from public.appointments a
      where a.id = appointment_vehicles.appointment_id and a.customer_id = auth.uid()
    )
  );

create policy appointment_vehicles_delete_customer_or_admin
  on public.appointment_vehicles for delete
  to authenticated
  using (
    exists (
      select 1 from public.appointments a
      where a.id = appointment_vehicles.appointment_id
        and (a.customer_id = auth.uid() or public.is_admin())
    )
  );

-- ============================================================================
-- notifications (read-only for the recipient; writes are system-generated)
-- ============================================================================

create policy notifications_select_own_or_admin
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- No insert/update/delete policy for regular users — notifications are
-- created/updated by trusted server code via the service-role client,
-- which bypasses RLS entirely. Admin gets none either; there is no
-- legitimate reason for a human to hand-edit a notification row.

-- ============================================================================
-- manual_payments (admin only, full stop)
-- ============================================================================

create policy manual_payments_select_admin_only
  on public.manual_payments for select
  to authenticated
  using (public.is_admin());

create policy manual_payments_insert_admin_only
  on public.manual_payments for insert
  to authenticated
  with check (public.is_admin() and recorded_by = auth.uid());

create policy manual_payments_update_admin_only
  on public.manual_payments for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- No delete policy — void a payment via status = 'VOIDED', never delete.

-- ============================================================================
-- vehicle_imports
-- ============================================================================

create policy vehicle_imports_select_owner_or_admin
  on public.vehicle_imports for select
  to authenticated
  using (public.owns_showroom(showroom_id) or public.is_admin());

create policy vehicle_imports_insert_owner
  on public.vehicle_imports for insert
  to authenticated
  with check (public.owns_showroom(showroom_id) and uploaded_by = auth.uid());

create policy vehicle_imports_update_admin_only
  on public.vehicle_imports for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
-- Import processing (status/row-count updates) runs via the service-role
-- client, which bypasses RLS — this policy only covers manual admin fixes.

-- ============================================================================
-- activity_logs (admin-read, append-only — no policy allows any write)
-- ============================================================================

create policy activity_logs_select_admin_only
  on public.activity_logs for select
  to authenticated
  using (public.is_admin());

-- ============================================================================
-- system_settings
-- ============================================================================

create policy system_settings_select_public_or_admin
  on public.system_settings for select
  using (is_public = true or public.is_admin());

create policy system_settings_update_admin_editable_only
  on public.system_settings for update
  to authenticated
  using (public.is_admin() and is_editable = true)
  with check (public.is_admin() and is_editable = true);

-- No insert/delete policy for anyone via the normal client — the approved
-- settings catalog is seeded by migration (FND-004 seed step), not created
-- ad hoc by admins through the table API.
