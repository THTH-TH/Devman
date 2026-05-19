alter table documents
  add column if not exists drive_file_id text default '',
  add column if not exists drive_url text default '',
  add column if not exists source text default 'manual_link',
  add column if not exists gmail_message_id text default '',
  add column if not exists gmail_thread_id text default '';

create index if not exists idx_documents_source on documents(source);
create index if not exists idx_documents_drive_file_id on documents(drive_file_id) where drive_file_id <> '';
