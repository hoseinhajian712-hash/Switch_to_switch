alter table public.cases
  add column if not exists assigned_expert_staff_id uuid
  references public.staff_members(id) on delete set null;

alter table public.cases
  add column if not exists assigned_expert_name text;

create index if not exists cases_assigned_expert_staff_id_idx
  on public.cases(assigned_expert_staff_id);
