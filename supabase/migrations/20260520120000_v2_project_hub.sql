alter table projects
  add column if not exists active_stage_ids jsonb default '[]'::jsonb;

update projects
set active_stage_ids = to_jsonb(array[current_stage])
where active_stage_ids is null or active_stage_ids = '[]'::jsonb;

create table if not exists calendar_events (
  id text primary key,
  project_id text references projects(id) on delete cascade,
  stage_id text default '',
  title text not null default '',
  event_date text not null default '',
  event_type text default 'event',
  notes text default '',
  created_by text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists companies (
  id text primary key,
  name text not null default '',
  type text default '',
  phone text default '',
  email text default '',
  website text default '',
  address text default '',
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists contacts (
  id text primary key,
  company_id text references companies(id) on delete set null,
  name text not null default '',
  title text default '',
  email text default '',
  phone text default '',
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists project_contacts (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  company_id text references companies(id) on delete set null,
  contact_id text references contacts(id) on delete set null,
  project_role text default '',
  discipline text default '',
  stage_ids jsonb default '[]'::jsonb,
  status text default 'active',
  is_primary boolean default false,
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists daily_logs (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  log_date text not null default '',
  summary text default '',
  work_completed text default '',
  blockers text default '',
  next_steps text default '',
  weather text default '',
  created_by text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists schedule_templates (
  id text primary key,
  name text not null default '',
  description text default '',
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists schedule_template_items (
  id text primary key,
  template_id text not null references schedule_templates(id) on delete cascade,
  phase text default '',
  name text not null default '',
  offset_days integer default 0,
  duration_days integer default 1,
  is_milestone boolean default false,
  dependency_key text default '',
  notes text default '',
  sort_order integer default 0
);

create index if not exists idx_calendar_events_project on calendar_events(project_id);
create index if not exists idx_calendar_events_date on calendar_events(event_date);
create index if not exists idx_contacts_company on contacts(company_id);
create index if not exists idx_project_contacts_project on project_contacts(project_id);
create index if not exists idx_daily_logs_project_date on daily_logs(project_id, log_date);
create index if not exists idx_schedule_template_items_template on schedule_template_items(template_id, sort_order);

alter table calendar_events enable row level security;
alter table companies enable row level security;
alter table contacts enable row level security;
alter table project_contacts enable row level security;
alter table daily_logs enable row level security;
alter table schedule_templates enable row level security;
alter table schedule_template_items enable row level security;

drop policy if exists "authenticated_all_calendar_events" on calendar_events;
drop policy if exists "authenticated_all_companies" on companies;
drop policy if exists "authenticated_all_contacts" on contacts;
drop policy if exists "authenticated_all_project_contacts" on project_contacts;
drop policy if exists "authenticated_all_daily_logs" on daily_logs;
drop policy if exists "authenticated_all_schedule_templates" on schedule_templates;
drop policy if exists "authenticated_all_schedule_template_items" on schedule_template_items;

create policy "authenticated_all_calendar_events" on calendar_events for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_all_companies" on companies for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_all_contacts" on contacts for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_all_project_contacts" on project_contacts for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_all_daily_logs" on daily_logs for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_all_schedule_templates" on schedule_templates for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_all_schedule_template_items" on schedule_template_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into schedule_templates (id, name, description, is_default)
values ('archispace-standard-development-programme', 'Archispace Standard Development Programme', 'Default Archispace property development schedule template.', true)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  is_default = excluded.is_default,
  updated_at = now();

insert into schedule_template_items (id, template_id, phase, name, offset_days, duration_days, is_milestone, sort_order)
values
  ('arch-std-001', 'archispace-standard-development-programme', 'Project Commencement', 'Project setup and consultant engagement', 0, 3, false, 0),
  ('arch-std-002', 'archispace-standard-development-programme', 'Feasibility', 'Planning and feasibility review', 1, 10, false, 1),
  ('arch-std-003', 'archispace-standard-development-programme', 'Feasibility', 'Initial concept and servicing review', 6, 12, false, 2),
  ('arch-std-004', 'archispace-standard-development-programme', 'Acquisition', 'Due diligence period', 10, 15, false, 3),
  ('arch-std-005', 'archispace-standard-development-programme', 'Acquisition', 'Purchase confirmed / unconditional', 25, 1, true, 4),
  ('arch-std-006', 'archispace-standard-development-programme', 'Funding & Legal', 'Funding and legal structure confirmed', 18, 14, false, 5),
  ('arch-std-007', 'archispace-standard-development-programme', 'Resource Consent', 'RC consultant inputs and documentation', 30, 25, false, 6),
  ('arch-std-008', 'archispace-standard-development-programme', 'Resource Consent', 'Resource consent lodged', 55, 1, true, 7),
  ('arch-std-009', 'archispace-standard-development-programme', 'Resource Consent', 'Council processing and RFI responses', 56, 40, false, 8),
  ('arch-std-010', 'archispace-standard-development-programme', 'Resource Consent', 'Resource consent approved', 96, 1, true, 9),
  ('arch-std-011', 'archispace-standard-development-programme', 'Building Consent', 'BC documentation and consultant coordination', 80, 30, false, 10),
  ('arch-std-012', 'archispace-standard-development-programme', 'Building Consent', 'Building consent lodged', 110, 1, true, 11),
  ('arch-std-013', 'archispace-standard-development-programme', 'Building Consent', 'BC processing and RFI responses', 111, 35, false, 12),
  ('arch-std-014', 'archispace-standard-development-programme', 'Building Consent', 'Building consent approved', 146, 1, true, 13),
  ('arch-std-015', 'archispace-standard-development-programme', 'Engineering Plan Approvals', 'Authority approvals and pre-start requirements', 120, 30, false, 14),
  ('arch-std-016', 'archispace-standard-development-programme', 'Pricing', 'QS estimate, tender review and final pricing', 130, 25, false, 15),
  ('arch-std-017', 'archispace-standard-development-programme', 'Sales & Marketing', 'Sales collateral and launch readiness', 140, 30, false, 16),
  ('arch-std-018', 'archispace-standard-development-programme', 'Construction', 'Pre-start, procurement and site establishment', 150, 15, false, 17),
  ('arch-std-019', 'archispace-standard-development-programme', 'Construction', 'Construction commenced', 165, 1, true, 18),
  ('arch-std-020', 'archispace-standard-development-programme', 'Construction', 'Construction works', 166, 120, false, 19),
  ('arch-std-021', 'archispace-standard-development-programme', 'Settlement & Handover', 'CCC, warranties and handover documentation', 286, 25, false, 20),
  ('arch-std-022', 'archispace-standard-development-programme', 'Settlement & Handover', 'Practical completion / settlement', 311, 1, true, 21)
on conflict (id) do update set
  phase = excluded.phase,
  name = excluded.name,
  offset_days = excluded.offset_days,
  duration_days = excluded.duration_days,
  is_milestone = excluded.is_milestone,
  sort_order = excluded.sort_order;

do $$
begin
  alter publication supabase_realtime add table calendar_events;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table companies;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table contacts;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table project_contacts;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table daily_logs;
exception when duplicate_object then null;
end $$;
