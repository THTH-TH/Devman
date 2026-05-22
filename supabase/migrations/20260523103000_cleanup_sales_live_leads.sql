-- Sales Hub is now live: remove seeded demo leads and clean bad sheet-import names.

update public.sales_units
set
  assigned_lead_id = null,
  assigned_buyer_name = '',
  updated_at = now()
where assigned_lead_id in (
  'lead-michelle-rees',
  'lead-nadya-billows',
  'lead-tasman',
  'lead-meta-1'
)
or assigned_buyer_name in ('Michelle Rees', 'Nadya Billows', 'Tasman');

delete from public.sales_leads
where id in (
  'lead-michelle-rees',
  'lead-nadya-billows',
  'lead-tasman',
  'lead-meta-1'
)
or email ilike '%@example.com'
or (
  full_name ilike 'Sheet row %'
  and coalesce(email, '') = ''
  and coalesce(phone, '') = ''
);

update public.sales_leads
set
  full_name = '',
  first_name = '',
  last_name = '',
  updated_at = now()
where full_name ilike 'Sheet row %'
or lower(full_name) = lower(email);
