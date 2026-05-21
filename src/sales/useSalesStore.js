import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import {
  DEFAULT_SALES_SETTINGS,
  PIPELINE_CLOSED_STAGE,
  PIPELINE_CONTRACT_STAGE,
  PIPELINE_NEW_STAGE,
  PIPELINE_OFFER_STAGE,
  PIPELINE_QUALIFIED_STAGE,
  PIPELINE_STAGE_COMPATIBILITY,
  PIPELINE_STAGES,
  PIPELINE_WON_STAGE,
} from './salesConstants'
import { leadName } from './salesUtils'

const genId = () => crypto.randomUUID()

const normaliseStage = stage => {
  if (PIPELINE_STAGES.includes(stage)) return stage
  return PIPELINE_STAGE_COMPATIBILITY[stage] || PIPELINE_NEW_STAGE
}

const mapProject = r => ({
  id: r.id,
  name: r.name || '',
  location: r.location || '',
  description: r.description || '',
  product: r.product || '',
  totalUnits: r.total_units ?? 0,
  availableUnits: r.available_units ?? 0,
  reservedUnits: r.reserved_units ?? 0,
  soldUnits: r.sold_units ?? 0,
  presalesRequired: r.presales_required ?? 0,
  presalesAchieved: r.presales_achieved ?? 0,
  status: r.status || 'Active',
  defaultAssignee: r.default_assignee || 'Tim',
  projectNotes: r.project_notes || '',
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const mapLead = r => ({
  id: r.id,
  firstName: r.first_name || '',
  lastName: r.last_name || '',
  fullName: r.full_name || [r.first_name, r.last_name].filter(Boolean).join(' '),
  email: r.email || '',
  phone: r.phone || '',
  source: r.source || 'Other',
  projectInterest: r.project_interest || '',
  buyerType: r.buyer_type || 'Unknown',
  financeStatus: r.finance_status || 'Unknown',
  assignedTo: r.assigned_to || 'Unassigned',
  temperature: r.temperature || 'Warm',
  pipelineStage: normaliseStage(r.pipeline_stage || PIPELINE_NEW_STAGE),
  notes: r.notes || '',
  preferredUnits: Array.isArray(r.preferred_units) ? r.preferred_units : [],
  budgetRange: r.budget_range || '',
  depositCapacity: r.deposit_capacity || '',
  hasFinanceApproval: Boolean(r.has_finance_approval),
  needsBrokerIntro: Boolean(r.needs_broker_intro),
  lastContactedAt: r.last_contacted_at || '',
  nextActionDate: r.next_action_date || '',
  nextAction: r.next_action || '',
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  tags: Array.isArray(r.tags) ? r.tags : [],
  lostReason: r.lost_reason || '',
  probability: r.probability ?? 10,
  documentsSent: r.documents_sent || {},
  archived: Boolean(r.archived),
  sheetConnectionId: r.sheet_connection_id || '',
  sourceRowNumber: r.source_row_number ?? null,
  sourceRowKey: r.source_row_key || '',
  sourceRowHash: r.source_row_hash || '',
  sourceSheetName: r.source_sheet_name || '',
  lastSheetSyncAt: r.last_sheet_sync_at || '',
  syncStatus: r.sync_status || '',
  rawSheetRow: r.raw_sheet_row || {},
})

const mapUnit = r => ({
  id: r.id,
  projectId: r.project_id || '',
  projectName: r.project_name || '',
  unitNumber: r.unit_number || '',
  typology: r.typology || '',
  bedrooms: r.bedrooms ?? null,
  bathrooms: r.bathrooms ?? null,
  carparks: r.carparks ?? null,
  floorArea: r.floor_area ?? null,
  price: r.price ?? null,
  rentalAppraisal: r.rental_appraisal || '',
  grossYield: r.gross_yield ?? null,
  status: r.status || 'Available',
  assignedLeadId: r.assigned_lead_id || '',
  assignedBuyerName: r.assigned_buyer_name || '',
  depositStatus: r.deposit_status || 'Not requested',
  spaStatus: r.spa_status || 'Not started',
  conditionsStatus: r.conditions_status || 'None',
  settlementStatus: r.settlement_status || 'Not applicable',
  reservationExpiryDate: r.reservation_expiry_date || '',
  notes: r.notes || '',
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const mapTask = r => ({
  id: r.id,
  title: r.title || '',
  description: r.description || '',
  relatedLeadId: r.related_lead_id || '',
  relatedProjectId: r.related_project_id || '',
  relatedUnitId: r.related_unit_id || '',
  assignedTo: r.assigned_to || 'Unassigned',
  dueDate: r.due_date || '',
  priority: r.priority || 'Medium',
  status: r.status || 'Open',
  createdAt: r.created_at,
  completedAt: r.completed_at || '',
  updatedAt: r.updated_at,
})

const mapActivity = r => ({
  id: r.id,
  leadId: r.lead_id || '',
  type: r.type || 'Note',
  title: r.title || '',
  description: r.description || '',
  createdBy: r.created_by || '',
  createdAt: r.created_at,
})

const mapSheetConnection = r => ({
  id: r.id,
  name: r.name || '',
  spreadsheetId: r.spreadsheet_id || '',
  spreadsheetUrl: r.spreadsheet_url || '',
  sheetName: r.sheet_name || '',
  rangeA1: r.range_a1 || '',
  projectHint: r.project_hint || '',
  sourceHint: r.source_hint || '',
  active: r.active !== false,
  lastSyncedAt: r.last_synced_at || '',
  lastSyncStatus: r.last_sync_status || 'Not synced',
  lastSyncMessage: r.last_sync_message || '',
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const mapSheetMapping = r => ({
  id: r.id,
  connectionId: r.connection_id,
  headerRow: r.header_row || 1,
  fieldMap: r.field_map || {},
  defaults: r.defaults || {},
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const mapSyncRun = r => ({
  id: r.id,
  connectionId: r.connection_id || '',
  status: r.status || '',
  startedAt: r.started_at || '',
  finishedAt: r.finished_at || '',
  rowsRead: r.rows_read ?? 0,
  rowsCreated: r.rows_created ?? 0,
  rowsUpdated: r.rows_updated ?? 0,
  rowsSkipped: r.rows_skipped ?? 0,
  errors: Array.isArray(r.errors) ? r.errors : [],
})

const leadRow = data => {
  const firstName = data.firstName ?? ''
  const lastName = data.lastName ?? ''
  const fullName = data.fullName || [firstName, lastName].filter(Boolean).join(' ')
  return {
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    email: data.email ?? '',
    phone: data.phone ?? '',
    source: data.source ?? 'Other',
    project_interest: data.projectInterest ?? '',
    buyer_type: data.buyerType ?? 'Unknown',
    finance_status: data.financeStatus ?? 'Unknown',
    assigned_to: data.assignedTo ?? 'Unassigned',
    temperature: data.temperature ?? 'Warm',
    pipeline_stage: normaliseStage(data.pipelineStage ?? PIPELINE_NEW_STAGE),
    notes: data.notes ?? '',
    preferred_units: data.preferredUnits ?? [],
    budget_range: data.budgetRange ?? '',
    deposit_capacity: data.depositCapacity ?? '',
    has_finance_approval: Boolean(data.hasFinanceApproval),
    needs_broker_intro: Boolean(data.needsBrokerIntro),
    last_contacted_at: data.lastContactedAt || null,
    next_action_date: data.nextActionDate || '',
    next_action: data.nextAction ?? '',
    tags: data.tags ?? [],
    lost_reason: data.lostReason ?? '',
    probability: data.probability ?? 10,
    documents_sent: data.documentsSent ?? {},
    archived: Boolean(data.archived),
  }
}

const partialRow = (row, source) => {
  const result = { updated_at: new Date().toISOString() }
  Object.entries(row).forEach(([key, value]) => {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    if (Object.prototype.hasOwnProperty.call(source, camelKey)) result[key] = value
  })
  return result
}

const projectRow = data => ({
  total_units: Number(data.totalUnits || 0),
  available_units: Number(data.availableUnits || 0),
  reserved_units: Number(data.reservedUnits || 0),
  sold_units: Number(data.soldUnits || 0),
  presales_required: Number(data.presalesRequired || 0),
  presales_achieved: Number(data.presalesAchieved || 0),
  default_assignee: data.defaultAssignee || 'Tim',
  project_notes: data.projectNotes || '',
})

const unitRow = data => ({
  status: data.status || 'Available',
  assigned_lead_id: data.assignedLeadId || null,
  assigned_buyer_name: data.assignedBuyerName || '',
  deposit_status: data.depositStatus || 'Not requested',
  spa_status: data.spaStatus || 'Not started',
  conditions_status: data.conditionsStatus || 'None',
  settlement_status: data.settlementStatus || 'Not applicable',
  reservation_expiry_date: data.reservationExpiryDate || '',
  notes: data.notes || '',
})

async function apiPost(body) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  const response = await fetch('/api/sales/sheets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Sales sheet request failed')
  return data
}

const useSalesStore = create((set, get) => ({
  initialized: false,
  loading: false,
  error: null,
  projects: [],
  leads: [],
  units: [],
  tasks: [],
  activities: [],
  settings: DEFAULT_SALES_SETTINGS,
  sheetConnections: [],
  sheetMappings: [],
  syncRuns: [],
  sheetSyncReady: true,
  sheetSyncError: '',

  async initialize() {
    if (get().initialized || get().loading) return
    await get().refresh()
  },

  async refresh() {
    set({ loading: true, error: null })
    try {
      const [projects, leads, units, tasks, activities, settings] = await Promise.all([
        supabase.from('sales_projects').select('*').order('name'),
        supabase.from('sales_leads').select('*').order('created_at', { ascending: false }),
        supabase.from('sales_units').select('*').order('project_name').order('unit_number'),
        supabase.from('sales_tasks').select('*').order('due_date', { ascending: true }),
        supabase.from('sales_activities').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('sales_settings').select('*').eq('id', 'default').maybeSingle(),
      ])
      const failures = [projects, leads, units, tasks, activities, settings].filter(result => result.error)
      if (failures.length) throw failures[0].error

      const [connections, mappings, runs] = await Promise.all([
        supabase.from('sales_sheet_connections').select('*').order('created_at', { ascending: false }),
        supabase.from('sales_sheet_mappings').select('*').order('updated_at', { ascending: false }),
        supabase.from('sales_sync_runs').select('*').order('started_at', { ascending: false }).limit(50),
      ])
      const sheetFailure = [connections, mappings, runs].find(result => result.error)
      set({
        projects: projects.data.map(mapProject),
        leads: leads.data.map(mapLead),
        units: units.data.map(mapUnit),
        tasks: tasks.data.map(mapTask),
        activities: activities.data.map(mapActivity),
        settings: { ...DEFAULT_SALES_SETTINGS, ...(settings.data?.payload || {}) },
        sheetConnections: sheetFailure ? [] : connections.data.map(mapSheetConnection),
        sheetMappings: sheetFailure ? [] : mappings.data.map(mapSheetMapping),
        syncRuns: sheetFailure ? [] : runs.data.map(mapSyncRun),
        sheetSyncReady: !sheetFailure,
        sheetSyncError: sheetFailure?.error?.message || '',
        initialized: true,
        loading: false,
      })
    } catch (error) {
      console.error('Sales Hub init error:', error)
      set({ error: error.message || 'Sales Hub tables are not ready. Run the Sales Hub Supabase migrations.', loading: false })
    }
  },

  async addActivity(data) {
    const row = {
      id: data.id || genId(),
      lead_id: data.leadId || null,
      type: data.type || 'Note',
      title: data.title || '',
      description: data.description || '',
      created_by: data.createdBy || 'Sales Hub',
    }
    const activity = mapActivity({ ...row, created_at: new Date().toISOString() })
    set(s => ({ activities: [activity, ...s.activities].slice(0, 500) }))
    const { error } = await supabase.from('sales_activities').insert(row)
    if (error) console.error('addSalesActivity error:', error)
    return activity
  },

  async addLead(data) {
    const id = data.id || genId()
    const now = new Date().toISOString()
    const row = { id, ...leadRow(data), created_at: now, updated_at: now }
    const lead = mapLead(row)
    set(s => ({ leads: [lead, ...s.leads] }))
    const { error } = await supabase.from('sales_leads').insert(row)
    if (error) throw error
    await get().addActivity({ leadId: id, type: 'Note', title: 'Lead created', description: `${leadName(lead)} added manually`, createdBy: data.assignedTo || 'Sales Hub' })
    return lead
  },

  async updateLead(id, data) {
    const updates = partialRow(leadRow(data), data)
    set(s => ({ leads: s.leads.map(lead => lead.id === id ? { ...lead, ...data, updatedAt: updates.updated_at } : lead) }))
    const { error } = await supabase.from('sales_leads').update(updates).eq('id', id)
    if (error) console.error('updateSalesLead error:', error)
  },

  async archiveLead(id) {
    await get().updateLead(id, { archived: true })
  },

  async deleteLead(id) {
    set(s => ({ leads: s.leads.filter(lead => lead.id !== id), activities: s.activities.filter(activity => activity.leadId !== id) }))
    const { error } = await supabase.from('sales_leads').delete().eq('id', id)
    if (error) console.error('deleteSalesLead error:', error)
  },

  async markContacted(id) {
    const lead = get().leads.find(item => item.id === id)
    if (!lead) return
    await get().updateLead(id, {
      pipelineStage: lead.pipelineStage === PIPELINE_NEW_STAGE ? PIPELINE_QUALIFIED_STAGE : lead.pipelineStage,
      lastContactedAt: new Date().toISOString(),
      nextActionDate: '',
      nextAction: '',
    })
    await get().addActivity({ leadId: id, type: 'Call', title: 'Marked contacted', description: `${leadName(lead)} was contacted`, createdBy: lead.assignedTo })
  },

  async markInfoSent(id) {
    const lead = get().leads.find(item => item.id === id)
    if (!lead) return
    await get().updateLead(id, {
      pipelineStage: lead.pipelineStage === PIPELINE_NEW_STAGE ? PIPELINE_QUALIFIED_STAGE : lead.pipelineStage,
      lastContactedAt: new Date().toISOString(),
      documentsSent: { ...(lead.documentsSent || {}), emailSent: true, brochure: true, plans: true, priceList: true },
      nextAction: 'Follow up after info sent',
    })
    await get().addActivity({ leadId: id, type: 'Document Sent', title: 'Info marked sent', description: 'Brochure, plans and price information marked as sent.', createdBy: lead.assignedTo })
  },

  async moveLeadStage(id, nextStage, extra = {}) {
    const lead = get().leads.find(item => item.id === id)
    const normalisedNextStage = normaliseStage(nextStage)
    if (!lead || lead.pipelineStage === normalisedNextStage) return
    await get().updateLead(id, {
      pipelineStage: normalisedNextStage,
      lostReason: normalisedNextStage === PIPELINE_CLOSED_STAGE ? (extra.lostReason || lead.lostReason || 'Not now') : lead.lostReason,
    })
    await get().addActivity({ leadId: id, type: 'Stage Changed', title: 'Stage changed', description: `${lead.pipelineStage} to ${normalisedNextStage}`, createdBy: lead.assignedTo })
    const assignedUnit = get().units.find(unit => unit.assignedLeadId === id)
    if (!assignedUnit) return
    const unitUpdatesByStage = {
      [PIPELINE_OFFER_STAGE]: { status: 'S&P Out', spaStatus: 'Sent' },
      [PIPELINE_CONTRACT_STAGE]: { status: 'Under Contract', spaStatus: 'Signed' },
      [PIPELINE_WON_STAGE]: { status: 'Unconditional', conditionsStatus: 'Satisfied' },
    }
    if (unitUpdatesByStage[normalisedNextStage]) await get().updateUnit(assignedUnit.id, unitUpdatesByStage[normalisedNextStage])
  },

  async addLeadNote(id, note) {
    const text = note.trim()
    if (!text) return
    const lead = get().leads.find(item => item.id === id)
    if (!lead) return
    const notes = [lead.notes, `[${new Date().toLocaleDateString('en-NZ')}] ${text}`].filter(Boolean).join('\n')
    await get().updateLead(id, { notes })
    await get().addActivity({ leadId: id, type: 'Note', title: 'Note added', description: text, createdBy: lead.assignedTo })
  },

  async assignUnitToLead(leadId, unitId) {
    const lead = get().leads.find(item => item.id === leadId)
    const unit = get().units.find(item => item.id === unitId)
    if (!lead || !unit) return
    const preferredUnits = [...new Set([...(lead.preferredUnits || []), `${unit.projectName} ${unit.unitNumber}`])]
    await get().updateLead(leadId, { preferredUnits, pipelineStage: [PIPELINE_NEW_STAGE, PIPELINE_QUALIFIED_STAGE].includes(lead.pipelineStage) ? PIPELINE_OFFER_STAGE : lead.pipelineStage })
    await get().updateUnit(unitId, {
      assignedLeadId: leadId,
      assignedBuyerName: leadName(lead),
      status: unit.status === 'Available' ? 'Enquiry' : unit.status,
    })
    await get().addActivity({ leadId, type: 'Unit Assigned', title: 'Unit assigned', description: `${unit.projectName} ${unit.unitNumber} assigned to ${leadName(lead)}`, createdBy: lead.assignedTo })
  },

  async updateUnit(id, data) {
    const updates = partialRow(unitRow(data), data)
    set(s => ({ units: s.units.map(unit => unit.id === id ? { ...unit, ...data, updatedAt: updates.updated_at } : unit) }))
    const { error } = await supabase.from('sales_units').update(updates).eq('id', id)
    if (error) console.error('updateSalesUnit error:', error)
  },

  async updateProject(id, data) {
    const updates = partialRow(projectRow(data), data)
    set(s => ({ projects: s.projects.map(project => project.id === id ? { ...project, ...data, updatedAt: updates.updated_at } : project) }))
    const { error } = await supabase.from('sales_projects').update(updates).eq('id', id)
    if (error) console.error('updateSalesProject error:', error)
  },

  async updateSettings(data) {
    const payload = { ...get().settings, ...data }
    set({ settings: payload })
    const { error } = await supabase.from('sales_settings').upsert({ id: 'default', payload, updated_at: new Date().toISOString() })
    if (error) console.error('updateSalesSettings error:', error)
  },

  async addSheetConnection(data) {
    const id = data.id || genId()
    const row = {
      id,
      name: data.name || 'Lead sheet',
      spreadsheet_id: data.spreadsheetId || '',
      spreadsheet_url: data.spreadsheetUrl || '',
      sheet_name: data.sheetName || '',
      range_a1: data.rangeA1 || '',
      project_hint: data.projectHint || '',
      source_hint: data.sourceHint || '',
      active: data.active !== false,
    }
    const { data: saved, error } = await supabase.from('sales_sheet_connections').insert(row).select('*').single()
    if (error) throw error
    const connection = mapSheetConnection(saved)
    set(s => ({ sheetConnections: [connection, ...s.sheetConnections] }))
    return connection
  },

  async updateSheetConnection(id, data) {
    const row = {
      name: data.name,
      spreadsheet_id: data.spreadsheetId,
      spreadsheet_url: data.spreadsheetUrl,
      sheet_name: data.sheetName,
      range_a1: data.rangeA1,
      project_hint: data.projectHint,
      source_hint: data.sourceHint,
      active: data.active,
      updated_at: new Date().toISOString(),
    }
    Object.keys(row).forEach(key => row[key] === undefined && delete row[key])
    const { data: saved, error } = await supabase.from('sales_sheet_connections').update(row).eq('id', id).select('*').single()
    if (error) throw error
    const connection = mapSheetConnection(saved)
    set(s => ({ sheetConnections: s.sheetConnections.map(item => item.id === id ? connection : item) }))
    return connection
  },

  async deleteSheetConnection(id) {
    set(s => ({
      sheetConnections: s.sheetConnections.filter(item => item.id !== id),
      sheetMappings: s.sheetMappings.filter(item => item.connectionId !== id),
      syncRuns: s.syncRuns.filter(item => item.connectionId !== id),
    }))
    const { error } = await supabase.from('sales_sheet_connections').delete().eq('id', id)
    if (error) console.error('deleteSheetConnection error:', error)
  },

  async saveSheetMapping(connectionId, data) {
    const existing = get().sheetMappings.find(item => item.connectionId === connectionId)
    const row = {
      id: existing?.id || genId(),
      connection_id: connectionId,
      header_row: Number(data.headerRow || 1),
      field_map: data.fieldMap || {},
      defaults: data.defaults || {},
      updated_at: new Date().toISOString(),
    }
    const { data: saved, error } = await supabase.from('sales_sheet_mappings').upsert(row).select('*').single()
    if (error) throw error
    const mapping = mapSheetMapping(saved)
    set(s => ({ sheetMappings: [mapping, ...s.sheetMappings.filter(item => item.connectionId !== connectionId)] }))
    return mapping
  },

  async previewSheetConnection(payload) {
    return apiPost({ action: 'preview', ...payload })
  },

  async syncSheetConnection(connectionId) {
    const result = await apiPost({ action: 'syncConnection', connectionId })
    await get().refresh()
    return result
  },

  async syncAllSheets() {
    const result = await apiPost({ action: 'syncAll' })
    await get().refresh()
    return result
  },
}))

export default useSalesStore
