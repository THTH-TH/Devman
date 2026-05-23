alter table public.documents
  add column if not exists folder_path text default '';

create table if not exists public.document_folders (
  id text primary key,
  project_id text default '',
  name text not null,
  path text not null,
  parent_path text default '',
  created_by text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists idx_document_folders_project_path
  on public.document_folders (coalesce(project_id, ''), path);

create index if not exists idx_documents_folder_path
  on public.documents (folder_path);

alter table public.document_folders enable row level security;

drop policy if exists "document_folders_select_authenticated" on public.document_folders;
drop policy if exists "document_folders_insert_authenticated" on public.document_folders;
drop policy if exists "document_folders_update_authenticated" on public.document_folders;
drop policy if exists "document_folders_delete_authenticated" on public.document_folders;

create policy "document_folders_select_authenticated"
on public.document_folders for select
using (auth.role() = 'authenticated');

create policy "document_folders_insert_authenticated"
on public.document_folders for insert
with check (auth.role() = 'authenticated');

create policy "document_folders_update_authenticated"
on public.document_folders for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "document_folders_delete_authenticated"
on public.document_folders for delete
using (auth.role() = 'authenticated');
