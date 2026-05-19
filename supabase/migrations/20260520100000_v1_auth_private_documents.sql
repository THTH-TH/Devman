create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  name text not null default '',
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "profiles_authenticated_select" on profiles;
drop policy if exists "profiles_self_insert" on profiles;
drop policy if exists "profiles_self_update" on profiles;

create policy "profiles_authenticated_select"
on profiles for select
using (auth.role() = 'authenticated');

create policy "profiles_self_insert"
on profiles for insert
with check (auth.uid() = id);

create policy "profiles_self_update"
on profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1), 'Team member'),
    'member'
  )
  on conflict (id) do update
  set email = excluded.email,
      name = coalesce(nullif(public.profiles.name, ''), excluded.name),
      updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

insert into public.profiles (id, email, name, role)
select
  id,
  coalesce(email, ''),
  coalesce(raw_user_meta_data->>'name', split_part(coalesce(email, ''), '@', 1), 'Team member'),
  'member'
from auth.users
on conflict (id) do nothing;

alter table documents
  add column if not exists stage_id text default '',
  add column if not exists storage_path text default '',
  add column if not exists file_name text default '',
  add column if not exists mime_type text default '',
  add column if not exists file_size bigint,
  add column if not exists uploaded_by uuid references auth.users(id) on delete set null;

create index if not exists idx_documents_stage_id on documents(stage_id);
create index if not exists idx_documents_storage_path on documents(storage_path) where storage_path <> '';
create index if not exists idx_documents_uploaded_by on documents(uploaded_by);

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update set public = false;

drop policy if exists "allow_documents_upload" on storage.objects;
drop policy if exists "allow_documents_select" on storage.objects;
drop policy if exists "allow_documents_update" on storage.objects;
drop policy if exists "allow_documents_delete" on storage.objects;
drop policy if exists "documents_authenticated_select" on storage.objects;
drop policy if exists "documents_authenticated_insert" on storage.objects;
drop policy if exists "documents_authenticated_update" on storage.objects;
drop policy if exists "documents_authenticated_delete" on storage.objects;

create policy "documents_authenticated_select"
on storage.objects for select
using (bucket_id = 'documents' and auth.role() = 'authenticated');

create policy "documents_authenticated_insert"
on storage.objects for insert
with check (bucket_id = 'documents' and auth.role() = 'authenticated');

create policy "documents_authenticated_update"
on storage.objects for update
using (bucket_id = 'documents' and auth.role() = 'authenticated')
with check (bucket_id = 'documents' and auth.role() = 'authenticated');

create policy "documents_authenticated_delete"
on storage.objects for delete
using (bucket_id = 'documents' and auth.role() = 'authenticated');

drop policy if exists "allow_all" on projects;
drop policy if exists "allow_all" on checklist_items;
drop policy if exists "allow_all" on milestones;
drop policy if exists "allow_all" on activity_log;
drop policy if exists "allow_all" on documents;
drop policy if exists "allow_all" on team_members;
drop policy if exists "allow_all" on tasks;
drop policy if exists "allow_all" on schedule_tasks;

drop policy if exists "authenticated_all_projects" on projects;
drop policy if exists "authenticated_all_checklist_items" on checklist_items;
drop policy if exists "authenticated_all_milestones" on milestones;
drop policy if exists "authenticated_all_activity_log" on activity_log;
drop policy if exists "authenticated_all_documents" on documents;
drop policy if exists "authenticated_all_team_members" on team_members;
drop policy if exists "authenticated_all_tasks" on tasks;
drop policy if exists "authenticated_all_schedule_tasks" on schedule_tasks;

create policy "authenticated_all_projects" on projects for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_all_checklist_items" on checklist_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_all_milestones" on milestones for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_all_activity_log" on activity_log for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_all_documents" on documents for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_all_team_members" on team_members for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_all_tasks" on tasks for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_all_schedule_tasks" on schedule_tasks for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
