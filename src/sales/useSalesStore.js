import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { DEFAULT_SALES_SETTINGS, PIPELINE_STAGES } from './salesConstants'
import { leadName } from './salesUtils'

const genId = () => crypto.randomUUID()

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
  targetLaunchDate: r.target_launch_date || '',
  status: r.status || 'Active',
  defaultBrochureLink: r.default_brochure_link || '',
  defaultPlansLink: r.default_plans_link || '',
  defaultDriveFolderLink: r.default_drive_folder_link || '',
  defaultPriceListLink: r.default_price_list_link || '',
  defaultRentalAppraisalLink: r.default_rental_appraisal_link || '',
  defaultValuationSummaryLink: r.default_valuation_summary_link || '',
  defaultSpaInstructionsLink: r.default_spa_instructions_link || '',
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
  pipelineStage: r.pipeline_stage || 'New Inquiry',
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
  planLink: r.plan_link || '',
  brochureLink: r.brochure_link || '',
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

const mapTemplate = r => ({
  id: r.id,
  name: r.name || '',
  project: r.project || '',
  buyerType: r.buyer_type || '',
  subject: r.subject || '',
  body: r.body || '',
  category: r.category || 'Follow-up',
  createdAt: r.created_at,
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
    pipeline_stage: data.pipelineStage ?? 'New Inquiry',
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

const projectRow = data => ({
  name: data.name,
  location: data.location,
  description: data.description,
  product: data.product,
  total_units: Number(data.totalUnits || 0),
  available_units: Number(data.availableUnits || 0),
  reserved_units: Number(data.reservedUnits || 0),
  sold_units: Number(data.soldUnits || 0),
  presales_required: Number(data.presalesRequired || 0),
  presales_achieved: Number(data.presalesAchieved || 0),
  target_launch_date: data.targetLaunchDate || '',
  status: data.status || 'Active',
  default_brochure_link: data.defaultBrochureLink || '',
  default_plans_link: data.defaultPlansLink || '',
  default_drive_folder_link: data.defaultDriveFolderLink || '',
  default_price_list_link: data.defaultPriceListLink || '',
  default_rental_appraisal_link: data.defaultRentalAppraisalLink || '',
  default_valuation_summary_link: data.defaultValuationSummaryLink || '',
  default_spa_instructions_link: data.defaultSpaInstructionsLink || '',
  default_assignee: data.defaultAssignee || 'Tim',
  project_notes: data.projectNotes || '',
})

const unitRow = data => ({
  project_id: data.projectId || '',
  project_name: data.projectName || '',
  unit_number: data.unitNumber || '',
  typology: data.typology || '',
  bedrooms: data.bedrooms === '' ? null : data.bedrooms,
  bathrooms: data.bathrooms === '' ? null : data.bathrooms,
  carparks: data.carparks === '' ? null : data.carparks,
  floor_area: data.floorArea === '' ? null : data.floorArea,
  price: data.price === '' ? null : data.price,
  rental_appraisal: data.rentalAppraisal || '',
  gross_yield: data.grossYield === '' ? null : data.grossYield,
  status: data.status || 'Available',
  assigned_lead_id: data.assignedLeadId || null,
  assigned_buyer_name: data.assignedBuyerName || '',
  deposit_status: data.depositStatus || 'Not requested',
  spa_status: data.spaStatus || 'Not started',
  conditions_status: data.conditionsStatus || 'None',
  settlement_status: data.settlementStatus || 'Not applicable',
  reservation_expiry_date: data.reservationExpiryDate || '',
  notes: data.notes || '',
  plan_link: data.planLink || '',
  brochure_link: data.brochureLink || '',
})

const taskRow = data => ({
  title: data.title || '',
  description: data.description || '',
  related_lead_id: data.relatedLeadId || null,
  related_project_id: data.relatedProjectId || null,
  related_unit_id: data.relatedUnitId || null,
  assigned_to: data.assignedTo || 'Unassigned',
  due_date: data.dueDate || '',
  priority: data.priority || 'Medium',
  status: data.status || 'Open',
  completed_at: data.completedAt || null,
})

const templateRow = data => ({
  name: data.name || '',
  project: data.project || '',
  buyer_type: data.buyerType || '',
  subject: data.subject || '',
  body: data.body || '',
  category: data.category || 'Follow-up',
})

const useSalesStore = create((set, get) => ({
  initialized: false,
  loading: false,
  error: null,
  projects: [],
  leads: [],
  units: [],
  tasks: [],
  templates: [],
  activities: [],
  settings: DEFAULT_SALES_SETTINGS,

  async initialize() {
    if (get().initialized || get().loading) return
    set({ loading: true, error: null })
    try {
      const [projects, leads, units, tasks, templates, activities, settings] = await Promise.all([
        supabase.from('sales_projects').select('*').order('name'),
        supabase.from('sales_leads').select('*').order('created_at', { ascending: false }),
        supabase.from('sales_units').select('*').order('project_name').order('unit_number'),
        supabase.from('sales_tasks').select('*').order('due_date', { ascending: true }),
        supabase.from('sales_email_templates').select('*').order('name'),
        supabase.from('sales_activities').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('sales_settings').select('*').eq('id', 'default').maybeSingle(),
      ])
      const failures = [projects, leads, units, tasks, templates, activities, settings].filter(result => result.error)
      if (failures.length) throw failures[0].error
      set({
        projects: projects.data.map(mapProject),
        leads: leads.data.map(mapLead),
        units: units.data.map(mapUnit),
        tasks: tasks.data.map(mapTask),
        templates: templates.data.map(mapTemplate),
        activities: activities.data.map(mapActivity),
        settings: { ...DEFAULT_SALES_SETTINGS, ...(settings.data?.payload || {}) },
        initialized: true,
        loading: false,
      })
    } catch (error) {
      console.error('Sales Hub init error:', error)
      set({ error: error.message || 'Sales Hub tables are not ready. Run the Sales Hub Supabase migration.', loading: false })
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
    await get().addActivity({ leadId: id, type: 'Note', title: 'Lead created', description: `${leadName(lead)} added to Sales Hub`, createdBy: data.assignedTo || 'Sales Hub' })
    return lead
  },

  async updateLead(id, data) {
    const updates = { ...leadRow(data), updated_at: new Date().toISOString() }
    Object.keys(updates).forEach(key => {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
      if (data[camelKey] === undefined && !['updated_at'].includes(key)) delete updates[key]
    })
    set(s => ({ leads: s.leads.map(lead => lead.id === id ? { ...lead, ...data, updatedAt: updates.updated_at } : lead) }))
    const { error } = await supabase.from('sales_leads').update(updates).eq('id', id)
    if (error) console.error('updateSalesLead error:', error)
  },

  async archiveLead(id) {
    await get().updateLead(id, { archived: true })
  },

  async deleteLead(id) {
    set(s => ({ leads: s.leads.filter(lead => lead.id !== id), tasks: s.tasks.filter(task => task.relatedLeadId !== id), activities: s.activities.filter(activity => activity.leadId !== id) }))
    const { error } = await supabase.from('sales_leads').delete().eq('id', id)
    if (error) console.error('deleteSalesLead error:', error)
  },

  async markContacted(id) {
    const lead = get().leads.find(item => item.id === id)
    if (!lead) return
    await get().updateLead(id, { pipelineStage: lead.pipelineStage === 'New Inquiry' ? 'Contacted' : lead.pipelineStage, lastContactedAt: new Date().toISOString(), nextActionDate: '', nextAction: '' })
    await get().addActivity({ leadId: id, type: 'Call', title: 'Marked contacted', description: `${leadName(lead)} was contacted`, createdBy: lead.assignedTo })
  },

  async markInfoSent(id) {
    const lead = get().leads.find(item => item.id === id)
    if (!lead) return
    await get().updateLead(id, {
      pipelineStage: 'Info Sent',
      lastContactedAt: new Date().toISOString(),
      documentsSent: { ...(lead.documentsSent || {}), brochure: true, plans: true, priceList: true },
      nextAction: 'Follow up after info sent',
    })
    await get().addActivity({ leadId: id, type: 'Document Sent', title: 'Info pack sent', description: 'Brochure, plans and price information marked as sent.', createdBy: lead.assignedTo })
  },

  async moveLeadStage(id, nextStage, extra = {}) {
    const lead = get().leads.find(item => item.id === id)
    if (!lead || lead.pipelineStage === nextStage) return
    await get().updateLead(id, { pipelineStage: nextStage, lostReason: nextStage === 'Lost / Not Now' ? (extra.lostReason || lead.lostReason) : lead.lostReason })
    await get().addActivity({ leadId: id, type: 'Stage Changed', title: 'Stage changed', description: `${lead.pipelineStage} to ${nextStage}`, createdBy: lead.assignedTo })

    const assignedUnit = get().units.find(unit => unit.assignedLeadId === id)
    if (!assignedUnit) return
    const unitUpdatesByStage = {
      'Offer / S&P Sent': { status: 'S&P Out', spaStatus: 'Sent' },
      Signed: { status: 'Under Contract', spaStatus: 'Signed' },
      'Deposit Paid': { status: 'Deposit Paid', depositStatus: 'Paid' },
      Unconditional: { status: 'Unconditional', conditionsStatus: 'Satisfied' },
      'Settled / Complete': { status: 'Settled', settlementStatus: 'Settled' },
    }
    if (unitUpdatesByStage[nextStage]) await get().updateUnit(assignedUnit.id, unitUpdatesByStage[nextStage])
  },

  async assignUnitToLead(leadId, unitId) {
    const lead = get().leads.find(item => item.id === leadId)
    const unit = get().units.find(item => item.id === unitId)
    if (!lead || !unit) return
    const preferredUnits = [...new Set([...(lead.preferredUnits || []), unit.unitNumber])]
    await get().updateLead(leadId, { preferredUnits, pipelineStage: PIPELINE_STAGES.includes(lead.pipelineStage) && lead.pipelineStage === 'New Inquiry' ? 'Unit Selected' : lead.pipelineStage })
    await get().updateUnit(unitId, {
      assignedLeadId: leadId,
      assignedBuyerName: leadName(lead),
      status: unit.status === 'Available' ? 'Enquiry' : unit.status,
    })
    await get().addActivity({ leadId, type: 'Unit Assigned', title: 'Unit assigned', description: `${unit.projectName} ${unit.unitNumber} assigned to ${leadName(lead)}`, createdBy: lead.assignedTo })
  },

  async addTask(data) {
    const id = data.id || genId()
    const now = new Date().toISOString()
    const row = { id, ...taskRow(data), created_at: now, updated_at: now }
    const task = mapTask(row)
    set(s => ({ tasks: [task, ...s.tasks] }))
    const { error } = await supabase.from('sales_tasks').insert(row)
    if (error) throw error
    if (data.relatedLeadId) await get().addActivity({ leadId: data.relatedLeadId, type: 'Task Created', title: 'Task created', description: task.title, createdBy: task.assignedTo })
    return task
  },

  async updateTask(id, data) {
    const updates = { ...taskRow(data), updated_at: new Date().toISOString() }
    Object.keys(updates).forEach(key => {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
      if (data[camelKey] === undefined && !['updated_at'].includes(key)) delete updates[key]
    })
    set(s => ({ tasks: s.tasks.map(task => task.id === id ? { ...task, ...data, updatedAt: updates.updated_at } : task) }))
    const { error } = await supabase.from('sales_tasks').update(updates).eq('id', id)
    if (error) console.error('updateSalesTask error:', error)
  },

  async completeTask(id) {
    const task = get().tasks.find(item => item.id === id)
    if (!task) return
    const completedAt = new Date().toISOString()
    await get().updateTask(id, { status: 'Complete', completedAt })
    if (task.relatedLeadId) await get().addActivity({ leadId: task.relatedLeadId, type: 'Task Completed', title: 'Task completed', description: task.title, createdBy: task.assignedTo })
  },

  async deleteTask(id) {
    set(s => ({ tasks: s.tasks.filter(task => task.id !== id) }))
    const { error } = await supabase.from('sales_tasks').delete().eq('id', id)
    if (error) console.error('deleteSalesTask error:', error)
  },

  async updateUnit(id, data) {
    const updates = { ...unitRow(data), updated_at: new Date().toISOString() }
    Object.keys(updates).forEach(key => {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
      if (data[camelKey] === undefined && !['updated_at'].includes(key)) delete updates[key]
    })
    set(s => ({ units: s.units.map(unit => unit.id === id ? { ...unit, ...data, updatedAt: updates.updated_at } : unit) }))
    const { error } = await supabase.from('sales_units').update(updates).eq('id', id)
    if (error) console.error('updateSalesUnit error:', error)
  },

  async updateProject(id, data) {
    const updates = { ...projectRow(data), updated_at: new Date().toISOString() }
    Object.keys(updates).forEach(key => {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
      if (data[camelKey] === undefined && !['updated_at'].includes(key)) delete updates[key]
    })
    set(s => ({ projects: s.projects.map(project => project.id === id ? { ...project, ...data, updatedAt: updates.updated_at } : project) }))
    const { error } = await supabase.from('sales_projects').update(updates).eq('id', id)
    if (error) console.error('updateSalesProject error:', error)
  },

  async updateTemplate(id, data) {
    const updates = { ...templateRow(data), updated_at: new Date().toISOString() }
    Object.keys(updates).forEach(key => {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
      if (data[camelKey] === undefined && !['updated_at'].includes(key)) delete updates[key]
    })
    set(s => ({ templates: s.templates.map(template => template.id === id ? { ...template, ...data, updatedAt: updates.updated_at } : template) }))
    const { error } = await supabase.from('sales_email_templates').update(updates).eq('id', id)
    if (error) console.error('updateSalesTemplate error:', error)
  },

  async updateSettings(data) {
    const payload = { ...get().settings, ...data }
    set({ settings: payload })
    const { error } = await supabase.from('sales_settings').upsert({ id: 'default', payload, updated_at: new Date().toISOString() })
    if (error) console.error('updateSalesSettings error:', error)
  },
}))

export default useSalesStore
