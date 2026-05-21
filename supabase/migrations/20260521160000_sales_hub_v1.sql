-- DevMan Sales Hub V1: isolated sales-control module.
-- This intentionally uses sales_* tables so Sales Hub remains separate from DevMan project delivery data.

create table if not exists public.sales_projects (
  id text primary key,
  name text not null default '',
  location text default '',
  description text default '',
  product text default '',
  total_units integer default 0,
  available_units integer default 0,
  reserved_units integer default 0,
  sold_units integer default 0,
  presales_required integer default 0,
  presales_achieved integer default 0,
  target_launch_date text default '',
  status text default 'Active',
  default_brochure_link text default '',
  default_plans_link text default '',
  default_drive_folder_link text default '',
  default_price_list_link text default '',
  default_rental_appraisal_link text default '',
  default_valuation_summary_link text default '',
  default_spa_instructions_link text default '',
  default_assignee text default 'Tim',
  project_notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.sales_leads (
  id text primary key,
  first_name text default '',
  last_name text default '',
  full_name text default '',
  email text default '',
  phone text default '',
  source text default 'Other',
  project_interest text default '',
  buyer_type text default 'Unknown',
  finance_status text default 'Unknown',
  assigned_to text default 'Unassigned',
  temperature text default 'Warm',
  pipeline_stage text default 'New Inquiry',
  notes text default '',
  preferred_units jsonb default '[]'::jsonb,
  budget_range text default '',
  deposit_capacity text default '',
  has_finance_approval boolean default false,
  needs_broker_intro boolean default false,
  last_contacted_at timestamptz,
  next_action_date text default '',
  next_action text default '',
  tags jsonb default '[]'::jsonb,
  lost_reason text default '',
  probability integer default 10,
  documents_sent jsonb default '{}'::jsonb,
  archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.sales_units (
  id text primary key,
  project_id text references public.sales_projects(id) on delete cascade,
  project_name text default '',
  unit_number text default '',
  typology text default '',
  bedrooms integer,
  bathrooms numeric,
  carparks integer,
  floor_area numeric,
  price integer,
  rental_appraisal text default '',
  gross_yield numeric,
  status text default 'Available',
  assigned_lead_id text references public.sales_leads(id) on delete set null,
  assigned_buyer_name text default '',
  deposit_status text default 'Not requested',
  spa_status text default 'Not started',
  conditions_status text default 'None',
  settlement_status text default 'Not applicable',
  reservation_expiry_date text default '',
  notes text default '',
  plan_link text default '',
  brochure_link text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.sales_tasks (
  id text primary key,
  title text not null default '',
  description text default '',
  related_lead_id text references public.sales_leads(id) on delete cascade,
  related_project_id text references public.sales_projects(id) on delete cascade,
  related_unit_id text references public.sales_units(id) on delete cascade,
  assigned_to text default 'Unassigned',
  due_date text default '',
  priority text default 'Medium',
  status text default 'Open',
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.sales_email_templates (
  id text primary key,
  name text not null default '',
  project text default '',
  buyer_type text default '',
  subject text default '',
  body text default '',
  category text default 'Follow-up',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.sales_activities (
  id text primary key,
  lead_id text references public.sales_leads(id) on delete cascade,
  type text default 'Note',
  title text default '',
  description text default '',
  created_by text default '',
  created_at timestamptz default now()
);

create table if not exists public.sales_settings (
  id text primary key,
  payload jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

create index if not exists idx_sales_leads_stage on public.sales_leads(pipeline_stage);
create index if not exists idx_sales_leads_project_interest on public.sales_leads(project_interest);
create index if not exists idx_sales_units_project on public.sales_units(project_id);
create index if not exists idx_sales_units_status on public.sales_units(status);
create index if not exists idx_sales_tasks_due_date on public.sales_tasks(due_date);
create index if not exists idx_sales_activities_lead on public.sales_activities(lead_id);

alter table public.sales_projects enable row level security;
alter table public.sales_leads enable row level security;
alter table public.sales_units enable row level security;
alter table public.sales_tasks enable row level security;
alter table public.sales_email_templates enable row level security;
alter table public.sales_activities enable row level security;
alter table public.sales_settings enable row level security;

drop policy if exists sales_projects_internal on public.sales_projects;
drop policy if exists sales_leads_internal on public.sales_leads;
drop policy if exists sales_units_internal on public.sales_units;
drop policy if exists sales_tasks_internal on public.sales_tasks;
drop policy if exists sales_email_templates_internal on public.sales_email_templates;
drop policy if exists sales_activities_internal on public.sales_activities;
drop policy if exists sales_settings_internal on public.sales_settings;

create policy sales_projects_internal on public.sales_projects for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy sales_leads_internal on public.sales_leads for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy sales_units_internal on public.sales_units for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy sales_tasks_internal on public.sales_tasks for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy sales_email_templates_internal on public.sales_email_templates for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy sales_activities_internal on public.sales_activities for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy sales_settings_internal on public.sales_settings for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into public.sales_projects (id, name, location, description, product, total_units, available_units, reserved_units, sold_units, presales_required, presales_achieved, target_launch_date, status, project_notes, default_assignee)
values
  ('beachwaters', 'Beachwaters', 'Papamoa', 'Current sales focus for Archispace presales.', '1 and 2 bedroom units from $515k', 15, 13, 1, 0, 5, 0, '2026-06-15', 'Active', 'Key focus is securing presales for construction/funding.', 'Tim'),
  ('drift', 'Drift', 'Papamoa', 'First-home buyer and investor townhouse product.', '2 bedroom townhouses', 7, 4, 1, 2, 0, 2, '2026-05-30', 'Active', 'Sales focus is 5 remaining units.', 'Tim'),
  ('longstead', 'Longstead', 'Papamoa / Bay of Plenty', 'Coming soon future sales pipeline.', '2 bedroom units', 7, 7, 0, 0, 0, 0, '2026-08-01', 'Coming Soon', 'Coming soon / future pipeline.', 'Tim')
on conflict (id) do update set
  name = excluded.name,
  location = excluded.location,
  description = excluded.description,
  product = excluded.product,
  total_units = excluded.total_units,
  presales_required = excluded.presales_required,
  target_launch_date = excluded.target_launch_date,
  status = excluded.status,
  project_notes = excluded.project_notes,
  updated_at = now();

insert into public.sales_leads (id, first_name, last_name, full_name, email, phone, source, project_interest, buyer_type, finance_status, assigned_to, temperature, pipeline_stage, notes, preferred_units, budget_range, deposit_capacity, has_finance_approval, needs_broker_intro, last_contacted_at, next_action_date, next_action, tags, lost_reason, probability, documents_sent)
values
  ('lead-michelle-rees', 'Michelle', 'Rees', 'Michelle Rees', 'michelle.rees@example.com', '021 555 0101', 'Meta', 'Beachwaters', 'Family buyer', 'Pre-approval pending', 'Tim', 'Hot', 'Info Sent', 'Interested in buying for 4 kids, requested all documents.', '["Unit 3","Unit 5"]'::jsonb, '$515k-$700k', '$80k', false, false, '2026-05-20T09:00:00+12:00', '2026-05-21', 'Follow up with family feedback', '["family","documents-requested"]'::jsonb, '', 72, '{"brochure":true,"plans":true,"priceList":true,"rentalAppraisal":true}'::jsonb),
  ('lead-nadya-billows', 'Nadya', 'Billows', 'Nadya Billows', 'nadya.billows@example.com', '027 555 0102', 'Website', 'Drift and Beachwaters', 'Investor', 'Unknown', 'Tim', 'Hot', 'Qualified', 'Looking for investment that pays for itself.', '["Drift Unit 2","Beachwaters Unit 1"]'::jsonb, '$650k-$800k', '$120k', false, true, '2026-05-19T15:00:00+12:00', '2026-05-21', 'Send Beachwaters info and discuss options', '["investor","broker"]'::jsonb, '', 68, '{"brochure":true,"plans":false,"priceList":true}'::jsonb),
  ('lead-tasman', 'Tasman', '', 'Tasman', 'tasman@example.com', '022 555 0103', 'Trade Me', 'Beachwaters', 'First-home buyer', 'Pre-approval pending', 'Dave', 'Warm', 'Info Sent', 'Needs to confirm finance approval and preferred unit.', '["Unit 1"]'::jsonb, '$500k-$600k', '$50k', false, false, '2026-05-17T12:00:00+12:00', '2026-05-22', 'Confirm finance approval and preferred unit', '["first-home"]'::jsonb, '', 45, '{"brochure":true,"plans":true}'::jsonb),
  ('lead-meta-1', 'James', 'Morgan', 'James Morgan', 'james.morgan@example.com', '021 555 0104', 'Meta', 'Beachwaters', 'Investor', 'Needs broker', 'Tim', 'Warm', 'New Inquiry', 'Asked for pricing on one bedroom units.', '["Unit 1"]'::jsonb, '$500k-$550k', '', false, true, null, '2026-05-21', 'Call or send first response', '["pricing"]'::jsonb, '', 35, '{}'::jsonb),
  ('lead-trademe-1', 'Aroha', 'King', 'Aroha King', 'aroha.king@example.com', '021 555 0105', 'Trade Me', 'Drift', 'First-home buyer', 'Not started', 'Dave', 'Cold', 'Contacted', 'Requested basic details but has not replied.', '["Drift Unit 5"]'::jsonb, '$700k-$760k', '', false, false, '2026-05-12T10:00:00+12:00', '2026-05-20', 'Send follow-up', '["first-home"]'::jsonb, '', 20, '{"brochure":true}'::jsonb),
  ('lead-website-1', 'Sam', 'Patel', 'Sam Patel', 'sam.patel@example.com', '027 555 0106', 'Website', 'Longstead', 'Investor', 'Cash buyer', 'Tim', 'Hot', 'New Inquiry', 'Wants early information on Longstead and may buy multiple units.', '["Longstead Unit 1","Longstead Unit 2"]'::jsonb, '$700k-$1m', '$300k+', true, false, '2026-05-21T08:00:00+12:00', '2026-05-21', 'Call today and discuss future pipeline', '["cash","multiple-units"]'::jsonb, '', 78, '{}'::jsonb)
on conflict (id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  phone = excluded.phone,
  source = excluded.source,
  project_interest = excluded.project_interest,
  buyer_type = excluded.buyer_type,
  finance_status = excluded.finance_status,
  assigned_to = excluded.assigned_to,
  temperature = excluded.temperature,
  pipeline_stage = excluded.pipeline_stage,
  notes = excluded.notes,
  next_action_date = excluded.next_action_date,
  next_action = excluded.next_action,
  probability = excluded.probability,
  updated_at = now();

insert into public.sales_units (id, project_id, project_name, unit_number, typology, bedrooms, bathrooms, carparks, floor_area, price, rental_appraisal, gross_yield, status, assigned_lead_id, assigned_buyer_name, deposit_status, spa_status, conditions_status, settlement_status, reservation_expiry_date, notes)
values
  ('bw-u01', 'beachwaters', 'Beachwaters', 'Unit 1', '1-bed apartment', 1, 1, 1, 52, 515000, '$545-$600/wk', 5.7, 'Available', null, '', 'Not requested', 'Not started', 'None', 'Not applicable', '', ''),
  ('bw-u02', 'beachwaters', 'Beachwaters', 'Unit 2', '1-bed apartment', 1, 1, 1, 54, 525000, '$545-$600/wk', 5.6, 'Available', null, '', 'Not requested', 'Not started', 'None', 'Not applicable', '', ''),
  ('bw-u03', 'beachwaters', 'Beachwaters', 'Unit 3', '2-bed apartment', 2, 1, 1, 68, 635000, '$620-$690/wk', 5.4, 'Available', null, '', 'Not requested', 'Not started', 'None', 'Not applicable', '', ''),
  ('bw-u04', 'beachwaters', 'Beachwaters', 'Unit 4', '2-bed apartment', 2, 1, 1, 70, 645000, '$620-$690/wk', 5.3, 'Reserved', 'lead-michelle-rees', 'Michelle Rees', 'Requested', 'Details requested', 'Finance pending', 'Not applicable', '2026-05-26', 'Reservation held pending family feedback.'),
  ('bw-u05', 'beachwaters', 'Beachwaters', 'Unit 5', '2-bed apartment', 2, 1, 1, 72, 655000, '$640-$700/wk', 5.4, 'S&P Out', null, '', 'Not requested', 'Sent', 'Finance pending', 'Not applicable', '', ''),
  ('bw-u06', 'beachwaters', 'Beachwaters', 'Unit 6', '1-bed apartment', 1, 1, 1, 51, 515000, '$545-$600/wk', 5.7, 'Available', null, '', 'Not requested', 'Not started', 'None', 'Not applicable', '', ''),
  ('bw-u07', 'beachwaters', 'Beachwaters', 'Unit 7', '1-bed apartment', 1, 1, 1, 53, 525000, '$545-$600/wk', 5.6, 'Available', null, '', 'Not requested', 'Not started', 'None', 'Not applicable', '', ''),
  ('bw-u08', 'beachwaters', 'Beachwaters', 'Unit 8', '2-bed apartment', 2, 1, 1, 69, 635000, '$620-$690/wk', 5.4, 'Available', null, '', 'Not requested', 'Not started', 'None', 'Not applicable', '', ''),
  ('bw-u09', 'beachwaters', 'Beachwaters', 'Unit 9', '2-bed apartment', 2, 1, 1, 70, 645000, '$620-$690/wk', 5.3, 'Available', null, '', 'Not requested', 'Not started', 'None', 'Not applicable', '', ''),
  ('bw-u10', 'beachwaters', 'Beachwaters', 'Unit 10', '2-bed apartment', 2, 1, 1, 72, 655000, '$640-$700/wk', 5.4, 'Available', null, '', 'Not requested', 'Not started', 'None', 'Not applicable', '', ''),
  ('bw-u11', 'beachwaters', 'Beachwaters', 'Unit 11', '1-bed apartment', 1, 1, 1, 52, 520000, '$545-$600/wk', 5.6, 'Available', null, '', 'Not requested', 'Not started', 'None', 'Not applicable', '', ''),
  ('bw-u12', 'beachwaters', 'Beachwaters', 'Unit 12', '1-bed apartment', 1, 1, 1, 55, 535000, '$550-$610/wk', 5.5, 'Available', null, '', 'Not requested', 'Not started', 'None', 'Not applicable', '', ''),
  ('bw-u13', 'beachwaters', 'Beachwaters', 'Unit 13', '2-bed apartment', 2, 1, 1, 72, 665000, '$650-$710/wk', 5.3, 'Available', null, '', 'Not requested', 'Not started', 'None', 'Not applicable', '', ''),
  ('bw-u14', 'beachwaters', 'Beachwaters', 'Unit 14', '2-bed apartment', 2, 1, 1, 74, 675000, '$650-$720/wk', 5.3, 'Available', null, '', 'Not requested', 'Not started', 'None', 'Not applicable', '', ''),
  ('bw-u15', 'beachwaters', 'Beachwaters', 'Unit 15', '2-bed apartment', 2, 1, 1, 75, 685000, '$660-$730/wk', 5.3, 'Available', null, '', 'Not requested', 'Not started', 'None', 'Not applicable', '', ''),
  ('dr-u01', 'drift', 'Drift', 'Unit 1', '2-bed townhouse', 2, 1.5, 1, 82, 735000, '$650-$720/wk', 4.9, 'Settled', null, 'Sold buyer', 'Paid', 'Signed', 'Satisfied', 'Settled', '', ''),
  ('dr-u02', 'drift', 'Drift', 'Unit 2', '2-bed townhouse', 2, 1.5, 1, 82, 735000, '$650-$720/wk', 4.9, 'Available', null, '', 'Not requested', 'Not started', 'None', 'Not applicable', '', ''),
  ('dr-u03', 'drift', 'Drift', 'Unit 3', '2-bed townhouse', 2, 1.5, 1, 84, 745000, '$660-$730/wk', 4.9, 'Available', null, '', 'Not requested', 'Not started', 'None', 'Not applicable', '', ''),
  ('dr-u04', 'drift', 'Drift', 'Unit 4', '2-bed townhouse', 2, 1.5, 1, 84, 745000, '$660-$730/wk', 4.9, 'Reserved', 'lead-nadya-billows', 'Nadya Billows', 'Requested', 'Details requested', 'Finance pending', 'Not applicable', '2026-05-25', ''),
  ('dr-u05', 'drift', 'Drift', 'Unit 5', '2-bed townhouse', 2, 1.5, 1, 86, 755000, '$670-$740/wk', 4.9, 'Available', null, '', 'Not requested', 'Not started', 'None', 'Not applicable', '', ''),
  ('dr-u06', 'drift', 'Drift', 'Unit 6', '2-bed townhouse', 2, 1.5, 1, 86, 755000, '$670-$740/wk', 4.9, 'Settled', null, 'Sold buyer', 'Paid', 'Signed', 'Satisfied', 'Settled', '', ''),
  ('dr-u07', 'drift', 'Drift', 'Unit 7', '2-bed townhouse', 2, 1.5, 1, 88, 765000, '$680-$750/wk', 4.9, 'Available', null, '', 'Not requested', 'Not started', 'None', 'Not applicable', '', ''),
  ('ls-u01', 'longstead', 'Longstead', 'Unit 1', '2-bed unit', 2, 1, 1, 70, null, '', null, 'Available', null, '', 'Not requested', 'Not started', 'None', 'Not applicable', '', 'Coming soon.'),
  ('ls-u02', 'longstead', 'Longstead', 'Unit 2', '2-bed unit', 2, 1, 1, 70, null, '', null, 'Available', null, '', 'Not requested', 'Not started', 'None', 'Not applicable', '', 'Coming soon.'),
  ('ls-u03', 'longstead', 'Longstead', 'Unit 3', '2-bed unit', 2, 1, 1, 72, null, '', null, 'Available', null, '', 'Not requested', 'Not started', 'None', 'Not applicable', '', 'Coming soon.'),
  ('ls-u04', 'longstead', 'Longstead', 'Unit 4', '2-bed unit', 2, 1, 1, 72, null, '', null, 'Available', null, '', 'Not requested', 'Not started', 'None', 'Not applicable', '', 'Coming soon.'),
  ('ls-u05', 'longstead', 'Longstead', 'Unit 5', '2-bed unit', 2, 1, 1, 74, null, '', null, 'Available', null, '', 'Not requested', 'Not started', 'None', 'Not applicable', '', 'Coming soon.'),
  ('ls-u06', 'longstead', 'Longstead', 'Unit 6', '2-bed unit', 2, 1, 1, 74, null, '', null, 'Available', null, '', 'Not requested', 'Not started', 'None', 'Not applicable', '', 'Coming soon.'),
  ('ls-u07', 'longstead', 'Longstead', 'Unit 7', '2-bed unit', 2, 1, 1, 76, null, '', null, 'Available', null, '', 'Not requested', 'Not started', 'None', 'Not applicable', '', 'Coming soon.')
on conflict (id) do update set
  status = excluded.status,
  assigned_lead_id = excluded.assigned_lead_id,
  assigned_buyer_name = excluded.assigned_buyer_name,
  deposit_status = excluded.deposit_status,
  spa_status = excluded.spa_status,
  conditions_status = excluded.conditions_status,
  settlement_status = excluded.settlement_status,
  reservation_expiry_date = excluded.reservation_expiry_date,
  updated_at = now();

insert into public.sales_tasks (id, title, description, related_lead_id, related_project_id, related_unit_id, assigned_to, due_date, priority, status)
values
  ('stask-001', 'Call Michelle for family feedback', 'Confirm whether Beachwaters Unit 4 works for her family.', 'lead-michelle-rees', 'beachwaters', 'bw-u04', 'Tim', '2026-05-21', 'High', 'Open'),
  ('stask-002', 'Send Beachwaters investment pack to Nadya', 'Include rent appraisal and presale position.', 'lead-nadya-billows', 'beachwaters', null, 'Tim', '2026-05-21', 'High', 'Open'),
  ('stask-003', 'Follow up Aroha after Drift info pack', 'No reply since initial contact.', 'lead-trademe-1', 'drift', 'dr-u05', 'Dave', '2026-05-20', 'Medium', 'Open'),
  ('stask-004', 'Prepare Beachwaters presale call list', 'Focus on hot leads and S&P out units.', null, 'beachwaters', null, 'Tim', '2026-05-22', 'Medium', 'Open')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  due_date = excluded.due_date,
  priority = excluded.priority,
  status = excluded.status,
  updated_at = now();

insert into public.sales_email_templates (id, name, project, buyer_type, subject, body, category)
values
  ('tpl-bw-first-response', 'Beachwaters first response', 'Beachwaters', '', 'Beachwaters information', 'Hi {{leadName}},\n\nThanks for your interest in Beachwaters. The project has 1 and 2 bedroom units from $515k in Papamoa.\n\nI can send through the brochure, plans and current pricing, then we can talk through which unit suits you best.\n\nRegards,\n{{assignedTo}}\n{{assignedPhone}}', 'First response'),
  ('tpl-bw-plans-brochure', 'Beachwaters plans and brochure', 'Beachwaters', '', 'Beachwaters plans and brochure', 'Hi {{leadName}},\n\nHere are the Beachwaters details:\nBrochure: {{brochureLink}}\nPlans: {{plansLink}}\n\nIf you want, I can talk you through the best available units and the current presale position.\n\n{{assignedTo}}', 'Plans and brochure'),
  ('tpl-bw-investor-follow-up', 'Beachwaters investor follow-up', 'Beachwaters', 'Investor', 'Beachwaters investment follow-up', 'Hi {{leadName}},\n\nFollowing up on Beachwaters. Based on the pricing and rental appraisal, this could suit an investment buyer looking at Papamoa growth and new-build product.\n\nThe next step is confirming budget/finance and narrowing down a preferred unit.\n\n{{assignedTo}}', 'Investor follow-up'),
  ('tpl-drift-first-response', 'Drift first response', 'Drift', '', 'Drift townhouses information', 'Hi {{leadName}},\n\nThanks for your interest in Drift. Drift has 2 bedroom townhouses in Papamoa, with a limited number still available.\n\nI can send through plans, pricing and availability so we can work out the best fit.\n\n{{assignedTo}}', 'First response'),
  ('tpl-drift-plans-brochure', 'Drift plans and brochure', 'Drift', '', 'Drift plans and brochure', 'Hi {{leadName}},\n\nHere are the Drift details:\nBrochure: {{brochureLink}}\nPlans: {{plansLink}}\n\nCurrent unit interest: {{unitNumber}}\n\n{{assignedTo}}', 'Plans and brochure'),
  ('tpl-drift-investor-follow-up', 'Drift investor follow-up', 'Drift', 'Investor', 'Drift investment follow-up', 'Hi {{leadName}},\n\nJust checking in on Drift. The remaining 2 bedroom townhouses may suit an investor or first-home buyer depending on finance.\n\nWould you like me to run through the available options?\n\n{{assignedTo}}', 'Investor follow-up'),
  ('tpl-finance-broker', 'Finance approval / broker intro', '', '', 'Finance approval next step', 'Hi {{leadName}},\n\nThe next step is confirming finance. If helpful, I can introduce you to a broker who understands new-build purchases and presale contracts.\n\nOnce finance is clear, we can move faster on {{projectName}} {{unitNumber}}.\n\n{{assignedTo}}', 'Finance / broker'),
  ('tpl-unit-reservation', 'Unit reservation next steps', '', '', 'Reservation next steps for {{unitNumber}}', 'Hi {{leadName}},\n\nTo hold {{projectName}} {{unitNumber}}, the next step is confirming reservation details and timing.\n\nPrice: {{price}}\nDeposit guide: {{depositAmount}}\n\n{{assignedTo}}', 'Unit reservation'),
  ('tpl-spa-next-steps', 'S&P next steps', '', '', 'S&P next steps', 'Hi {{leadName}},\n\nThe S&P next step is to confirm buyer details, solicitor details and any conditions required.\n\nOnce ready, we can get the agreement issued for {{projectName}} {{unitNumber}}.\n\n{{assignedTo}}', 'S&P next steps'),
  ('tpl-info-follow-up', 'Follow-up after info sent', '', '', 'Checking in', 'Hi {{leadName}},\n\nJust checking in after sending the information for {{projectName}}.\n\nDo you have any questions, or would you like to talk through available units?\n\n{{assignedTo}}', 'Follow-up')
on conflict (id) do update set
  subject = excluded.subject,
  body = excluded.body,
  category = excluded.category,
  updated_at = now();

insert into public.sales_activities (id, lead_id, type, title, description, created_by, created_at)
values
  ('sact-001', 'lead-michelle-rees', 'Document Sent', 'Beachwaters documents sent', 'Brochure, plans, price list and rental appraisal sent.', 'Tim', '2026-05-20T09:05:00+12:00'),
  ('sact-002', 'lead-nadya-billows', 'Call', 'Investor discussion', 'Discussed investment goals and comparing Drift vs Beachwaters.', 'Tim', '2026-05-19T15:10:00+12:00'),
  ('sact-003', 'lead-tasman', 'Email', 'Info pack sent', 'Sent Beachwaters brochure and plans.', 'Dave', '2026-05-17T12:15:00+12:00'),
  ('sact-004', 'lead-meta-1', 'Note', 'Meta enquiry received', 'Asked for pricing on one bedroom Beachwaters units.', 'Sales Hub', '2026-05-21T08:30:00+12:00')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description;

insert into public.sales_settings (id, payload)
values (
  'default',
  '{
    "salesTeamMembers":["Tim","Dave","Agent","Unassigned"],
    "defaultSenderName":"Tim Haldane",
    "timPhone":"",
    "davePhone":"",
    "gmailSearchUrl":"https://mail.google.com/mail/u/0/#search/{email}",
    "googleSheets":{
      "leadsSheetUrl":"",
      "unitsSheetUrl":"",
      "salesSheetUrl":"",
      "invoicesSheetUrl":"",
      "lastSyncedAt":"",
      "syncStatus":"Not connected yet"
    }
  }'::jsonb
)
on conflict (id) do nothing;

do $$
begin
  alter publication supabase_realtime add table public.sales_projects;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.sales_leads;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.sales_units;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.sales_tasks;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.sales_email_templates;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.sales_activities;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
