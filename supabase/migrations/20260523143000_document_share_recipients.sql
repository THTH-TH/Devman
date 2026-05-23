-- Add recipient metadata for direct document sharing workflows.

alter table public.document_shares
  add column if not exists subject text default '',
  add column if not exists message text default '',
  add column if not exists delivery_method text default 'link',
  add column if not exists recipients jsonb default '[]'::jsonb,
  add column if not exists recipient_groups jsonb default '[]'::jsonb;

notify pgrst, 'reload schema';
