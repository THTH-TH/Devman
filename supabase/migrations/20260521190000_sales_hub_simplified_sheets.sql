-- DevMan Sales Hub simplification + Google Sheets read-sync metadata.
-- Sales data remains isolated in sales_* tables.

create extension if not exists pgcrypto;

update public.sales_leads
set pipeline_stage = 'S&P Sent'
where pipeline_stage = 'Offer / S&P Sent';

update public.sales_leads
set pipeline_stage = 'Settled'
where pipeline_stage = 'Settled / Complete';

update public.sales_leads
set pipeline_stage = 'Qualified'
where pipeline_stage = 'Finance / Broker';

alter table public.sales_leads
  add column if not exists sheet_connection_id text,
  add column if not exists source_row_number integer,
  add column if not exists source_row_key text,
  add column if not exists source_row_hash text,
  add column if not exists source_sheet_name text,
  add column if not exists last_sheet_sync_at timestamptz,
  add column if not exists sync_status text,
  add column if not exists raw_sheet_row jsonb default '{}'::jsonb;

create table if not exists public.sales_sheet_connections (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  spreadsheet_id text not null,
  spreadsheet_url text,
  sheet_name text,
  range_a1 text,
  project_hint text,
  source_hint text,
  active boolean not null default true,
  last_synced_at timestamptz,
  last_sync_status text not null default 'Not synced',
  last_sync_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales_sheet_mappings (
  id text primary key default gen_random_uuid()::text,
  connection_id text not null references public.sales_sheet_connections(id) on delete cascade,
  header_row integer not null default 1,
  field_map jsonb not null default '{}'::jsonb,
  defaults jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(connection_id)
);

create table if not exists public.sales_sync_runs (
  id text primary key default gen_random_uuid()::text,
  connection_id text references public.sales_sheet_connections(id) on delete set null,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_read integer not null default 0,
  rows_created integer not null default 0,
  rows_updated integer not null default 0,
  rows_skipped integer not null default 0,
  errors jsonb not null default '[]'::jsonb
);

create index if not exists idx_sales_leads_source_row_key on public.sales_leads(source_row_key);
create index if not exists idx_sales_leads_sheet_connection on public.sales_leads(sheet_connection_id);
create index if not exists idx_sales_sheet_connections_active on public.sales_sheet_connections(active);
create index if not exists idx_sales_sync_runs_connection on public.sales_sync_runs(connection_id);

alter table public.sales_sheet_connections enable row level security;
alter table public.sales_sheet_mappings enable row level security;
alter table public.sales_sync_runs enable row level security;

drop policy if exists sales_sheet_connections_internal on public.sales_sheet_connections;
drop policy if exists sales_sheet_mappings_internal on public.sales_sheet_mappings;
drop policy if exists sales_sync_runs_internal on public.sales_sync_runs;

create policy sales_sheet_connections_internal on public.sales_sheet_connections
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy sales_sheet_mappings_internal on public.sales_sheet_mappings
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy sales_sync_runs_internal on public.sales_sync_runs
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

do $$
begin
  alter publication supabase_realtime add table public.sales_sheet_connections;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.sales_sync_runs;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
