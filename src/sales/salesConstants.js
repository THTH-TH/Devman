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

export const PIPELINE_STAGES = [
  'New Inquiry',
  'Contacted',
  'Info Sent',
  'Qualified',
  'Unit Selected',
  'Finance / Broker',
  'Offer / S&P Sent',
  'Signed',
  'Deposit Paid',
  'Unconditional',
  'Settled / Complete',
  'Lost / Not Now',
]

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
  { to: '/sales/leads', label: 'Leads' },
  { to: '/sales/pipeline', label: 'Pipeline' },
  { to: '/sales/projects', label: 'Projects' },
  { to: '/sales/units', label: 'Units' },
  { to: '/sales/tasks', label: 'Tasks' },
  { to: '/sales/templates', label: 'Templates' },
  { to: '/sales/reports', label: 'Reports' },
  { to: '/sales/settings', label: 'Settings' },
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
  'New Inquiry': 'bg-sky-50 text-sky-700',
  Contacted: 'bg-ocean-50 text-ocean-700',
  'Info Sent': 'bg-indigo-50 text-indigo-700',
  Qualified: 'bg-purple-50 text-purple-700',
  'Unit Selected': 'bg-amber-50 text-amber-700',
  'Finance / Broker': 'bg-orange-50 text-orange-700',
  'Offer / S&P Sent': 'bg-pink-50 text-pink-700',
  Signed: 'bg-teal-50 text-teal-700',
  'Deposit Paid': 'bg-green-50 text-green-700',
  Unconditional: 'bg-emerald-50 text-emerald-700',
  'Settled / Complete': 'bg-forest-50 text-forest-700',
  'Lost / Not Now': 'bg-gray-100 text-gray-500',
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
    unitsSheetUrl: '',
    salesSheetUrl: '',
    invoicesSheetUrl: '',
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
