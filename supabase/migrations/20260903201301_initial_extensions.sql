-- Extensions required by the MVP schema.
-- gen_random_uuid() is built into PostgreSQL 13+, but pgcrypto is enabled
-- for the wider set of crypto helpers Supabase projects conventionally rely on.
create extension if not exists pgcrypto with schema extensions;
