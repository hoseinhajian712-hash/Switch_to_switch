alter function public.enforce_booking_capacity() set search_path = public, pg_temp;
create index if not exists cases_customer_id_created_at_idx on public.cases (customer_id, created_at desc) where customer_id is not null;
