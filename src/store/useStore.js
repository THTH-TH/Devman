import { create } from 'zustand'
import { supabase } from '../lib/supabase'

// ── ID generator ─────────────────────────────────────────────────────────────
const genId = () => crypto.randomUUID()

// ── Row mappers (snake_case DB → camelCase app) ───────────────────────────────
const mapProject = r => ({
  id: r.id,
  name: r.name,
  address: r.address || '',
  clientEntity: r.client_entity || '',
  owner: r.owner || '',
  bcNumber: r.bc_number || '',
  legalDescription: r.legal_description || '',
  ownerContactPerson: r.owner_contact_person || '',
  ownerMailingAddress: r.owner_mailing_address || '',
  ownerPhone: r.owner_phone || '',
  ownerEmail: r.owner_email || '',
  buildingWorkDescription: r.building_work_description || '',
  placeId: r.place_id || '',
  latitude: r.latitude ?? null,
  longitude: r.longitude ?? null,
  suburb: r.suburb || '',
  city: r.city || '',
  region: r.region || '',
  postalCode: r.postal_code || '',
  country: r.country || '',
  propertySnapshot: r.property_snapshot || null,
  driveFolderUrl: r.drive_folder_url || '',
  driveRootFolderId: r.drive_root_folder_id || '',
  teamMembers: r.team_members || [],
  startDate: r.start_date || '',
  targetCompletion: r.target_completion || '',
  currentStage: r.current_stage || 'feasibility',
  status: r.status || 'Active',
  description: r.description || '',
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const mapItem = r => ({
  id: r.id,
  projectId: r.project_id,
  stageId: r.stage_id,
  label: r.label,
  description: r.description || '',
  owner: r.owner || '',
  startDate: r.start_date || '',
  dueDate: r.due_date || '',
  status: r.status || 'not-started',
  priority: r.priority || 'medium',
  requiredToProgress: r.required_to_progress || false,
  isBlocker: r.is_blocker || false,
  done: r.done || false,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const mapMilestone = r => ({
  id: r.id,
  projectId: r.project_id,
  stageId: r.stage_id,
  label: r.label,
  date: r.date || '',
  complete: r.complete || false,
})

const mapActivity = r => ({
  id: r.id,
  projectId: r.project_id,
  action: r.action,
  detail: r.detail || '',
  user: r.actor || '',
  timestamp: r.occurred_at,
})

const mapDocument = r => ({
  id: r.id,
  projectId: r.project_id || '',
  name: r.name || r.title || r.filename || '',
  url: r.url || r.drive_url || r.file_url || '',
  category: r.category || 'other',
  notes: r.notes || '',
  addedBy: r.added_by || '',
  source: r.source || (r.drive_file_id || r.drive_url ? 'google_drive' : 'manual_link'),
  driveFileId: r.drive_file_id || '',
  driveUrl: r.drive_url || '',
  gmailMessageId: r.gmail_message_id || '',
  gmailThreadId: r.gmail_thread_id || '',
  createdAt: r.created_at,
})

const mapTeamMember = r => ({
  id: r.id,
  name: r.name,
  role: r.role || '',
  email: r.email || '',
  phone: r.phone || '',
})

const mapTask = r => ({
  id: r.id,
  projectId: r.project_id || '',
  title: r.title,
  description: r.description || '',
  assignee: r.assignee || '',
  dueDate: r.due_date || '',
  priority: r.priority || 'medium',
  status: r.status || 'open',
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const mapScheduleTask = r => ({
  id: r.id,
  projectId: r.project_id,
  name: r.name || '',
  phase: r.phase || '',
  assignee: r.assignee || '',
  startDate: r.start_date || '',
  endDate: r.end_date || '',
  actualStart: r.actual_start || '',
  actualEnd: r.actual_end || '',
  dependencyId: r.dependency_id || '',
  lagDays: r.lag_days ?? 0,
  internalOwner: r.internal_owner || '',
  isMilestone: r.is_milestone || false,
  notes: r.notes || '',
  durationDays: r.duration_days ?? null,
  status: r.status || 'not-started',
  progress: r.progress ?? 0,
  sortOrder: r.sort_order ?? 0,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const stripEnhancedScheduleColumns = row => {
  const {
    actual_start,
    actual_end,
    dependency_id,
    lag_days,
    internal_owner,
    is_milestone,
    notes,
    ...legacy
  } = row
  return legacy
}

const missingEnhancedScheduleColumn = error =>
  error?.code === 'PGRST204' ||
  /actual_start|actual_end|dependency_id|lag_days|internal_owner|is_milestone|notes/i.test(error?.message || '')

const stripEnhancedProjectColumns = row => {
  const {
    bc_number,
    legal_description,
    owner_contact_person,
    owner_mailing_address,
    owner_phone,
    owner_email,
    building_work_description,
    place_id,
    latitude,
    longitude,
    suburb,
    city,
    region,
    postal_code,
    country,
    property_snapshot,
    drive_folder_url,
    drive_root_folder_id,
    ...legacy
  } = row
  return legacy
}

const missingEnhancedProjectColumn = error =>
  error?.code === 'PGRST204' ||
  /bc_number|legal_description|owner_contact_person|owner_mailing_address|owner_phone|owner_email|building_work_description|place_id|latitude|longitude|suburb|city|region|postal_code|country|property_snapshot|drive_folder_url|drive_root_folder_id/i.test(error?.message || '')

const stripEnhancedDocumentColumns = row => {
  const { drive_file_id, drive_url, source, gmail_message_id, gmail_thread_id, ...legacy } = row
  return legacy
}

const missingEnhancedDocumentColumn = error =>
  error?.code === 'PGRST204' ||
  /drive_file_id|drive_url|source|gmail_message_id|gmail_thread_id/i.test(error?.message || '')

// ── Store ─────────────────────────────────────────────────────────────────────
const useStore = create((set, get) => ({
  projects: [],
  checklistItems: [],
  milestones: [],
  activityLog: [],
  documents: [],
  teamMembers: [],
  tasks: [],
  scheduleTasks: [],
  currentUser: localStorage.getItem('devman_current_user') || '',
  loading: true,
  error: null,

  // ── Boot: fetch all data + subscribe to real-time ──────────────────────────
  async initialize() {
    set({ loading: true, error: null })
    try {
      const [p, c, m, a, d, t] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('checklist_items').select('*'),
        supabase.from('milestones').select('*'),
        supabase.from('activity_log').select('*').order('occurred_at', { ascending: false }).limit(500),
        supabase.from('documents').select('*').order('created_at', { ascending: false }),
        supabase.from('team_members').select('*').order('name'),
      ])

      if (p.error) throw p.error
      if (c.error) throw c.error
      if (m.error) throw m.error
      if (a.error) throw a.error
      if (d.error) throw d.error
      if (t.error) throw t.error

      set({
        projects: p.data.map(mapProject),
        checklistItems: c.data.map(mapItem),
        milestones: m.data.map(mapMilestone),
        activityLog: a.data.map(mapActivity),
        documents: d.data.map(mapDocument),
        teamMembers: t.data.map(mapTeamMember),
        loading: false,
      })

      // New tables — load gracefully (tables may not exist yet)
      try {
        const [tr, sr] = await Promise.all([
          supabase.from('tasks').select('*').order('created_at', { ascending: false }),
          supabase.from('schedule_tasks').select('*').order('sort_order'),
        ])
        if (!tr.error) set({ tasks: tr.data.map(mapTask) })
        if (!sr.error) set({ scheduleTasks: sr.data.map(mapScheduleTask) })
      } catch {
        console.warn('tasks / schedule_tasks tables not yet created — run SQL in Supabase')
      }

      await supabase.removeAllChannels()
      get().subscribeToRealtime()
    } catch (err) {
      console.error('Init error:', err)
      set({ error: err.message, loading: false })
    }
  },

  // ── Real-time subscriptions ────────────────────────────────────────────────
  subscribeToRealtime() {
    supabase
      .channel('devman-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, payload => {
        const { eventType, new: row, old } = payload
        set(s => {
          if (eventType === 'INSERT') return { projects: [mapProject(row), ...s.projects] }
          if (eventType === 'UPDATE') return { projects: s.projects.map(p => p.id === row.id ? mapProject(row) : p) }
          if (eventType === 'DELETE') return { projects: s.projects.filter(p => p.id !== old.id) }
          return s
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_items' }, payload => {
        const { eventType, new: row, old } = payload
        set(s => {
          if (eventType === 'INSERT') return { checklistItems: [...s.checklistItems, mapItem(row)] }
          if (eventType === 'UPDATE') return { checklistItems: s.checklistItems.map(i => i.id === row.id ? mapItem(row) : i) }
          if (eventType === 'DELETE') return { checklistItems: s.checklistItems.filter(i => i.id !== old.id) }
          return s
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'milestones' }, payload => {
        const { eventType, new: row, old } = payload
        set(s => {
          if (eventType === 'INSERT') return { milestones: [...s.milestones, mapMilestone(row)] }
          if (eventType === 'UPDATE') return { milestones: s.milestones.map(m => m.id === row.id ? mapMilestone(row) : m) }
          if (eventType === 'DELETE') return { milestones: s.milestones.filter(m => m.id !== old.id) }
          return s
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_log' }, payload => {
        if (payload.eventType === 'INSERT') {
          set(s => ({ activityLog: [mapActivity(payload.new), ...s.activityLog].slice(0, 500) }))
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, payload => {
        const { eventType, new: row, old } = payload
        set(s => {
          if (eventType === 'INSERT') return { documents: [mapDocument(row), ...s.documents] }
          if (eventType === 'UPDATE') return { documents: s.documents.map(d => d.id === row.id ? mapDocument(row) : d) }
          if (eventType === 'DELETE') return { documents: s.documents.filter(d => d.id !== old.id) }
          return s
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, payload => {
        const { eventType, new: row, old } = payload
        set(s => {
          if (eventType === 'INSERT') return { teamMembers: [...s.teamMembers, mapTeamMember(row)] }
          if (eventType === 'UPDATE') return { teamMembers: s.teamMembers.map(m => m.id === row.id ? mapTeamMember(row) : m) }
          if (eventType === 'DELETE') return { teamMembers: s.teamMembers.filter(m => m.id !== old.id) }
          return s
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, payload => {
        const { eventType, new: row, old } = payload
        set(s => {
          if (eventType === 'INSERT') return { tasks: [mapTask(row), ...s.tasks] }
          if (eventType === 'UPDATE') return { tasks: s.tasks.map(t => t.id === row.id ? mapTask(row) : t) }
          if (eventType === 'DELETE') return { tasks: s.tasks.filter(t => t.id !== old.id) }
          return s
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_tasks' }, payload => {
        const { eventType, new: row, old } = payload
        set(s => {
          if (eventType === 'INSERT') return { scheduleTasks: [...s.scheduleTasks, mapScheduleTask(row)] }
          if (eventType === 'UPDATE') return { scheduleTasks: s.scheduleTasks.map(t => t.id === row.id ? mapScheduleTask(row) : t) }
          if (eventType === 'DELETE') return { scheduleTasks: s.scheduleTasks.filter(t => t.id !== old.id) }
          return s
        })
      })
      .subscribe()
  },

  // ── Current user ───────────────────────────────────────────────────────────
  setCurrentUser(name) {
    localStorage.setItem('devman_current_user', name)
    set({ currentUser: name })
  },

  // ── Projects ───────────────────────────────────────────────────────────────
  async addProject(data) {
    const id = genId()
    const now = new Date().toISOString()
    const row = {
      id,
      name: data.name,
      address: data.address || '',
      client_entity: data.clientEntity || '',
      owner: data.owner || '',
      bc_number: data.bcNumber || '',
      legal_description: data.legalDescription || '',
      owner_contact_person: data.ownerContactPerson || '',
      owner_mailing_address: data.ownerMailingAddress || '',
      owner_phone: data.ownerPhone || '',
      owner_email: data.ownerEmail || '',
      building_work_description: data.buildingWorkDescription || '',
      place_id: data.placeId || '',
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      suburb: data.suburb || '',
      city: data.city || '',
      region: data.region || '',
      postal_code: data.postalCode || '',
      country: data.country || '',
      property_snapshot: data.propertySnapshot || null,
      drive_folder_url: data.driveFolderUrl || '',
      drive_root_folder_id: data.driveRootFolderId || '',
      team_members: data.teamMembers || [],
      start_date: data.startDate || '',
      target_completion: data.targetCompletion || '',
      current_stage: data.currentStage || 'feasibility',
      status: data.status || 'Active',
      description: data.description || '',
      created_at: now,
      updated_at: now,
    }
    const project = mapProject(row)
    set(s => ({ projects: [project, ...s.projects] }))
    const { error } = await supabase.from('projects').insert(row)
    if (error) {
      if (missingEnhancedProjectColumn(error)) {
        const { error: fallbackError } = await supabase.from('projects').insert(stripEnhancedProjectColumns(row))
        if (!fallbackError) return project
        console.error('addProject fallback error:', fallbackError)
      }
      console.error('addProject error:', error)
      set(s => ({ projects: s.projects.filter(p => p.id !== id) }))
      return null
    }
    return project
  },

  async updateProject(id, data) {
    const updates = { updated_at: new Date().toISOString() }
    if (data.name !== undefined) updates.name = data.name
    if (data.address !== undefined) updates.address = data.address
    if (data.clientEntity !== undefined) updates.client_entity = data.clientEntity
    if (data.owner !== undefined) updates.owner = data.owner
    if (data.bcNumber !== undefined) updates.bc_number = data.bcNumber
    if (data.legalDescription !== undefined) updates.legal_description = data.legalDescription
    if (data.ownerContactPerson !== undefined) updates.owner_contact_person = data.ownerContactPerson
    if (data.ownerMailingAddress !== undefined) updates.owner_mailing_address = data.ownerMailingAddress
    if (data.ownerPhone !== undefined) updates.owner_phone = data.ownerPhone
    if (data.ownerEmail !== undefined) updates.owner_email = data.ownerEmail
    if (data.buildingWorkDescription !== undefined) updates.building_work_description = data.buildingWorkDescription
    if (data.placeId !== undefined) updates.place_id = data.placeId
    if (data.latitude !== undefined) updates.latitude = data.latitude
    if (data.longitude !== undefined) updates.longitude = data.longitude
    if (data.suburb !== undefined) updates.suburb = data.suburb
    if (data.city !== undefined) updates.city = data.city
    if (data.region !== undefined) updates.region = data.region
    if (data.postalCode !== undefined) updates.postal_code = data.postalCode
    if (data.country !== undefined) updates.country = data.country
    if (data.propertySnapshot !== undefined) updates.property_snapshot = data.propertySnapshot
    if (data.driveFolderUrl !== undefined) updates.drive_folder_url = data.driveFolderUrl
    if (data.driveRootFolderId !== undefined) updates.drive_root_folder_id = data.driveRootFolderId
    if (data.teamMembers !== undefined) updates.team_members = data.teamMembers
    if (data.startDate !== undefined) updates.start_date = data.startDate
    if (data.targetCompletion !== undefined) updates.target_completion = data.targetCompletion
    if (data.currentStage !== undefined) updates.current_stage = data.currentStage
    if (data.status !== undefined) updates.status = data.status
    if (data.description !== undefined) updates.description = data.description

    set(s => ({ projects: s.projects.map(p => p.id === id ? { ...p, ...data, updatedAt: updates.updated_at } : p) }))
    const { error } = await supabase.from('projects').update(updates).eq('id', id)
    if (error) {
      if (missingEnhancedProjectColumn(error)) {
        const { error: fallbackError } = await supabase.from('projects').update(stripEnhancedProjectColumns(updates)).eq('id', id)
        if (!fallbackError) return
        console.error('updateProject fallback error:', fallbackError)
      }
      console.error('updateProject error:', error)
    }
  },

  async deleteProject(id) {
    set(s => ({
      projects: s.projects.filter(p => p.id !== id),
      checklistItems: s.checklistItems.filter(i => i.projectId !== id),
      milestones: s.milestones.filter(m => m.projectId !== id),
      activityLog: s.activityLog.filter(a => a.projectId !== id),
      documents: s.documents.filter(d => d.projectId !== id),
      tasks: s.tasks.filter(t => t.projectId !== id),
      scheduleTasks: s.scheduleTasks.filter(t => t.projectId !== id),
    }))
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) console.error('deleteProject error:', error)
  },

  // ── Checklist Items ────────────────────────────────────────────────────────
  async addChecklistItem(data) {
    const id = genId()
    const now = new Date().toISOString()
    const row = {
      id,
      project_id: data.projectId,
      stage_id: data.stageId,
      label: data.label,
      description: data.description || '',
      owner: data.owner || '',
      due_date: data.dueDate || '',
      status: data.status || 'not-started',
      priority: data.priority || 'medium',
      required_to_progress: data.requiredToProgress || false,
      is_blocker: data.isBlocker || false,
      done: false,
      created_at: now,
      updated_at: now,
    }
    const item = mapItem(row)
    set(s => ({ checklistItems: [...s.checklistItems, item] }))
    const { error } = await supabase.from('checklist_items').insert(row)
    if (error) {
      console.error('addChecklistItem error:', error)
      set(s => ({ checklistItems: s.checklistItems.filter(i => i.id !== id) }))
    }
    return item
  },

  async addBatchChecklistItems(items) {
    const now = new Date().toISOString()
    const rows = items.map(item => ({
      id: genId(),
      project_id: item.projectId,
      stage_id: item.stageId,
      label: item.label,
      description: item.description || '',
      owner: item.owner || '',
      due_date: item.dueDate || '',
      status: 'not-started',
      priority: item.priority || 'medium',
      required_to_progress: item.requiredToProgress || false,
      is_blocker: item.isBlocker || false,
      done: false,
      created_at: now,
      updated_at: now,
    }))
    const mapped = rows.map(mapItem)
    set(s => ({ checklistItems: [...s.checklistItems, ...mapped] }))
    const { error } = await supabase.from('checklist_items').insert(rows)
    if (error) console.error('addBatchChecklistItems error:', error)
  },

  async updateChecklistItem(id, data) {
    const updates = { updated_at: new Date().toISOString() }
    if (data.label !== undefined) updates.label = data.label
    if (data.stageId !== undefined) updates.stage_id = data.stageId
    if (data.description !== undefined) updates.description = data.description
    if (data.owner !== undefined) updates.owner = data.owner
    if (data.startDate !== undefined) updates.start_date = data.startDate
    if (data.dueDate !== undefined) updates.due_date = data.dueDate
    if (data.status !== undefined) updates.status = data.status
    if (data.priority !== undefined) updates.priority = data.priority
    if (data.requiredToProgress !== undefined) updates.required_to_progress = data.requiredToProgress
    if (data.isBlocker !== undefined) updates.is_blocker = data.isBlocker
    if (data.done !== undefined) updates.done = data.done

    set(s => ({
      checklistItems: s.checklistItems.map(i =>
        i.id === id ? { ...i, ...data, updatedAt: updates.updated_at } : i
      ),
    }))
    const { error } = await supabase.from('checklist_items').update(updates).eq('id', id)
    if (error) console.error('updateChecklistItem error:', error)
  },

  async deleteChecklistItem(id) {
    set(s => ({ checklistItems: s.checklistItems.filter(i => i.id !== id) }))
    const { error } = await supabase.from('checklist_items').delete().eq('id', id)
    if (error) console.error('deleteChecklistItem error:', error)
  },

  async toggleChecklistItem(id, projectId) {
    const item = get().checklistItems.find(i => i.id === id)
    if (!item) return
    const done = !item.done
    const status = done ? 'complete' : 'not-started'
    const now = new Date().toISOString()
    set(s => ({
      checklistItems: s.checklistItems.map(i =>
        i.id === id ? { ...i, done, status, updatedAt: now } : i
      ),
    }))
    const { error } = await supabase
      .from('checklist_items')
      .update({ done, status, updated_at: now })
      .eq('id', id)
    if (error) {
      set(s => ({
        checklistItems: s.checklistItems.map(i =>
          i.id === id ? { ...i, done: !done, status: item.status } : i
        ),
      }))
      console.error('toggleChecklistItem error:', error)
      return
    }
    get().logActivity(projectId, done ? 'Item completed' : 'Item unchecked', item.label)
  },

  // ── Milestones ─────────────────────────────────────────────────────────────
  async addMilestone(data) {
    const id = genId()
    const row = {
      id,
      project_id: data.projectId,
      stage_id: data.stageId || '',
      label: data.label,
      date: data.date || '',
      complete: false,
    }
    const ms = mapMilestone(row)
    set(s => ({ milestones: [...s.milestones, ms] }))
    const { error } = await supabase.from('milestones').insert(row)
    if (error) {
      console.error('addMilestone error:', error)
      set(s => ({ milestones: s.milestones.filter(m => m.id !== id) }))
    }
    return ms
  },

  async deleteMilestone(id) {
    set(s => ({ milestones: s.milestones.filter(m => m.id !== id) }))
    const { error } = await supabase.from('milestones').delete().eq('id', id)
    if (error) console.error('deleteMilestone error:', error)
  },

  async addBatchMilestones(milestones) {
    const rows = milestones.map(m => ({
      id: genId(),
      project_id: m.projectId,
      stage_id: m.stageId,
      label: m.label,
      date: '',
      complete: false,
    }))
    const mapped = rows.map(mapMilestone)
    set(s => ({ milestones: [...s.milestones, ...mapped] }))
    const { error } = await supabase.from('milestones').insert(rows)
    if (error) console.error('addBatchMilestones error:', error)
  },

  async updateMilestone(id, data) {
    const updates = {}
    if (data.date !== undefined) updates.date = data.date
    if (data.complete !== undefined) updates.complete = data.complete
    if (data.label !== undefined) updates.label = data.label
    set(s => ({ milestones: s.milestones.map(m => m.id === id ? { ...m, ...data } : m) }))
    const { error } = await supabase.from('milestones').update(updates).eq('id', id)
    if (error) console.error('updateMilestone error:', error)
  },

  // ── Tasks ──────────────────────────────────────────────────────────────────
  async addTask(data) {
    const id = genId()
    const now = new Date().toISOString()
    const row = {
      id,
      project_id: data.projectId || null,
      title: data.title,
      description: data.description || '',
      assignee: data.assignee || '',
      due_date: data.dueDate || null,
      priority: data.priority || 'medium',
      status: data.status || 'open',
      created_at: now,
      updated_at: now,
    }
    const task = mapTask(row)
    set(s => ({ tasks: [task, ...s.tasks] }))
    const { error } = await supabase.from('tasks').insert(row)
    if (error) {
      console.error('addTask error:', error)
      set(s => ({ tasks: s.tasks.filter(t => t.id !== id) }))
    }
    return task
  },

  async updateTask(id, data) {
    const updates = { updated_at: new Date().toISOString() }
    if (data.title !== undefined) updates.title = data.title
    if (data.description !== undefined) updates.description = data.description
    if (data.assignee !== undefined) updates.assignee = data.assignee
    if (data.dueDate !== undefined) updates.due_date = data.dueDate || null
    if (data.priority !== undefined) updates.priority = data.priority
    if (data.status !== undefined) updates.status = data.status
    if (data.projectId !== undefined) updates.project_id = data.projectId || null
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...data } : t) }))
    const { error } = await supabase.from('tasks').update(updates).eq('id', id)
    if (error) console.error('updateTask error:', error)
  },

  async deleteTask(id) {
    set(s => ({ tasks: s.tasks.filter(t => t.id !== id) }))
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) console.error('deleteTask error:', error)
  },

  // ── Schedule Tasks ─────────────────────────────────────────────────────────
  async addScheduleTask(data) {
    const id = genId()
    const now = new Date().toISOString()
    const phaseCount = get().scheduleTasks.filter(t => t.projectId === data.projectId && t.phase === (data.phase || '')).length
    const row = {
      id,
      project_id: data.projectId,
      name: data.name || '',
      phase: data.phase || '',
      assignee: data.assignee || '',
      start_date: data.startDate || null,
      end_date: data.endDate || null,
      actual_start: data.actualStart || null,
      actual_end: data.actualEnd || null,
      dependency_id: data.dependencyId || null,
      lag_days: data.lagDays ?? 0,
      internal_owner: data.internalOwner || '',
      is_milestone: data.isMilestone || false,
      notes: data.notes || '',
      duration_days: data.durationDays ?? null,
      status: data.status || 'not-started',
      progress: data.progress ?? 0,
      sort_order: data.sortOrder ?? phaseCount,
      created_at: now,
      updated_at: now,
    }
    const task = mapScheduleTask(row)
    set(s => ({ scheduleTasks: [...s.scheduleTasks, task] }))
    const { error } = await supabase.from('schedule_tasks').insert(row)
    if (error) {
      if (missingEnhancedScheduleColumn(error)) {
        const { error: fallbackError } = await supabase.from('schedule_tasks').insert(stripEnhancedScheduleColumns(row))
        if (!fallbackError) return task
        console.error('addScheduleTask fallback error:', fallbackError)
      }
      console.error('addScheduleTask error:', error)
      set(s => ({ scheduleTasks: s.scheduleTasks.filter(t => t.id !== id) }))
    }
    return task
  },

  async updateScheduleTask(id, data) {
    const updates = { updated_at: new Date().toISOString() }
    if (data.name !== undefined) updates.name = data.name
    if (data.phase !== undefined) updates.phase = data.phase
    if (data.assignee !== undefined) updates.assignee = data.assignee
    if (data.startDate !== undefined) updates.start_date = data.startDate || null
    if (data.endDate !== undefined) updates.end_date = data.endDate || null
    if (data.actualStart !== undefined) updates.actual_start = data.actualStart || null
    if (data.actualEnd !== undefined) updates.actual_end = data.actualEnd || null
    if (data.dependencyId !== undefined) updates.dependency_id = data.dependencyId || null
    if (data.lagDays !== undefined) updates.lag_days = data.lagDays ?? 0
    if (data.internalOwner !== undefined) updates.internal_owner = data.internalOwner
    if (data.isMilestone !== undefined) updates.is_milestone = data.isMilestone
    if (data.notes !== undefined) updates.notes = data.notes
    if (data.durationDays !== undefined) updates.duration_days = data.durationDays ?? null
    if (data.status !== undefined) updates.status = data.status
    if (data.progress !== undefined) updates.progress = data.progress
    if (data.sortOrder !== undefined) updates.sort_order = data.sortOrder
    set(s => ({ scheduleTasks: s.scheduleTasks.map(t => t.id === id ? { ...t, ...data } : t) }))
    const { error } = await supabase.from('schedule_tasks').update(updates).eq('id', id)
    if (error) {
      if (missingEnhancedScheduleColumn(error)) {
        const { error: fallbackError } = await supabase.from('schedule_tasks').update(stripEnhancedScheduleColumns(updates)).eq('id', id)
        if (!fallbackError) return
        console.error('updateScheduleTask fallback error:', fallbackError)
      }
      console.error('updateScheduleTask error:', error)
    }
  },

  async deleteScheduleTask(id) {
    set(s => ({ scheduleTasks: s.scheduleTasks.filter(t => t.id !== id) }))
    const { error } = await supabase.from('schedule_tasks').delete().eq('id', id)
    if (error) console.error('deleteScheduleTask error:', error)
  },

  async renamePhase(projectId, oldPhase, newPhase) {
    // Rename all tasks in a phase
    const affected = get().scheduleTasks.filter(t => t.projectId === projectId && t.phase === oldPhase)
    set(s => ({ scheduleTasks: s.scheduleTasks.map(t => t.projectId === projectId && t.phase === oldPhase ? { ...t, phase: newPhase } : t) }))
    await Promise.all(affected.map(t => supabase.from('schedule_tasks').update({ phase: newPhase }).eq('id', t.id)))
  },

  // ── Documents ─────────────────────────────────────────────────────────────
  async addDocument(data) {
    const id = genId()
    const row = {
      id,
      project_id: data.projectId || null,
      name: data.name,
      url: data.url || '',
      category: data.category || 'other',
      notes: data.notes || '',
      added_by: data.addedBy || '',
      source: data.source || (data.url?.includes('drive.google.com') ? 'google_drive' : 'manual_link'),
      drive_url: data.driveUrl || (data.url?.includes('drive.google.com') ? data.url : ''),
      drive_file_id: data.driveFileId || '',
      gmail_message_id: data.gmailMessageId || '',
      gmail_thread_id: data.gmailThreadId || '',
    }
    const doc = mapDocument({ ...row, created_at: new Date().toISOString() })
    set(s => ({ documents: [doc, ...s.documents] }))
    const { error } = await supabase.from('documents').insert(row)
    if (error) {
      if (missingEnhancedDocumentColumn(error)) {
        const { error: fallbackError } = await supabase.from('documents').insert(stripEnhancedDocumentColumns(row))
        if (!fallbackError) return doc
        console.error('addDocument fallback error:', fallbackError)
      }
      console.error('addDocument error:', error)
      set(s => ({ documents: s.documents.filter(d => d.id !== id) }))
    }
    return doc
  },

  async updateDocument(id, data) {
    const updates = {}
    if (data.name !== undefined) updates.name = data.name
    if (data.url !== undefined) updates.url = data.url
    if (data.projectId !== undefined) updates.project_id = data.projectId || null
    if (data.category !== undefined) updates.category = data.category
    if (data.notes !== undefined) updates.notes = data.notes
    if (data.source !== undefined) updates.source = data.source
    if (data.driveUrl !== undefined) updates.drive_url = data.driveUrl
    if (data.driveFileId !== undefined) updates.drive_file_id = data.driveFileId
    if (data.gmailMessageId !== undefined) updates.gmail_message_id = data.gmailMessageId
    if (data.gmailThreadId !== undefined) updates.gmail_thread_id = data.gmailThreadId
    set(s => ({ documents: s.documents.map(d => d.id === id ? { ...d, ...data } : d) }))
    const { error } = await supabase.from('documents').update(updates).eq('id', id)
    if (error) {
      if (missingEnhancedDocumentColumn(error)) {
        const { error: fallbackError } = await supabase.from('documents').update(stripEnhancedDocumentColumns(updates)).eq('id', id)
        if (!fallbackError) return
        console.error('updateDocument fallback error:', fallbackError)
      }
      console.error('updateDocument error:', error)
    }
  },

  async deleteDocument(id) {
    set(s => ({ documents: s.documents.filter(d => d.id !== id) }))
    const { error } = await supabase.from('documents').delete().eq('id', id)
    if (error) console.error('deleteDocument error:', error)
  },

  // ── Team Members ──────────────────────────────────────────────────────────
  async addTeamMember(data) {
    const id = genId()
    const row = { id, name: data.name, role: data.role || '', email: data.email || '', phone: data.phone || '' }
    const member = mapTeamMember(row)
    set(s => ({ teamMembers: [...s.teamMembers, member] }))
    const { error } = await supabase.from('team_members').insert(row)
    if (error) {
      console.error('addTeamMember error:', error)
      set(s => ({ teamMembers: s.teamMembers.filter(m => m.id !== id) }))
    }
    return member
  },

  async updateTeamMember(id, data) {
    const updates = {}
    if (data.name !== undefined) updates.name = data.name
    if (data.role !== undefined) updates.role = data.role
    if (data.email !== undefined) updates.email = data.email
    if (data.phone !== undefined) updates.phone = data.phone
    set(s => ({ teamMembers: s.teamMembers.map(m => m.id === id ? { ...m, ...data } : m) }))
    const { error } = await supabase.from('team_members').update(updates).eq('id', id)
    if (error) console.error('updateTeamMember error:', error)
  },

  async deleteTeamMember(id) {
    set(s => ({ teamMembers: s.teamMembers.filter(m => m.id !== id) }))
    const { error } = await supabase.from('team_members').delete().eq('id', id)
    if (error) console.error('deleteTeamMember error:', error)
  },

  // ── Activity Log ───────────────────────────────────────────────────────────
  async logActivity(projectId, action, detail, user = '') {
    const id = genId()
    const entry = { id, projectId, action, detail, user, timestamp: new Date().toISOString() }
    set(s => ({ activityLog: [entry, ...s.activityLog].slice(0, 500) }))
    const { error } = await supabase.from('activity_log').insert({
      id,
      project_id: projectId,
      action,
      detail,
      actor: user,
    })
    if (error) console.error('logActivity error:', error)
  },
}))

export default useStore
