-- Shared team workflow foundation for Switch to Switch V4
-- Add new internal roles without changing customer, auction, or expert records.
alter table public.staff_members drop constraint if exists staff_members_role_check;
alter table public.staff_members add constraint staff_members_role_check
  check (role = any (array['admin','expert','intake','sales','followup','legal','finance','contracts','dealer']::text[]));
alter table public.staff_sessions drop constraint if exists staff_sessions_role_check;
alter table public.staff_sessions add constraint staff_sessions_role_check
  check (role = any (array['admin','expert','intake','sales','followup','legal','finance','contracts','dealer']::text[]));
alter table public.staff_credentials drop constraint if exists staff_credentials_role_check;
alter table public.staff_credentials add constraint staff_credentials_role_check
  check (role = any (array['admin','expert','intake','sales','followup','legal','finance','contracts','dealer']::text[]));

create table if not exists public.case_team_updates (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  team_role text not null check (team_role = any (array['intake','sales','followup','legal','finance','contracts','admin']::text[])),
  staff_member_id uuid references public.staff_members(id) on delete set null,
  update_type text not null,
  payload jsonb not null default '{}'::jsonb,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists case_team_updates_case_created_idx
  on public.case_team_updates(case_id, created_at desc);

create table if not exists public.dealer_inventory (
  id uuid primary key default gen_random_uuid(),
  dealer_staff_id uuid not null references public.staff_members(id) on delete cascade,
  brand text not null,
  model text not null,
  trim text,
  model_year integer,
  color text,
  mileage bigint,
  price numeric(16,2) not null check (price >= 0),
  defects jsonb not null default '[]'::jsonb,
  photo_paths jsonb not null default '[]'::jsonb,
  notes text,
  availability text not null default 'available'
    check (availability = any (array['available','reserved','sold','hidden']::text[])),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dealer_inventory_available_idx
  on public.dealer_inventory(availability, brand, model);
create index if not exists dealer_inventory_dealer_idx
  on public.dealer_inventory(dealer_staff_id, updated_at desc);

create table if not exists public.case_financial_entries (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  entry_type text not null check (entry_type = any (array['prepayment','fine','commission','expense','deduction','seller_payout','buyer_payment','refund','other']::text[])),
  amount numeric(16,2) not null check (amount >= 0),
  note text not null,
  receipt_storage_path text,
  created_by uuid references public.staff_members(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists case_financial_entries_case_idx
  on public.case_financial_entries(case_id, created_at desc);

create table if not exists public.case_contract_records (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  contract_type text not null check (contract_type = any (array['sale','purchase','deposit_receipt','custody_receipt','delivery_receipt','power_of_attorney','other']::text[])),
  status text not null default 'draft' check (status = any (array['draft','ready','sent','signed','accepted','void']::text[])),
  storage_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.staff_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists case_contract_records_case_idx
  on public.case_contract_records(case_id, created_at desc);

-- Tables are accessed through the Edge Function using its service role; do not expose
-- direct anonymous/authenticated table access.
alter table public.case_team_updates enable row level security;
alter table public.dealer_inventory enable row level security;
alter table public.case_financial_entries enable row level security;
alter table public.case_contract_records enable row level security;
\n-- Keep the sales estimate distinct from the customer-agreed final price.\nalter table public.cases add column if not exists sales_suggested_price numeric(16,2) check (sales_suggested_price is null or sales_suggested_price >= 0);\n