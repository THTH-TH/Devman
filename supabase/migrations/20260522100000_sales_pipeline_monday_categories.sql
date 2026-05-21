-- Align Sales Hub pipeline stages with the simplified HubSpot/Monday-style board.
update public.sales_leads
set
  pipeline_stage = case
    when pipeline_stage in ('New Inquiry') then 'New Enquiry'
    when pipeline_stage in ('Contacted', 'Info Sent', 'Qualified', 'Finance / Broker') then 'Qualified / Needs Assessed'
    when pipeline_stage in ('Sales Meeting Booked') then 'Sales Meeting Booked'
    when pipeline_stage in ('Unit Selected', 'S&P Sent', 'Offer / S&P Sent') then 'Negotiations & Offer'
    when pipeline_stage in ('Signed', 'Deposit Paid') then 'Under Contract - Conditional'
    when pipeline_stage in ('Unconditional', 'Settled', 'Settled / Complete') then 'Sold - Unconditional'
    when pipeline_stage in ('Lost / Not Now') then 'Closed Lost / Not Proceeding'
    else pipeline_stage
  end,
  updated_at = now()
where pipeline_stage in (
  'New Inquiry',
  'Contacted',
  'Info Sent',
  'Qualified',
  'Finance / Broker',
  'Sales Meeting Booked',
  'Unit Selected',
  'S&P Sent',
  'Offer / S&P Sent',
  'Signed',
  'Deposit Paid',
  'Unconditional',
  'Settled',
  'Settled / Complete',
  'Lost / Not Now'
);
