alter table projects
  add column if not exists bc_number text default '',
  add column if not exists legal_description text default '',
  add column if not exists owner_contact_person text default '',
  add column if not exists owner_mailing_address text default '',
  add column if not exists owner_phone text default '',
  add column if not exists owner_email text default '',
  add column if not exists building_work_description text default '',
  add column if not exists place_id text default '',
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists suburb text default '',
  add column if not exists city text default '',
  add column if not exists region text default '',
  add column if not exists postal_code text default '',
  add column if not exists country text default '',
  add column if not exists property_snapshot jsonb default '{}'::jsonb,
  add column if not exists drive_folder_url text default '',
  add column if not exists drive_root_folder_id text default '';

alter table documents
  add column if not exists drive_file_id text default '',
  add column if not exists drive_url text default '',
  add column if not exists source text default 'manual_link';

create index if not exists idx_projects_place_id on projects(place_id) where place_id <> '';
create index if not exists idx_documents_drive_file_id on documents(drive_file_id) where drive_file_id <> '';
create index if not exists idx_documents_source on documents(source);
