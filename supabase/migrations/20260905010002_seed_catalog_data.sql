-- Seed the initial vehicle catalog with the same brands/models/types
-- already shown as static placeholder text in the public header nav
-- (src/components/layout/header.tsx) — gives showrooms something to pick
-- from immediately (Day 2 vehicle-add flow) rather than shipping empty.
--
-- One correction from the header's original positional list: "Supra GR"
-- was listed at the same position as Porsche, but the Supra is a Toyota
-- model, not a Porsche one — seeded under Toyota instead (alongside Camry).
-- Porsche is seeded with no models rather than inventing one.

insert into public.brands (name) values
  ('BMW'),
  ('Mercedes-Benz'),
  ('Audi'),
  ('Toyota'),
  ('Porsche'),
  ('Tesla'),
  ('Honda'),
  ('Hyundai'),
  ('Volkswagen'),
  ('Range Rover');

insert into public.models (brand_id, name)
select b.id, m.name
from (values
  ('BMW', '3 Series'),
  ('Mercedes-Benz', 'C-Class'),
  ('Audi', 'A4'),
  ('Toyota', 'Camry'),
  ('Toyota', 'Supra GR'),
  ('Tesla', 'Model 3'),
  ('Honda', 'Civic'),
  ('Hyundai', 'Tucson'),
  ('Volkswagen', 'Golf'),
  ('Range Rover', 'Defender')
) as m(brand_name, name)
join public.brands b on b.name = m.brand_name;

insert into public.vehicle_types (name) values
  ('Sedan'),
  ('SUV'),
  ('Coupe'),
  ('Hatchback'),
  ('Pickup'),
  ('Convertible'),
  ('Wagon'),
  ('Electric'),
  ('Hybrid'),
  ('Diesel');
