-- Indexes for known query patterns (DATABASE.md §33). Not blanket-indexing
-- every column — these map to filters/sorts the marketplace, appointment,
-- and admin flows are already known to need.

create index profiles_role_idx on public.profiles (role);
create index profiles_is_active_idx on public.profiles (is_active);

create index showrooms_owner_user_id_idx on public.showrooms (owner_user_id);
create index showrooms_status_idx on public.showrooms (status);
create index showrooms_city_idx on public.showrooms (city);

create index showroom_documents_showroom_id_idx on public.showroom_documents (showroom_id);

create index vehicles_showroom_id_idx on public.vehicles (showroom_id);
create index vehicles_status_idx on public.vehicles (status);
create index vehicles_make_idx on public.vehicles (make);
create index vehicles_model_idx on public.vehicles (model);
create index vehicles_year_idx on public.vehicles (year);
create index vehicles_price_idx on public.vehicles (price);
create index vehicles_mileage_idx on public.vehicles (mileage);
create index vehicles_created_at_idx on public.vehicles (created_at);

create index vehicle_media_vehicle_id_idx on public.vehicle_media (vehicle_id);

create index favorites_customer_id_idx on public.favorites (customer_id);
create index favorites_vehicle_id_idx on public.favorites (vehicle_id);

create index vehicle_inquiries_vehicle_id_idx on public.vehicle_inquiries (vehicle_id);
create index vehicle_inquiries_showroom_id_idx on public.vehicle_inquiries (showroom_id);
create index vehicle_inquiries_customer_id_idx on public.vehicle_inquiries (customer_id);

create index showroom_availability_showroom_id_idx on public.showroom_availability (showroom_id);

create index appointments_customer_id_idx on public.appointments (customer_id);
create index appointments_showroom_id_idx on public.appointments (showroom_id);
create index appointments_appointment_date_idx on public.appointments (appointment_date);
create index appointments_status_idx on public.appointments (status);

create index appointment_vehicles_appointment_id_idx on public.appointment_vehicles (appointment_id);
create index appointment_vehicles_vehicle_id_idx on public.appointment_vehicles (vehicle_id);

create index notifications_appointment_id_idx on public.notifications (appointment_id);
create index notifications_user_id_idx on public.notifications (user_id);
create index notifications_status_idx on public.notifications (status);

create index manual_payments_appointment_id_idx on public.manual_payments (appointment_id);
create index manual_payments_customer_id_idx on public.manual_payments (customer_id);

create index vehicle_imports_showroom_id_idx on public.vehicle_imports (showroom_id);
create index vehicle_imports_status_idx on public.vehicle_imports (status);

create index activity_logs_actor_user_id_idx on public.activity_logs (actor_user_id);
create index activity_logs_resource_type_idx on public.activity_logs (resource_type);
create index activity_logs_resource_id_idx on public.activity_logs (resource_id);
create index activity_logs_created_at_idx on public.activity_logs (created_at);

create index system_settings_category_idx on public.system_settings (category);
create index system_settings_is_public_idx on public.system_settings (is_public);
