const DAY_MS = 86_400_000

export const SCHEDULE_TEMPLATE = [
  { phase: 'Project Commencement', name: 'Project setup and consultant engagement', offsetDays: 0, durationDays: 3 },
  { phase: 'Feasibility', name: 'Planning and feasibility review', offsetDays: 1, durationDays: 10 },
  { phase: 'Feasibility', name: 'Initial concept and servicing review', offsetDays: 6, durationDays: 12 },
  { phase: 'Acquisition', name: 'Due diligence period', offsetDays: 10, durationDays: 15 },
  { phase: 'Acquisition', name: 'Purchase confirmed / unconditional', offsetDays: 25, durationDays: 1, isMilestone: true },
  { phase: 'Funding & Legal', name: 'Funding and legal structure confirmed', offsetDays: 18, durationDays: 14 },
  { phase: 'Resource Consent', name: 'RC consultant inputs and documentation', offsetDays: 30, durationDays: 25 },
  { phase: 'Resource Consent', name: 'Resource consent lodged', offsetDays: 55, durationDays: 1, isMilestone: true },
  { phase: 'Resource Consent', name: 'Council processing and RFI responses', offsetDays: 56, durationDays: 40 },
  { phase: 'Resource Consent', name: 'Resource consent approved', offsetDays: 96, durationDays: 1, isMilestone: true },
  { phase: 'Building Consent', name: 'BC documentation and consultant coordination', offsetDays: 80, durationDays: 30 },
  { phase: 'Building Consent', name: 'Building consent lodged', offsetDays: 110, durationDays: 1, isMilestone: true },
  { phase: 'Building Consent', name: 'BC processing and RFI responses', offsetDays: 111, durationDays: 35 },
  { phase: 'Building Consent', name: 'Building consent approved', offsetDays: 146, durationDays: 1, isMilestone: true },
  { phase: 'Engineering Plan Approvals', name: 'Authority approvals and pre-start requirements', offsetDays: 120, durationDays: 30 },
  { phase: 'Pricing', name: 'QS estimate, tender review and final pricing', offsetDays: 130, durationDays: 25 },
  { phase: 'Sales & Marketing', name: 'Sales collateral and launch readiness', offsetDays: 140, durationDays: 30 },
  { phase: 'Construction', name: 'Pre-start, procurement and site establishment', offsetDays: 150, durationDays: 15 },
  { phase: 'Construction', name: 'Construction commenced', offsetDays: 165, durationDays: 1, isMilestone: true },
  { phase: 'Construction', name: 'Construction works', offsetDays: 166, durationDays: 120 },
  { phase: 'Settlement & Handover', name: 'CCC, warranties and handover documentation', offsetDays: 286, durationDays: 25 },
  { phase: 'Settlement & Handover', name: 'Practical completion / settlement', offsetDays: 311, durationDays: 1, isMilestone: true },
]

const parseDate = value => {
  if (!value) return new Date()
  const parts = String(value).split('-').map(Number)
  if (parts.length === 3 && parts.every(Boolean)) return new Date(parts[0], parts[1] - 1, parts[2])
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? new Date() : d
}

const formatDate = date =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS)

export function buildScheduleTasks(projectId, startDate) {
  const base = parseDate(startDate)
  return SCHEDULE_TEMPLATE.map((item, index) => {
    const start = addDays(base, item.offsetDays)
    const end = addDays(start, Math.max(1, item.durationDays) - 1)
    return {
      projectId,
      name: item.name,
      phase: item.phase,
      startDate: formatDate(start),
      endDate: formatDate(end),
      durationDays: item.durationDays,
      status: 'not-started',
      progress: 0,
      isMilestone: Boolean(item.isMilestone),
      sortOrder: index,
    }
  })
}

export function buildScheduleTasksFromTemplateItems(projectId, startDate, items = []) {
  const source = items.length ? items : SCHEDULE_TEMPLATE
  const base = parseDate(startDate)
  return source.map((item, index) => {
    const start = addDays(base, Number(item.offsetDays ?? item.offset_days ?? 0))
    const duration = Math.max(1, Number(item.durationDays ?? item.duration_days ?? 1))
    const end = addDays(start, duration - 1)
    return {
      projectId,
      name: item.name,
      phase: item.phase,
      startDate: formatDate(start),
      endDate: formatDate(end),
      durationDays: duration,
      status: 'not-started',
      progress: 0,
      isMilestone: Boolean(item.isMilestone ?? item.is_milestone),
      notes: item.notes || '',
      sortOrder: item.sortOrder ?? item.sort_order ?? index,
    }
  })
}
