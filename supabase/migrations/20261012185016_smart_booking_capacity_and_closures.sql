create table if not exists public.booking_settings (
  id smallint primary key default 1 check (id = 1),
  daily_capacity integer not null default 9 check (daily_capacity between 1 and 9),
  blocked_dates date[] not null default '{}'::date[],
  blocked_slots jsonb not null default '{}'::jsonb check (jsonb_typeof(blocked_slots) = 'object'),
  updated_at timestamptz not null default now()
);

insert into public.booking_settings (id, daily_capacity, blocked_dates, blocked_slots)
values (1, 9, '{}'::date[], '{}'::jsonb)
on conflict (id) do nothing;

alter table public.booking_settings enable row level security;
revoke all on public.booking_settings from anon, authenticated;
grant all on public.booking_settings to service_role;

create or replace function public.enforce_booking_capacity()
returns trigger
language plpgsql
as $$
declare
  cfg public.booking_settings%rowtype;
  booked_count integer;
  blocked_for_date jsonb;
begin
  if tg_op = 'UPDATE' then
    if not (
      new.appointment_date is distinct from old.appointment_date
      or new.appointment_time is distinct from old.appointment_time
      or new.appointment_status is distinct from old.appointment_status
      or (old.status in ('cancelled','done') and new.status not in ('cancelled','done'))
    ) then
      return new;
    end if;
  end if;

  if new.appointment_date is null or new.appointment_time is null
     or new.appointment_status not in ('requested','confirmed')
     or new.status in ('cancelled','done') then
    return new;
  end if;

  select * into cfg from public.booking_settings where id = 1 for update;
  if not found then
    cfg.daily_capacity := 9;
    cfg.blocked_dates := '{}'::date[];
    cfg.blocked_slots := '{}'::jsonb;
  end if;

  if new.appointment_date = any(cfg.blocked_dates) then
    raise exception 'این روز برای رزرو بسته است؛ لطفاً روز دیگری انتخاب کنید.'
      using errcode = 'P0001';
  end if;

  blocked_for_date := coalesce(cfg.blocked_slots -> new.appointment_date::text, '[]'::jsonb);
  if jsonb_typeof(blocked_for_date) = 'array'
     and blocked_for_date ? to_char(new.appointment_time, 'HH24:MI') then
    raise exception 'این ساعت توسط مدیریت بسته شده است؛ لطفاً ساعت دیگری انتخاب کنید.'
      using errcode = 'P0001';
  end if;

  select count(*) into booked_count
  from public.cases c
  where c.appointment_date = new.appointment_date
    and c.appointment_time is not null
    and c.appointment_status in ('requested','confirmed')
    and c.status not in ('cancelled','done')
    and c.id is distinct from new.id;

  if booked_count >= coalesce(cfg.daily_capacity, 9) then
    raise exception 'ظرفیت رزرو این روز تکمیل شده است؛ لطفاً روز دیگری انتخاب کنید.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists cases_enforce_booking_capacity on public.cases;
create trigger cases_enforce_booking_capacity
before insert or update of appointment_date, appointment_time, appointment_status, status
on public.cases
for each row execute function public.enforce_booking_capacity();
