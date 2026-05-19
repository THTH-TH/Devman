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
