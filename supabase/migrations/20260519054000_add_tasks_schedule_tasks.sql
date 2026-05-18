create table if not exists public.tasks (
  id text primary key,
  project_id text references public.projects(id) on delete cascade,
  title text not null,
  description text default '',
  assignee text default '',
  due_date text default '',
  priority text default 'medium',
  status text default 'open',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.schedule_tasks (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  name text not null default '',
  phase text default '',
  assignee text default '',
  start_date text default '',
  end_date text default '',
  duration_days integer,
  status text default 'not-started',
  progress integer default 0,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.tasks enable row level security;
alter table public.schedule_tasks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'tasks' and policyname = 'allow_all'
  ) then
    create policy "allow_all" on public.tasks for all using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'schedule_tasks' and policyname = 'allow_all'
  ) then
    create policy "allow_all" on public.schedule_tasks for all using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'schedule_tasks'
  ) then
    alter publication supabase_realtime add table public.schedule_tasks;
  end if;
end $$;

notify pgrst, 'reload schema';
