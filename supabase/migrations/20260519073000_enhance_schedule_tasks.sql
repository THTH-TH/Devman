alter table public.schedule_tasks
  add column if not exists actual_start text default '',
  add column if not exists actual_end text default '',
  add column if not exists dependency_id text references public.schedule_tasks(id) on delete set null,
  add column if not exists lag_days integer default 0,
  add column if not exists internal_owner text default '',
  add column if not exists is_milestone boolean default false,
  add column if not exists notes text default '';

notify pgrst, 'reload schema';
