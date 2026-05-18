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

alter table google_workspace_connections enable row level security;

alter table documents
  add column if not exists gmail_message_id text default '',
  add column if not exists gmail_thread_id text default '';

create index if not exists idx_documents_gmail_message_id on documents(gmail_message_id) where gmail_message_id <> '';
