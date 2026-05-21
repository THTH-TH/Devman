-- Preconfigure the live Beachwaters lead sheet supplied by Tim.
-- The sheet still needs to be shared with the DevMan Google service account before syncing.

insert into public.sales_sheet_connections (
  id,
  name,
  spreadsheet_id,
  spreadsheet_url,
  sheet_name,
  range_a1,
  project_hint,
  source_hint,
  active,
  last_sync_status,
  last_sync_message
) values (
  'sheet-beachwaters-leads',
  'Beachwaters leads',
  '1FhDdh9q5tLMVlTT0KPXxPF3YKy6HMSEyO9TZrsxFlIE',
  'https://docs.google.com/spreadsheets/d/1FhDdh9q5tLMVlTT0KPXxPF3YKy6HMSEyO9TZrsxFlIE/edit?gid=0#gid=0',
  '',
  '',
  'Beachwaters',
  'Website',
  true,
  'Ready',
  'Connection saved. Share the sheet with the DevMan service account, then run Sync now.'
)
on conflict (id) do update set
  name = excluded.name,
  spreadsheet_id = excluded.spreadsheet_id,
  spreadsheet_url = excluded.spreadsheet_url,
  project_hint = excluded.project_hint,
  source_hint = excluded.source_hint,
  active = excluded.active,
  updated_at = now();

insert into public.sales_sheet_mappings (
  id,
  connection_id,
  header_row,
  field_map,
  defaults
) values (
  'map-beachwaters-leads',
  'sheet-beachwaters-leads',
  1,
  '{
    "createdAt": "Date",
    "fullName": "Name",
    "phone": "Phone Number",
    "projectInterest": "Radio",
    "email": "Email",
    "buyerType": "Notes",
    "preferredUnits": "Buyer type",
    "message": "Call notes",
    "nextAction": "Suggested next step",
    "temperature": "Lead temperature"
  }'::jsonb,
  '{
    "assignedTo": "Tim",
    "buyerType": "Unknown",
    "financeStatus": "Unknown",
    "temperature": "Warm"
  }'::jsonb
)
on conflict (connection_id) do update set
  field_map = excluded.field_map,
  defaults = excluded.defaults,
  updated_at = now();
