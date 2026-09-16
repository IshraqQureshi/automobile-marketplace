-- Test-drive appointments must now be tied to a real signed-in customer
-- (client feedback: an anonymous booking's customer_id was null, so it
-- never showed up in that visitor's dashboard afterwards). The application
-- layer already rejects an anonymous submitAppointmentAction call, but per
-- CLAUDE.md that's not the real boundary — RLS is, so the anonymous-insert
-- branch that appointments_insert_public previously allowed is removed
-- here too, matching what the app now actually does.
drop policy appointments_insert_public on public.appointments;

create policy appointments_insert_customer
  on public.appointments for insert
  to authenticated
  with check (customer_id = auth.uid() and status = 'PENDING');
