-- DevMan V3: company-usable project hub additions.
-- Run this in Supabase SQL Editor after the V1/V2 migrations.

alter table public.projects
  add column if not exists property_profile_id text default '';

alter table public.schedule_tasks
  add column if not exists project_contact_id text default '';

alter table public.documents
  add column if not exists revision text default '',
  add column if not exists drawing_number text default '',
  add column if not exists discipline text default '',
  add column if not exists issued_for text default '',
  add column if not exists document_status text default 'current';

create table if not exists public.property_profiles (
  id text primary key,
  project_id text references public.projects(id) on delete cascade,
  address text default '',
  formatted_address text default '',
  place_id text default '',
  latitude double precision,
  longitude double precision,
  suburb text default '',
  city text default '',
  region text default '',
  postal_code text default '',
  country text default 'New Zealand',
  source_status jsonb default '{}'::jsonb,
  title_summary jsonb default '{}'::jsonb,
  parcel_summary jsonb default '{}'::jsonb,
  council_summary jsonb default '{}'::jsonb,
  zoning_summary jsonb default '{}'::jsonb,
  hazard_summary jsonb default '{}'::jsonb,
  services_summary jsonb default '{}'::jsonb,
  valuation_summary jsonb default '{}'::jsonb,
  demographics_summary jsonb default '{}'::jsonb,
  map_links jsonb default '{}'::jsonb,
  raw_payload jsonb default '{}'::jsonb,
  last_refreshed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.property_layers (
  id text primary key,
  project_id text references public.projects(id) on delete cascade,
  profile_id text references public.property_profiles(id) on delete cascade,
  layer_type text default '',
  name text default '',
  source text default '',
  source_url text default '',
  confidence text default 'not available',
  geometry jsonb,
  attributes jsonb default '{}'::jsonb,
  captured_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists public.property_source_runs (
  id text primary key,
  project_id text references public.projects(id) on delete cascade,
  profile_id text references public.property_profiles(id) on delete cascade,
  source text default '',
  status text default 'not available',
  message text default '',
  request jsonb default '{}'::jsonb,
  response jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.document_shares (
  id text primary key,
  token text unique not null,
  project_id text references public.projects(id) on delete cascade,
  document_ids jsonb default '[]'::jsonb,
  document_snapshot jsonb default '[]'::jsonb,
  title text default '',
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by text default '',
  access_count integer default 0,
  last_accessed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.ai_action_drafts (
  id text primary key,
  project_id text references public.projects(id) on delete cascade,
  action_type text default '',
  title text default '',
  rationale text default '',
  payload jsonb default '{}'::jsonb,
  status text default 'pending',
  created_by text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  applied_at timestamptz,
  dismissed_at timestamptz
);

create index if not exists idx_property_profiles_project on public.property_profiles(project_id);
create index if not exists idx_property_layers_project on public.property_layers(project_id);
create index if not exists idx_property_source_runs_project on public.property_source_runs(project_id);
create index if not exists idx_document_shares_token on public.document_shares(token);
create index if not exists idx_document_shares_project on public.document_shares(project_id);
create index if not exists idx_ai_action_drafts_project on public.ai_action_drafts(project_id);

alter table public.property_profiles enable row level security;
alter table public.property_layers enable row level security;
alter table public.property_source_runs enable row level security;
alter table public.document_shares enable row level security;
alter table public.ai_action_drafts enable row level security;

drop policy if exists property_profiles_internal on public.property_profiles;
create policy property_profiles_internal on public.property_profiles
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists property_layers_internal on public.property_layers;
create policy property_layers_internal on public.property_layers
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists property_source_runs_internal on public.property_source_runs;
create policy property_source_runs_internal on public.property_source_runs
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists document_shares_internal on public.document_shares;
create policy document_shares_internal on public.document_shares
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists document_shares_public_active on public.document_shares;
create policy document_shares_public_active on public.document_shares
  for select using (revoked_at is null and (expires_at is null or expires_at > now()));

drop policy if exists ai_action_drafts_internal on public.ai_action_drafts;
create policy ai_action_drafts_internal on public.ai_action_drafts
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

do $$
begin
  alter publication supabase_realtime add table public.property_profiles;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.property_layers;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.property_source_runs;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.document_shares;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.ai_action_drafts;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
