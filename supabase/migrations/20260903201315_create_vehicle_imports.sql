-- vehicle_imports: tracks bulk vehicle spreadsheet imports (SHR-009).
-- Imported vehicles must always be associated with the authenticated
-- showroom — showroom_id here must never be trusted from spreadsheet content.

create table public.vehicle_imports (
  id uuid primary key default gen_random_uuid(),
  showroom_id uuid not null references public.showrooms (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  file_name text not null,
  storage_path text,
  status public.vehicle_import_status not null default 'PENDING',
  total_rows integer not null default 0,
  successful_rows integer not null default 0,
  failed_rows integer not null default 0,
  error_report jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint vehicle_imports_row_counts_non_negative check (
    total_rows >= 0 and successful_rows >= 0 and failed_rows >= 0
  )
);

comment on table public.vehicle_imports is
  'Invalid rows must never silently become successful records — see SHR-009 acceptance criteria.';
