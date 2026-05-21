import {
  COMMITTED_UNIT_STATUSES,
  PIPELINE_CLOSED_STAGE,
  PIPELINE_CLOSE_STAGES,
  PIPELINE_CONTRACT_STAGE,
  PIPELINE_NEW_STAGE,
  PIPELINE_OFFER_STAGE,
  PIPELINE_QUALIFIED_STAGE,
  PIPELINE_STAGES,
  PIPELINE_WON_STAGE,
  SOLD_UNIT_STATUSES,
} from './salesConstants'

export const todayISO = () => new Date().toISOString().slice(0, 10)

export const money = value => {
  if (value === null || value === undefined || value === '') return '-'
  return Number(value).toLocaleString('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    maximumFractionDigits: 0,
  })
}

export const formatDate = value => {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const formatShortDate = value => {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
}

export const leadName = lead => lead?.fullName || [lead?.firstName, lead?.lastName].filter(Boolean).join(' ') || 'Unnamed lead'

export const isOverdue = value => Boolean(value && value < todayISO())
export const isDueToday = value => value === todayISO()

export function daysSince(value) {
  if (!value) return 999
  const start = new Date(value)
  const end = new Date()
  return Math.floor((end - start) / (24 * 60 * 60 * 1000))
}

export function parseBudgetMax(range = '') {
  const amounts = String(range).match(/\d[\d,]*/g)?.map(item => Number(item.replaceAll(',', ''))) || []
  if (!amounts.length) return null
  const max = Math.max(...amounts)
  return max < 10000 ? max * 1000 : max
}

export function groupCounts(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item) || 'Unknown'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

export function projectMetrics(project, leads, units) {
  const projectUnits = units.filter(unit => unit.projectId === project.id)
  const projectLeads = leads.filter(lead => !lead.archived && lead.projectInterest?.includes(project.name))
  const totalUnits = project.totalUnits || projectUnits.length
  const availableUnits = projectUnits.filter(unit => unit.status === 'Available').length
  const reservedUnits = projectUnits.filter(unit => unit.status === 'Reserved').length
  const soldUnits = projectUnits.filter(unit => COMMITTED_UNIT_STATUSES.includes(unit.status)).length
  const spOut = projectUnits.filter(unit => unit.status === 'S&P Out').length
  const depositPaid = projectUnits.filter(unit => unit.status === 'Deposit Paid').length
  const unconditional = projectUnits.filter(unit => unit.status === 'Unconditional' || unit.status === 'Settled').length
  const presalesAchieved = project.presalesAchieved ?? projectUnits.filter(unit => SOLD_UNIT_STATUSES.includes(unit.status)).length
  const presalesGap = Math.max(0, (project.presalesRequired || 0) - presalesAchieved)
  const hotLeads = projectLeads.filter(lead => lead.temperature === 'Hot').length
  const likelyPresales = hotLeads + spOut + depositPaid + unconditional
  const progress = project.presalesRequired ? Math.min(100, Math.round((presalesAchieved / project.presalesRequired) * 100)) : 0

  return {
    totalUnits,
    availableUnits,
    reservedUnits,
    soldUnits,
    spOut,
    depositPaid,
    unconditional,
    presalesAchieved,
    presalesGap,
    hotLeads,
    likelyPresales,
    progress,
  }
}

export function suggestedNextAction(lead) {
  if (lead.nextAction) return lead.nextAction
  if (lead.pipelineStage === PIPELINE_NEW_STAGE) return 'Call or send first response'
  if (lead.pipelineStage === PIPELINE_QUALIFIED_STAGE && daysSince(lead.lastContactedAt) >= 3) return 'Send follow-up or qualify buyer'
  if (lead.pipelineStage === PIPELINE_QUALIFIED_STAGE) return 'Confirm buyer needs and preferred unit'
  if (lead.pipelineStage === PIPELINE_OFFER_STAGE && !lead.hasFinanceApproval) return 'Confirm finance or broker intro'
  if (lead.pipelineStage === PIPELINE_OFFER_STAGE) return 'Follow offer / S&P next step'
  if (lead.pipelineStage === PIPELINE_CONTRACT_STAGE) return 'Track conditions and deposit'
  if (lead.pipelineStage === PIPELINE_WON_STAGE) return 'Confirm settlement/admin'
  if (lead.pipelineStage === PIPELINE_CLOSED_STAGE) return 'No active follow-up'
  if (lead.financeStatus === 'Needs broker') return 'Send broker intro'
  return 'Check in'
}

export function calculatedTemperature(lead) {
  const hotSignals = [
    lead.hasFinanceApproval,
    lead.financeStatus === 'Pre-approved',
    lead.financeStatus === 'Cash buyer',
    lead.pipelineStage === PIPELINE_OFFER_STAGE,
    lead.pipelineStage === PIPELINE_CONTRACT_STAGE,
    lead.pipelineStage === PIPELINE_WON_STAGE,
    (lead.preferredUnits || []).length > 1,
    Boolean(lead.phone),
    daysSince(lead.lastContactedAt) <= 2,
  ].filter(Boolean).length

  if (lead.temperature === 'Not Now' || lead.pipelineStage === PIPELINE_CLOSED_STAGE) return 'Not Now'
  if (hotSignals >= 3) return 'Hot'
  if (lead.pipelineStage === PIPELINE_QUALIFIED_STAGE || lead.notes) return 'Warm'
  if (daysSince(lead.lastContactedAt) > 14) return 'Cold'
  return lead.temperature || 'Warm'
}

export function buildTodayActions({ leads, units, tasks }) {
  const activeLeads = leads.filter(lead => !lead.archived && lead.pipelineStage !== PIPELINE_CLOSED_STAGE)
  const leadsToCall = activeLeads.filter(lead => isDueToday(lead.nextActionDate))
  const overdueFollowUps = activeLeads.filter(lead => isOverdue(lead.nextActionDate))
  const staleHotLeads = activeLeads.filter(lead => lead.temperature === 'Hot' && daysSince(lead.lastContactedAt) >= 2)
  const closeLeads = activeLeads.filter(lead => PIPELINE_CLOSE_STAGES.includes(lead.pipelineStage))
  const reservationExpiry = units.filter(unit => unit.status === 'Reserved' && unit.reservationExpiryDate && unit.reservationExpiryDate <= addDaysISO(5))
  const spUnsigned = units.filter(unit => unit.status === 'S&P Out' || unit.spaStatus === 'Sent')
  const depositsPending = units.filter(unit => unit.depositStatus === 'Requested' || unit.depositStatus === 'Pending')
  const dueTasks = tasks.filter(task => task.status !== 'Complete' && task.dueDate && task.dueDate <= todayISO())
  const newLeads = activeLeads.filter(lead => lead.pipelineStage === PIPELINE_NEW_STAGE)
  return { leadsToCall, overdueFollowUps, staleHotLeads, closeLeads, newLeads, reservationExpiry, spUnsigned, depositsPending, dueTasks }
}

export function addDaysISO(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function buyerPackItems(lead) {
  const sent = lead.documentsSent || {}
  return [
    ['brochure', 'Brochure sent'],
    ['plans', 'Plans sent'],
    ['priceList', 'Price list sent'],
    ['rentalAppraisal', 'Rental appraisal sent'],
    ['financeInfo', 'Finance info sent'],
    ['spaInstructions', 'S&P instructions sent'],
  ].map(([key, label]) => ({ key, label, done: Boolean(sent[key]) }))
}

export function suggestedUnitsForLead(lead, units) {
  const budgetMax = parseBudgetMax(lead.budgetRange)
  return units
    .filter(unit => unit.status === 'Available' || unit.status === 'Enquiry')
    .filter(unit => !lead.projectInterest || lead.projectInterest.includes(unit.projectName))
    .filter(unit => !budgetMax || !unit.price || Number(unit.price) <= budgetMax)
    .sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
    .slice(0, 5)
}

export function renderTemplate(template, context) {
  const values = {
    leadName: context.leadName || '',
    projectName: context.projectName || '',
    unitNumber: context.unitNumber || '',
    brochureLink: context.brochureLink || '',
    plansLink: context.plansLink || '',
    assignedTo: context.assignedTo || '',
    assignedPhone: context.assignedPhone || '',
    price: context.price || '',
    depositAmount: context.depositAmount || '',
  }
  return Object.entries(values).reduce((body, [key, value]) => body.replaceAll(`{{${key}}}`, value), template || '')
}

export function sortLeads(leads, mode) {
  const stageRank = Object.fromEntries(PIPELINE_STAGES.map((stage, index) => [stage, index]))
  const tempRank = { Hot: 0, Warm: 1, Cold: 2, 'Not Now': 3 }
  return [...leads].sort((a, b) => {
    if (mode === 'nextAction') return (a.nextActionDate || '9999') > (b.nextActionDate || '9999') ? 1 : -1
    if (mode === 'hottest') return (tempRank[a.temperature] ?? 9) - (tempRank[b.temperature] ?? 9)
    if (mode === 'lastContacted') return String(b.lastContactedAt || '').localeCompare(String(a.lastContactedAt || ''))
    if (mode === 'stage') return (stageRank[a.pipelineStage] ?? 99) - (stageRank[b.pipelineStage] ?? 99)
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
  })
}
