export const SALES_PROJECT_IDS = {
  BEACHWATERS: 'beachwaters',
  DRIFT: 'drift',
  LONGSTEAD: 'longstead',
}

export const LEAD_SOURCES = [
  'Meta',
  'Website',
  'Trade Me',
  'Instagram',
  'Facebook',
  'Email',
  'Phone',
  'Agent',
  'Referral',
  'Walk-in',
  'Existing Contact',
  'Other',
]

export const BUYER_TYPES = [
  'First-home buyer',
  'Investor',
  'Downsizer',
  'Family buyer',
  'CHP / organisation',
  'Agent',
  'Unknown',
]

export const FINANCE_STATUSES = [
  'Unknown',
  'Not started',
  'Needs broker',
  'Broker intro sent',
  'Pre-approval pending',
  'Pre-approved',
  'Cash buyer',
  'Finance condition required',
  'Finance confirmed',
]

export const ASSIGNEES = ['Tim', 'Dave', 'Agent', 'Unassigned']

export const TEMPERATURES = ['Hot', 'Warm', 'Cold', 'Not Now']

export const PIPELINE_NEW_STAGE = 'New Enquiry'
export const PIPELINE_QUALIFIED_STAGE = 'Qualified / Needs Assessed'
export const PIPELINE_MEETING_STAGE = 'Sales Meeting Booked'
export const PIPELINE_OFFER_STAGE = 'Negotiations & Offer'
export const PIPELINE_CONTRACT_STAGE = 'Under Contract - Conditional'
export const PIPELINE_WON_STAGE = 'Sold - Unconditional'
export const PIPELINE_CLOSED_STAGE = 'Closed Lost / Not Proceeding'

export const PIPELINE_STAGES = [
  PIPELINE_NEW_STAGE,
  PIPELINE_QUALIFIED_STAGE,
  PIPELINE_MEETING_STAGE,
  PIPELINE_OFFER_STAGE,
  PIPELINE_CONTRACT_STAGE,
  PIPELINE_WON_STAGE,
  PIPELINE_CLOSED_STAGE,
]

export const PIPELINE_CLOSE_STAGES = [
  PIPELINE_OFFER_STAGE,
  PIPELINE_CONTRACT_STAGE,
  PIPELINE_WON_STAGE,
]

export const PIPELINE_STAGE_COMPATIBILITY = {
  'New Inquiry': PIPELINE_NEW_STAGE,
  Contacted: PIPELINE_QUALIFIED_STAGE,
  'Info Sent': PIPELINE_QUALIFIED_STAGE,
  Qualified: PIPELINE_QUALIFIED_STAGE,
  'Unit Selected': PIPELINE_OFFER_STAGE,
  'S&P Sent': PIPELINE_OFFER_STAGE,
  'Offer / S&P Sent': PIPELINE_OFFER_STAGE,
  Signed: PIPELINE_CONTRACT_STAGE,
  'Deposit Paid': PIPELINE_CONTRACT_STAGE,
  'Finance / Broker': PIPELINE_QUALIFIED_STAGE,
  Unconditional: PIPELINE_WON_STAGE,
  Settled: PIPELINE_WON_STAGE,
  'Settled / Complete': PIPELINE_WON_STAGE,
  'Lost / Not Now': PIPELINE_CLOSED_STAGE,
}

export const UNIT_STATUSES = [
  'Available',
  'Enquiry',
  'Reserved',
  'S&P Out',
  'Under Contract',
  'Deposit Paid',
  'Unconditional',
  'Settled',
  'Hold',
  'Withdrawn',
]

export const DEPOSIT_STATUSES = ['Not requested', 'Requested', 'Pending', 'Paid', 'Refunded']
export const SPA_STATUSES = ['Not started', 'Details requested', 'Drafting', 'Sent', 'Signed', 'Cancelled']
export const CONDITIONS_STATUSES = [
  'None',
  'Finance pending',
  'LIM pending',
  'Solicitor approval pending',
  'Due diligence pending',
  'Satisfied',
  'Failed',
]
export const SETTLEMENT_STATUSES = ['Not applicable', 'Pending', 'Ready', 'Settled']

export const TASK_STATUSES = ['Open', 'In Progress', 'Complete', 'Overdue']
export const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

export const TEMPLATE_CATEGORIES = [
  'First response',
  'Info pack',
  'Plans and brochure',
  'Finance / broker',
  'Follow-up',
  'Unit reservation',
  'S&P next steps',
  'Deposit reminder',
  'Investor follow-up',
  'First-home buyer follow-up',
  'Agent follow-up',
]

export const ACTIVITY_TYPES = [
  'Note',
  'Call',
  'Email',
  'SMS',
  'Meeting',
  'Document Sent',
  'Stage Changed',
  'Unit Assigned',
  'Task Created',
  'Task Completed',
]

export const SALES_NAV = [
  { to: '/sales', label: 'Dashboard', end: true },
  { to: '/sales/projects', label: 'Projects' },
  { to: '/sales/pipeline', label: 'Pipeline' },
  { to: '/sales/leads', label: 'Leads' },
  { to: '/sales/documents', label: 'Documents' },
  { to: '/sales/presales', label: 'Presales' },
  { to: '/sales/sheets', label: 'Sheet Sync' },
]

export const SOLD_UNIT_STATUSES = ['Deposit Paid', 'Unconditional', 'Settled']
export const COMMITTED_UNIT_STATUSES = ['Under Contract', 'Deposit Paid', 'Unconditional', 'Settled']

export const TEMP_COLORS = {
  Hot: 'bg-red-100 text-red-700 border-red-200',
  Warm: 'bg-amber-100 text-amber-700 border-amber-200',
  Cold: 'bg-gray-100 text-gray-600 border-gray-200',
  'Not Now': 'bg-slate-100 text-slate-500 border-slate-200',
}

export const STAGE_COLORS = {
  [PIPELINE_NEW_STAGE]: 'bg-blue-50 text-blue-700',
  [PIPELINE_QUALIFIED_STAGE]: 'bg-sky-50 text-sky-700',
  [PIPELINE_MEETING_STAGE]: 'bg-indigo-50 text-indigo-700',
  [PIPELINE_OFFER_STAGE]: 'bg-amber-50 text-amber-700',
  [PIPELINE_CONTRACT_STAGE]: 'bg-purple-50 text-purple-700',
  [PIPELINE_WON_STAGE]: 'bg-green-50 text-green-700',
  [PIPELINE_CLOSED_STAGE]: 'bg-gray-100 text-gray-500',
}

export const UNIT_STATUS_COLORS = {
  Available: 'bg-gray-100 text-gray-600',
  Enquiry: 'bg-sky-50 text-sky-700',
  Reserved: 'bg-amber-50 text-amber-700',
  'S&P Out': 'bg-pink-50 text-pink-700',
  'Under Contract': 'bg-purple-50 text-purple-700',
  'Deposit Paid': 'bg-green-50 text-green-700',
  Unconditional: 'bg-emerald-50 text-emerald-700',
  Settled: 'bg-forest-50 text-forest-700',
  Hold: 'bg-orange-50 text-orange-700',
  Withdrawn: 'bg-red-50 text-red-700',
}

export const DEFAULT_SALES_SETTINGS = {
  salesTeamMembers: ['Tim', 'Dave', 'Agent', 'Unassigned'],
  defaultSenderName: 'Tim Haldane',
  timPhone: '',
  davePhone: '',
  gmailSearchUrl: 'https://mail.google.com/mail/u/0/#search/{email}',
  googleSheets: {
    leadsSheetUrl: '',
    lastSyncedAt: '',
    syncStatus: 'Not connected yet',
  },
}

export const MERGE_TAGS = [
  '{{leadName}}',
  '{{projectName}}',
  '{{unitNumber}}',
  '{{brochureLink}}',
  '{{plansLink}}',
  '{{assignedTo}}',
  '{{assignedPhone}}',
  '{{price}}',
  '{{depositAmount}}',
]
