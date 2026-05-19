-- Archispace DevMan — Database Schema
-- Run this in the Supabase SQL Editor

create table if not exists projects (
  id text primary key,
  name text not null,
  address text not null default '',
  client_entity text default '',
  owner text default '',
  bc_number text default '',
  legal_description text default '',
  owner_contact_person text default '',
  owner_mailing_address text default '',
  owner_phone text default '',
  owner_email text default '',
  building_work_description text default '',
  place_id text default '',
  latitude double precision,
  longitude double precision,
  suburb text default '',
  city text default '',
  region text default '',
  postal_code text default '',
  country text default '',
  property_snapshot jsonb default '{}'::jsonb,
  drive_folder_url text default '',
  drive_root_folder_id text default '',
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

create table if not exists documents (
  id text primary key,
  project_id text references projects(id) on delete set null,
  name text not null,
  url text default '',
  category text default 'other',
  notes text default '',
  added_by text default '',
  drive_file_id text default '',
  drive_url text default '',
  source text default 'manual_link',
  gmail_message_id text default '',
  gmail_thread_id text default '',
  created_at timestamptz default now()
);

create table if not exists google_workspace_connections (
  id text primary key default 'default',
  provider_account_email text default '',
  access_token text not null,
  refresh_token text default '',
  token_expires_at timestamptz not null,
  scopes text[] default '{}',
  root_folder_id text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists team_members (
  id text primary key,
  name text not null,
  role text default '',
  email text default '',
  phone text default ''
);

create table if not exists tasks (
  id text primary key,
  project_id text references projects(id) on delete cascade,
  title text not null,
  description text default '',
  assignee text default '',
  due_date text default '',
  priority text default 'medium',
  status text default 'open',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists schedule_tasks (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  name text not null default '',
  phase text default '',
  assignee text default '',
  start_date text default '',
  end_date text default '',
  actual_start text default '',
  actual_end text default '',
  dependency_id text references schedule_tasks(id) on delete set null,
  lag_days integer default 0,
  internal_owner text default '',
  is_milestone boolean default false,
  notes text default '',
  duration_days integer,
  status text default 'not-started',
  progress integer default 0,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table documents enable row level security;
alter table team_members enable row level security;
alter table tasks enable row level security;
alter table schedule_tasks enable row level security;
create policy "allow_all" on documents for all using (true) with check (true);
create policy "allow_all" on team_members for all using (true) with check (true);
create policy "allow_all" on tasks for all using (true) with check (true);
create policy "allow_all" on schedule_tasks for all using (true) with check (true);

-- Simple project document storage. This keeps uploaded files in Supabase Storage
-- and stores the public file URL in the documents table.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do update set public = true;

drop policy if exists "allow_documents_upload" on storage.objects;
drop policy if exists "allow_documents_select" on storage.objects;
drop policy if exists "allow_documents_update" on storage.objects;
drop policy if exists "allow_documents_delete" on storage.objects;

create policy "allow_documents_upload"
on storage.objects for insert
with check (bucket_id = 'documents');

create policy "allow_documents_select"
on storage.objects for select
using (bucket_id = 'documents');

create policy "allow_documents_update"
on storage.objects for update
using (bucket_id = 'documents')
with check (bucket_id = 'documents');

create policy "allow_documents_delete"
on storage.objects for delete
using (bucket_id = 'documents');

alter table schedule_tasks
  add column if not exists actual_start text default '',
  add column if not exists actual_end text default '',
  add column if not exists dependency_id text references schedule_tasks(id) on delete set null,
  add column if not exists lag_days integer default 0,
  add column if not exists internal_owner text default '',
  add column if not exists is_milestone boolean default false,
  add column if not exists notes text default '';

-- Enable real-time sync
alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table checklist_items;
alter publication supabase_realtime add table milestones;
alter publication supabase_realtime add table activity_log;
alter publication supabase_realtime add table documents;
alter publication supabase_realtime add table team_members;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table schedule_tasks;
