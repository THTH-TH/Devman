-- Archispace DevMan — Database Schema
-- Run this in the Supabase SQL Editor

create table if not exists projects (
  id text primary key,
  name text not null,
  address text not null default '',
  client_entity text default '',
  owner text default '',
  team_members jsonb default '[]',
  start_date text default '',
  target_completion text default '',
  current_stage text default 'feasibility',
  status text default 'Active',
  description text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists checklist_items (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  stage_id text not null,
  label text not null,
  description text default '',
  owner text default '',
  due_date text default '',
  status text default 'not-started',
  priority text default 'medium',
  required_to_progress boolean default false,
  is_blocker boolean default false,
  done boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists milestones (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  stage_id text not null,
  label text not null,
  date text default '',
  complete boolean default false
);

create table if not exists activity_log (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  action text not null,
  detail text default '',
  actor text default '',
  occurred_at timestamptz default now()
);

-- Row Level Security (open for internal team use)
alter table projects enable row level security;
alter table checklist_items enable row level security;
alter table milestones enable row level security;
alter table activity_log enable row level security;

create policy "allow_all" on projects for all using (true) with check (true);
create policy "allow_all" on checklist_items for all using (true) with check (true);
create policy "allow_all" on milestones for all using (true) with check (true);
create policy "allow_all" on activity_log for all using (true) with check (true);

-- Enable real-time sync
alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table checklist_items;
alter publication supabase_realtime add table milestones;
alter publication supabase_realtime add table activity_log;
