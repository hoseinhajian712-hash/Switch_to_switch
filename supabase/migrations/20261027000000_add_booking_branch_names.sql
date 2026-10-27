alter table public.booking_settings
  add column if not exists branch_names text[] not null default '{}'::text[];
