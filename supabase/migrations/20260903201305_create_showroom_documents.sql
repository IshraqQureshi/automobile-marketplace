-- showroom_documents: showroom verification/business documents.
-- Actual file storage + storage policies land in FND-004; this table only
-- tracks metadata and the storage_path the file will live at.

create table public.showroom_documents (
  id uuid primary key default gen_random_uuid(),
  showroom_id uuid not null references public.showrooms (id) on delete cascade,
  document_type text not null,
  storage_path text not null,
  status public.showroom_document_status not null default 'PENDING',
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.showroom_documents is
  'Verification/business documents. Must never be publicly accessible — see FND-004 storage policies.';
