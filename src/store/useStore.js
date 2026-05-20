import { create } from 'zustand'
import { supabase } from '../lib/supabase'

// ── ID generator ─────────────────────────────────────────────────────────────
const genId = () => crypto.randomUUID()

// ── Row mappers (snake_case DB → camelCase app) ───────────────────────────────
const mapProfile = r => ({
  id: r.id,
  email: r.email || '',
  name: r.name || r.email || 'Team member',
  role: r.role || 'member',
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

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
  propertyProfileId: r.property_profile_id || '',
  driveFolderUrl: r.drive_folder_url || '',
  driveRootFolderId: r.drive_root_folder_id || '',
  teamMembers: r.team_members || [],
  startDate: r.start_date || '',
  targetCompletion: r.target_completion || '',
  currentStage: r.current_stage || 'feasibility',
  activeStageIds: Array.isArray(r.active_stage_ids) ? r.active_stage_ids : [r.current_stage || 'feasibility'],
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
  stageId: r.stage_id || '',
  name: r.name || r.title || r.filename || '',
  url: r.url || r.drive_url || r.file_url || '',
  category: r.category || 'other',
  notes: r.notes || '',
  addedBy: r.added_by || '',
  source: r.source || (r.drive_file_id || r.drive_url ? 'google_drive' : 'manual_link'),
  storagePath: r.storage_path || '',
  fileName: r.file_name || '',
  mimeType: r.mime_type || '',
  fileSize: r.file_size ?? null,
  uploadedBy: r.uploaded_by || '',
  driveFileId: r.drive_file_id || '',
  driveUrl: r.drive_url || '',
  gmailMessageId: r.gmail_message_id || '',
  gmailThreadId: r.gmail_thread_id || '',
  revision: r.revision || '',
  drawingNumber: r.drawing_number || '',
  discipline: r.discipline || '',
  issuedFor: r.issued_for || '',
  documentStatus: r.document_status || 'current',
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
  projectContactId: r.project_contact_id || '',
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

const mapCalendarEvent = r => ({
  id: r.id,
  projectId: r.project_id || '',
  stageId: r.stage_id || '',
  title: r.title || '',
  eventDate: r.event_date || '',
  eventType: r.event_type || 'event',
  notes: r.notes || '',
  createdBy: r.created_by || '',
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const mapCompany = r => ({
  id: r.id,
  name: r.name || '',
  type: r.type || '',
  phone: r.phone || '',
  email: r.email || '',
  website: r.website || '',
  address: r.address || '',
  notes: r.notes || '',
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const mapContact = r => ({
  id: r.id,
  companyId: r.company_id || '',
  name: r.name || '',
  title: r.title || '',
  email: r.email || '',
  phone: r.phone || '',
  notes: r.notes || '',
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const mapProjectContact = r => ({
  id: r.id,
  projectId: r.project_id || '',
  companyId: r.company_id || '',
  contactId: r.contact_id || '',
  projectRole: r.project_role || '',
  discipline: r.discipline || '',
  stageIds: Array.isArray(r.stage_ids) ? r.stage_ids : [],
  status: r.status || 'active',
  isPrimary: Boolean(r.is_primary),
  notes: r.notes || '',
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const mapDailyLog = r => ({
  id: r.id,
  projectId: r.project_id || '',
  logDate: r.log_date || '',
  summary: r.summary || '',
  workCompleted: r.work_completed || '',
  blockers: r.blockers || '',
  nextSteps: r.next_steps || '',
  weather: r.weather || '',
  createdBy: r.created_by || '',
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const mapScheduleTemplate = r => ({
  id: r.id,
  name: r.name || '',
  description: r.description || '',
  isDefault: Boolean(r.is_default),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const mapScheduleTemplateItem = r => ({
  id: r.id,
  templateId: r.template_id,
  phase: r.phase || '',
  name: r.name || '',
  offsetDays: r.offset_days ?? 0,
  durationDays: r.duration_days ?? 1,
  isMilestone: Boolean(r.is_milestone),
  dependencyKey: r.dependency_key || '',
  notes: r.notes || '',
  sortOrder: r.sort_order ?? 0,
})

const mapPropertyProfile = r => ({
  id: r.id,
  projectId: r.project_id || '',
  address: r.address || '',
  formattedAddress: r.formatted_address || '',
  placeId: r.place_id || '',
  latitude: r.latitude ?? null,
  longitude: r.longitude ?? null,
  suburb: r.suburb || '',
  city: r.city || '',
  region: r.region || '',
  postalCode: r.postal_code || '',
  country: r.country || 'New Zealand',
  sourceStatus: r.source_status || {},
  titleSummary: r.title_summary || {},
  parcelSummary: r.parcel_summary || {},
  councilSummary: r.council_summary || {},
  zoningSummary: r.zoning_summary || {},
  hazardSummary: r.hazard_summary || {},
  servicesSummary: r.services_summary || {},
  valuationSummary: r.valuation_summary || {},
  demographicsSummary: r.demographics_summary || {},
  mapLinks: r.map_links || {},
  rawPayload: r.raw_payload || {},
  lastRefreshedAt: r.last_refreshed_at || '',
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const mapPropertyLayer = r => ({
  id: r.id,
  projectId: r.project_id || '',
  profileId: r.profile_id || '',
  layerType: r.layer_type || '',
  name: r.name || '',
  source: r.source || '',
  sourceUrl: r.source_url || '',
  confidence: r.confidence || 'not available',
  geometry: r.geometry || null,
  attributes: r.attributes || {},
  capturedAt: r.captured_at || '',
  createdAt: r.created_at,
})

const mapPropertySourceRun = r => ({
  id: r.id,
  projectId: r.project_id || '',
  profileId: r.profile_id || '',
  source: r.source || '',
  status: r.status || 'not available',
  message: r.message || '',
  request: r.request || {},
  response: r.response || {},
  createdAt: r.created_at,
})

const mapDocumentShare = r => ({
  id: r.id,
  token: r.token || '',
  projectId: r.project_id || '',
  documentIds: Array.isArray(r.document_ids) ? r.document_ids : [],
  documentSnapshot: Array.isArray(r.document_snapshot) ? r.document_snapshot : [],
  title: r.title || '',
  expiresAt: r.expires_at || '',
  revokedAt: r.revoked_at || '',
  createdBy: r.created_by || '',
  accessCount: r.access_count ?? 0,
  lastAccessedAt: r.last_accessed_at || '',
  createdAt: r.created_at,
})

const mapAiActionDraft = r => ({
  id: r.id,
  projectId: r.project_id || '',
  actionType: r.action_type || '',
  title: r.title || '',
  rationale: r.rationale || '',
  payload: r.payload || {},
  status: r.status || 'pending',
  createdBy: r.created_by || '',
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  appliedAt: r.applied_at || '',
  dismissedAt: r.dismissed_at || '',
})

const stripEnhancedScheduleColumns = row => {
  const {
    actual_start,
    actual_end,
    dependency_id,
    project_contact_id,
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
  /actual_start|actual_end|dependency_id|project_contact_id|lag_days|internal_owner|is_milestone|notes/i.test(error?.message || '')

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
    property_profile_id,
    drive_folder_url,
    drive_root_folder_id,
    active_stage_ids,
    ...legacy
  } = row
  return legacy
}

const missingEnhancedProjectColumn = error =>
  error?.code === 'PGRST204' ||
  /bc_number|legal_description|owner_contact_person|owner_mailing_address|owner_phone|owner_email|building_work_description|place_id|latitude|longitude|suburb|city|region|postal_code|country|property_snapshot|property_profile_id|drive_folder_url|drive_root_folder_id|active_stage_ids/i.test(error?.message || '')

const stripEnhancedDocumentColumns = row => {
  const {
    drive_file_id,
    drive_url,
    source,
    gmail_message_id,
    gmail_thread_id,
    stage_id,
    storage_path,
    file_name,
    mime_type,
    file_size,
    uploaded_by,
    revision,
    drawing_number,
    discipline,
    issued_for,
    document_status,
    ...legacy
  } = row
  return legacy
}

const missingEnhancedDocumentColumn = error =>
  error?.code === 'PGRST204' ||
  /drive_file_id|drive_url|source|gmail_message_id|gmail_thread_id|stage_id|storage_path|file_name|mime_type|file_size|uploaded_by|revision|drawing_number|discipline|issued_for|document_status/i.test(error?.message || '')

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
  calendarEvents: [],
  companies: [],
  contacts: [],
  projectContacts: [],
  dailyLogs: [],
  scheduleTemplates: [],
  scheduleTemplateItems: [],
  propertyProfiles: [],
  propertyLayers: [],
  propertySourceRuns: [],
  documentShares: [],
  aiActionDrafts: [],
  sessionUser: null,
  profile: null,
  currentUser: localStorage.getItem('devman_current_user') || '',
  loading: true,
  error: null,

  reset() {
    set({
      projects: [],
      checklistItems: [],
      milestones: [],
      activityLog: [],
      documents: [],
      teamMembers: [],
      tasks: [],
      scheduleTasks: [],
      calendarEvents: [],
      companies: [],
      contacts: [],
      projectContacts: [],
      dailyLogs: [],
      scheduleTemplates: [],
      scheduleTemplateItems: [],
      propertyProfiles: [],
      propertyLayers: [],
      propertySourceRuns: [],
      documentShares: [],
      aiActionDrafts: [],
      sessionUser: null,
      profile: null,
      currentUser: '',
      loading: false,
      error: null,
    })
  },

  async ensureProfile(user) {
    if (!user) return null
    const fallback = {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'Team member',
      role: 'member',
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (error) throw error
      if (data) {
        const profile = mapProfile(data)
        set({ profile, currentUser: profile.name || profile.email })
        return profile
      }

      const row = {
        id: user.id,
        email: fallback.email,
        name: fallback.name,
        role: 'member',
      }
      const { data: inserted, error: insertError } = await supabase
        .from('profiles')
        .upsert(row)
        .select()
        .single()
      if (insertError) throw insertError
      const profile = mapProfile(inserted)
      set({ profile, currentUser: profile.name || profile.email })
      return profile
    } catch (error) {
      console.warn('profiles table not ready; using auth user fallback', error)
      set({ profile: fallback, currentUser: fallback.name || fallback.email })
      return fallback
    }
  },

  // ── Boot: fetch all data + subscribe to real-time ──────────────────────────
  async initialize(user) {
    set({ loading: true, error: null, sessionUser: user || null })
    try {
      if (user) await get().ensureProfile(user)

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
        const [tr, sr, ev, co, ct, pc, dl, st, sti, pp, pl, psr, ds, aid] = await Promise.all([
          supabase.from('tasks').select('*').order('created_at', { ascending: false }),
          supabase.from('schedule_tasks').select('*').order('sort_order'),
          supabase.from('calendar_events').select('*').order('event_date'),
          supabase.from('companies').select('*').order('name'),
          supabase.from('contacts').select('*').order('name'),
          supabase.from('project_contacts').select('*').order('created_at', { ascending: false }),
          supabase.from('daily_logs').select('*').order('log_date', { ascending: false }),
          supabase.from('schedule_templates').select('*').order('name'),
          supabase.from('schedule_template_items').select('*').order('sort_order'),
          supabase.from('property_profiles').select('*').order('updated_at', { ascending: false }),
          supabase.from('property_layers').select('*').order('created_at', { ascending: false }),
          supabase.from('property_source_runs').select('*').order('created_at', { ascending: false }).limit(500),
          supabase.from('document_shares').select('*').order('created_at', { ascending: false }),
          supabase.from('ai_action_drafts').select('*').order('created_at', { ascending: false }),
        ])
        if (!tr.error) set({ tasks: tr.data.map(mapTask) })
        if (!sr.error) set({ scheduleTasks: sr.data.map(mapScheduleTask) })
        if (!ev.error) set({ calendarEvents: ev.data.map(mapCalendarEvent) })
        if (!co.error) set({ companies: co.data.map(mapCompany) })
        if (!ct.error) set({ contacts: ct.data.map(mapContact) })
        if (!pc.error) set({ projectContacts: pc.data.map(mapProjectContact) })
        if (!dl.error) set({ dailyLogs: dl.data.map(mapDailyLog) })
        if (!st.error) set({ scheduleTemplates: st.data.map(mapScheduleTemplate) })
        if (!sti.error) set({ scheduleTemplateItems: sti.data.map(mapScheduleTemplateItem) })
        if (!pp.error) set({ propertyProfiles: pp.data.map(mapPropertyProfile) })
        if (!pl.error) set({ propertyLayers: pl.data.map(mapPropertyLayer) })
        if (!psr.error) set({ propertySourceRuns: psr.data.map(mapPropertySourceRun) })
        if (!ds.error) set({ documentShares: ds.data.map(mapDocumentShare) })
        if (!aid.error) set({ aiActionDrafts: aid.data.map(mapAiActionDraft) })
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, payload => {
        const { eventType, new: row, old } = payload
        set(s => {
          if (eventType === 'INSERT') return { calendarEvents: [...s.calendarEvents, mapCalendarEvent(row)] }
          if (eventType === 'UPDATE') return { calendarEvents: s.calendarEvents.map(item => item.id === row.id ? mapCalendarEvent(row) : item) }
          if (eventType === 'DELETE') return { calendarEvents: s.calendarEvents.filter(item => item.id !== old.id) }
          return s
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, payload => {
        const { eventType, new: row, old } = payload
        set(s => {
          if (eventType === 'INSERT') return { companies: [...s.companies, mapCompany(row)].sort((a, b) => a.name.localeCompare(b.name)) }
          if (eventType === 'UPDATE') return { companies: s.companies.map(item => item.id === row.id ? mapCompany(row) : item).sort((a, b) => a.name.localeCompare(b.name)) }
          if (eventType === 'DELETE') return { companies: s.companies.filter(item => item.id !== old.id) }
          return s
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, payload => {
        const { eventType, new: row, old } = payload
        set(s => {
          if (eventType === 'INSERT') return { contacts: [...s.contacts, mapContact(row)].sort((a, b) => a.name.localeCompare(b.name)) }
          if (eventType === 'UPDATE') return { contacts: s.contacts.map(item => item.id === row.id ? mapContact(row) : item).sort((a, b) => a.name.localeCompare(b.name)) }
          if (eventType === 'DELETE') return { contacts: s.contacts.filter(item => item.id !== old.id) }
          return s
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_contacts' }, payload => {
        const { eventType, new: row, old } = payload
        set(s => {
          if (eventType === 'INSERT') return { projectContacts: [mapProjectContact(row), ...s.projectContacts] }
          if (eventType === 'UPDATE') return { projectContacts: s.projectContacts.map(item => item.id === row.id ? mapProjectContact(row) : item) }
          if (eventType === 'DELETE') return { projectContacts: s.projectContacts.filter(item => item.id !== old.id) }
          return s
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_logs' }, payload => {
        const { eventType, new: row, old } = payload
        set(s => {
          if (eventType === 'INSERT') return { dailyLogs: [mapDailyLog(row), ...s.dailyLogs] }
          if (eventType === 'UPDATE') return { dailyLogs: s.dailyLogs.map(item => item.id === row.id ? mapDailyLog(row) : item) }
          if (eventType === 'DELETE') return { dailyLogs: s.dailyLogs.filter(item => item.id !== old.id) }
          return s
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'property_profiles' }, payload => {
        const { eventType, new: row, old } = payload
        set(s => {
          if (eventType === 'INSERT') return { propertyProfiles: [mapPropertyProfile(row), ...s.propertyProfiles.filter(item => item.id !== row.id)] }
          if (eventType === 'UPDATE') return { propertyProfiles: s.propertyProfiles.map(item => item.id === row.id ? mapPropertyProfile(row) : item) }
          if (eventType === 'DELETE') return { propertyProfiles: s.propertyProfiles.filter(item => item.id !== old.id) }
          return s
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'property_layers' }, payload => {
        const { eventType, new: row, old } = payload
        set(s => {
          if (eventType === 'INSERT') return { propertyLayers: [mapPropertyLayer(row), ...s.propertyLayers] }
          if (eventType === 'UPDATE') return { propertyLayers: s.propertyLayers.map(item => item.id === row.id ? mapPropertyLayer(row) : item) }
          if (eventType === 'DELETE') return { propertyLayers: s.propertyLayers.filter(item => item.id !== old.id) }
          return s
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'property_source_runs' }, payload => {
        if (payload.eventType === 'INSERT') {
          set(s => ({ propertySourceRuns: [mapPropertySourceRun(payload.new), ...s.propertySourceRuns].slice(0, 500) }))
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_shares' }, payload => {
        const { eventType, new: row, old } = payload
        set(s => {
          if (eventType === 'INSERT') return { documentShares: [mapDocumentShare(row), ...s.documentShares] }
          if (eventType === 'UPDATE') return { documentShares: s.documentShares.map(item => item.id === row.id ? mapDocumentShare(row) : item) }
          if (eventType === 'DELETE') return { documentShares: s.documentShares.filter(item => item.id !== old.id) }
          return s
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_action_drafts' }, payload => {
        const { eventType, new: row, old } = payload
        set(s => {
          if (eventType === 'INSERT') return { aiActionDrafts: [mapAiActionDraft(row), ...s.aiActionDrafts] }
          if (eventType === 'UPDATE') return { aiActionDrafts: s.aiActionDrafts.map(item => item.id === row.id ? mapAiActionDraft(row) : item) }
          if (eventType === 'DELETE') return { aiActionDrafts: s.aiActionDrafts.filter(item => item.id !== old.id) }
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
      property_profile_id: data.propertyProfileId || '',
      drive_folder_url: data.driveFolderUrl || '',
      drive_root_folder_id: data.driveRootFolderId || '',
      team_members: data.teamMembers || [],
      start_date: data.startDate || '',
      target_completion: data.targetCompletion || '',
      current_stage: data.currentStage || 'feasibility',
      active_stage_ids: data.activeStageIds || [data.currentStage || 'feasibility'],
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
    if (data.propertyProfileId !== undefined) updates.property_profile_id = data.propertyProfileId
    if (data.driveFolderUrl !== undefined) updates.drive_folder_url = data.driveFolderUrl
    if (data.driveRootFolderId !== undefined) updates.drive_root_folder_id = data.driveRootFolderId
    if (data.teamMembers !== undefined) updates.team_members = data.teamMembers
    if (data.startDate !== undefined) updates.start_date = data.startDate
    if (data.targetCompletion !== undefined) updates.target_completion = data.targetCompletion
    if (data.currentStage !== undefined) updates.current_stage = data.currentStage
    if (data.activeStageIds !== undefined) updates.active_stage_ids = data.activeStageIds
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
      calendarEvents: s.calendarEvents.filter(t => t.projectId !== id),
      projectContacts: s.projectContacts.filter(t => t.projectId !== id),
      dailyLogs: s.dailyLogs.filter(t => t.projectId !== id),
      propertyProfiles: s.propertyProfiles.filter(t => t.projectId !== id),
      propertyLayers: s.propertyLayers.filter(t => t.projectId !== id),
      propertySourceRuns: s.propertySourceRuns.filter(t => t.projectId !== id),
      documentShares: s.documentShares.filter(t => t.projectId !== id),
      aiActionDrafts: s.aiActionDrafts.filter(t => t.projectId !== id),
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

  async updateBatchTasks(ids, data) {
    if (!ids.length) return
    const updates = { updated_at: new Date().toISOString() }
    if (data.assignee !== undefined) updates.assignee = data.assignee
    if (data.status !== undefined) updates.status = data.status
    if (data.priority !== undefined) updates.priority = data.priority
    if (data.dueDate !== undefined) updates.due_date = data.dueDate || null
    set(s => ({ tasks: s.tasks.map(t => ids.includes(t.id) ? { ...t, ...data, updatedAt: updates.updated_at } : t) }))
    const { error } = await supabase.from('tasks').update(updates).in('id', ids)
    if (error) console.error('updateBatchTasks error:', error)
  },

  async deleteBatchTasks(ids) {
    if (!ids.length) return
    set(s => ({ tasks: s.tasks.filter(t => !ids.includes(t.id)) }))
    const { error } = await supabase.from('tasks').delete().in('id', ids)
    if (error) console.error('deleteBatchTasks error:', error)
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
      project_contact_id: data.projectContactId || null,
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

  async addBatchScheduleTasks(tasks) {
    const now = new Date().toISOString()
    const rows = tasks.map((task, index) => ({
      id: genId(),
      project_id: task.projectId,
      name: task.name || '',
      phase: task.phase || '',
      assignee: task.assignee || '',
      start_date: task.startDate || null,
      end_date: task.endDate || null,
      actual_start: task.actualStart || null,
      actual_end: task.actualEnd || null,
      dependency_id: task.dependencyId || null,
      project_contact_id: task.projectContactId || null,
      lag_days: task.lagDays ?? 0,
      internal_owner: task.internalOwner || '',
      is_milestone: task.isMilestone || false,
      notes: task.notes || '',
      duration_days: task.durationDays ?? null,
      status: task.status || 'not-started',
      progress: task.progress ?? 0,
      sort_order: task.sortOrder ?? index,
      created_at: now,
      updated_at: now,
    }))
    if (!rows.length) return []
    const mapped = rows.map(mapScheduleTask)
    set(s => ({ scheduleTasks: [...s.scheduleTasks, ...mapped] }))
    const { error } = await supabase.from('schedule_tasks').insert(rows)
    if (error) {
      if (missingEnhancedScheduleColumn(error)) {
        const { error: fallbackError } = await supabase.from('schedule_tasks').insert(rows.map(stripEnhancedScheduleColumns))
        if (!fallbackError) return mapped
        console.error('addBatchScheduleTasks fallback error:', fallbackError)
      }
      console.error('addBatchScheduleTasks error:', error)
      set(s => ({ scheduleTasks: s.scheduleTasks.filter(t => !mapped.some(item => item.id === t.id)) }))
    }
    return mapped
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
    if (data.projectContactId !== undefined) updates.project_contact_id = data.projectContactId || null
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

  async updateBatchScheduleTasks(ids, data) {
    if (!ids.length) return
    const updates = { updated_at: new Date().toISOString() }
    if (data.name !== undefined) updates.name = data.name
    if (data.phase !== undefined) updates.phase = data.phase
    if (data.assignee !== undefined) updates.assignee = data.assignee
    if (data.projectContactId !== undefined) updates.project_contact_id = data.projectContactId || null
    if (data.internalOwner !== undefined) updates.internal_owner = data.internalOwner
    if (data.status !== undefined) updates.status = data.status
    if (data.progress !== undefined) updates.progress = data.progress
    if (data.isMilestone !== undefined) updates.is_milestone = data.isMilestone
    if (data.notes !== undefined) updates.notes = data.notes
    if (data.shiftDays) {
      const shiftDate = value => {
        if (!value) return value
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return value
        date.setDate(date.getDate() + Number(data.shiftDays))
        return date.toISOString().slice(0, 10)
      }
      const affected = get().scheduleTasks.filter(t => ids.includes(t.id))
      set(s => ({ scheduleTasks: s.scheduleTasks.map(t => ids.includes(t.id) ? { ...t, startDate: shiftDate(t.startDate), endDate: shiftDate(t.endDate), updatedAt: updates.updated_at } : t) }))
      await Promise.all(affected.map(t => supabase.from('schedule_tasks').update({ start_date: shiftDate(t.startDate), end_date: shiftDate(t.endDate), updated_at: updates.updated_at }).eq('id', t.id)))
      return
    }
    set(s => ({ scheduleTasks: s.scheduleTasks.map(t => ids.includes(t.id) ? { ...t, ...data, updatedAt: updates.updated_at } : t) }))
    const { error } = await supabase.from('schedule_tasks').update(updates).in('id', ids)
    if (error) console.error('updateBatchScheduleTasks error:', error)
  },

  async deleteBatchScheduleTasks(ids) {
    if (!ids.length) return
    set(s => ({ scheduleTasks: s.scheduleTasks.filter(t => !ids.includes(t.id)) }))
    const { error } = await supabase.from('schedule_tasks').delete().in('id', ids)
    if (error) console.error('deleteBatchScheduleTasks error:', error)
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
      stage_id: data.stageId || '',
      name: data.name,
      url: data.url || '',
      category: data.category || 'other',
      notes: data.notes || '',
      added_by: data.addedBy || get().currentUser || '',
      source: data.source || (data.url?.includes('drive.google.com') ? 'google_drive' : 'manual_link'),
      storage_path: data.storagePath || '',
      file_name: data.fileName || '',
      mime_type: data.mimeType || '',
      file_size: data.fileSize ?? null,
      uploaded_by: data.uploadedBy || get().profile?.id || null,
      drive_url: data.driveUrl || (data.url?.includes('drive.google.com') ? data.url : ''),
      drive_file_id: data.driveFileId || '',
      gmail_message_id: data.gmailMessageId || '',
      gmail_thread_id: data.gmailThreadId || '',
      revision: data.revision || '',
      drawing_number: data.drawingNumber || '',
      discipline: data.discipline || '',
      issued_for: data.issuedFor || '',
      document_status: data.documentStatus || 'current',
    }
    const doc = mapDocument({ ...row, created_at: new Date().toISOString() })
    set(s => ({ documents: [doc, ...s.documents] }))
    const { error } = await supabase.from('documents').insert(row)
    if (error) {
      if (data.storagePath) {
        await supabase.storage.from('documents').remove([data.storagePath])
        console.error('addDocument error:', error)
        set(s => ({ documents: s.documents.filter(d => d.id !== id) }))
        throw error
      }
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
    if (data.stageId !== undefined) updates.stage_id = data.stageId || ''
    if (data.category !== undefined) updates.category = data.category
    if (data.notes !== undefined) updates.notes = data.notes
    if (data.source !== undefined) updates.source = data.source
    if (data.storagePath !== undefined) updates.storage_path = data.storagePath
    if (data.fileName !== undefined) updates.file_name = data.fileName
    if (data.mimeType !== undefined) updates.mime_type = data.mimeType
    if (data.fileSize !== undefined) updates.file_size = data.fileSize
    if (data.uploadedBy !== undefined) updates.uploaded_by = data.uploadedBy || null
    if (data.driveUrl !== undefined) updates.drive_url = data.driveUrl
    if (data.driveFileId !== undefined) updates.drive_file_id = data.driveFileId
    if (data.gmailMessageId !== undefined) updates.gmail_message_id = data.gmailMessageId
    if (data.gmailThreadId !== undefined) updates.gmail_thread_id = data.gmailThreadId
    if (data.revision !== undefined) updates.revision = data.revision
    if (data.drawingNumber !== undefined) updates.drawing_number = data.drawingNumber
    if (data.discipline !== undefined) updates.discipline = data.discipline
    if (data.issuedFor !== undefined) updates.issued_for = data.issuedFor
    if (data.documentStatus !== undefined) updates.document_status = data.documentStatus
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
    const existing = get().documents.find(d => d.id === id)
    set(s => ({ documents: s.documents.filter(d => d.id !== id) }))
    const { error } = await supabase.from('documents').delete().eq('id', id)
    if (error) console.error('deleteDocument error:', error)
    if (!error && existing?.storagePath) {
      const { error: storageError } = await supabase.storage.from('documents').remove([existing.storagePath])
      if (storageError) console.error('deleteDocument storage error:', storageError)
    }
  },

  async updateBatchDocuments(ids, data) {
    if (!ids.length) return
    const updates = {}
    if (data.projectId !== undefined) updates.project_id = data.projectId || null
    if (data.stageId !== undefined) updates.stage_id = data.stageId || ''
    if (data.category !== undefined) updates.category = data.category
    if (data.revision !== undefined) updates.revision = data.revision
    if (data.drawingNumber !== undefined) updates.drawing_number = data.drawingNumber
    if (data.discipline !== undefined) updates.discipline = data.discipline
    if (data.issuedFor !== undefined) updates.issued_for = data.issuedFor
    if (data.documentStatus !== undefined) updates.document_status = data.documentStatus
    set(s => ({ documents: s.documents.map(d => ids.includes(d.id) ? { ...d, ...data } : d) }))
    const { error } = await supabase.from('documents').update(updates).in('id', ids)
    if (error) console.error('updateBatchDocuments error:', error)
  },

  async deleteBatchDocuments(ids) {
    if (!ids.length) return
    const existing = get().documents.filter(d => ids.includes(d.id))
    set(s => ({ documents: s.documents.filter(d => !ids.includes(d.id)) }))
    const { error } = await supabase.from('documents').delete().in('id', ids)
    if (error) {
      console.error('deleteBatchDocuments error:', error)
      return
    }
    const paths = existing.map(d => d.storagePath).filter(Boolean)
    if (paths.length) {
      const { error: storageError } = await supabase.storage.from('documents').remove(paths)
      if (storageError) console.error('deleteBatchDocuments storage error:', storageError)
    }
  },

  // ── Team Members ──────────────────────────────────────────────────────────
  // Property intelligence
  async upsertPropertyProfile(data) {
    const id = data.id || data.propertyProfileId || genId()
    const now = new Date().toISOString()
    const existing = get().propertyProfiles.find(item => item.id === id || item.projectId === data.projectId)
    const row = {
      id: existing?.id || id,
      project_id: data.projectId,
      address: data.address || '',
      formatted_address: data.formattedAddress || data.address || '',
      place_id: data.placeId || '',
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      suburb: data.suburb || '',
      city: data.city || '',
      region: data.region || '',
      postal_code: data.postalCode || '',
      country: data.country || 'New Zealand',
      source_status: data.sourceStatus || {},
      title_summary: data.titleSummary || {},
      parcel_summary: data.parcelSummary || {},
      council_summary: data.councilSummary || {},
      zoning_summary: data.zoningSummary || {},
      hazard_summary: data.hazardSummary || {},
      services_summary: data.servicesSummary || {},
      valuation_summary: data.valuationSummary || {},
      demographics_summary: data.demographicsSummary || {},
      map_links: data.mapLinks || {},
      raw_payload: data.rawPayload || {},
      last_refreshed_at: data.lastRefreshedAt || now,
      updated_at: now,
    }
    const profile = mapPropertyProfile({ ...row, created_at: existing?.createdAt || now })
    set(s => ({
      propertyProfiles: [profile, ...s.propertyProfiles.filter(item => item.id !== profile.id && item.projectId !== profile.projectId)],
      projects: s.projects.map(project => project.id === profile.projectId ? { ...project, propertyProfileId: profile.id } : project),
    }))
    const { error } = await supabase.from('property_profiles').upsert(row)
    if (error) console.error('upsertPropertyProfile error:', error)
    await get().updateProject(profile.projectId, { propertyProfileId: profile.id })
    return profile
  },

  async addPropertySourceRun(data) {
    const id = data.id || genId()
    const row = {
      id,
      project_id: data.projectId,
      profile_id: data.profileId || null,
      source: data.source || '',
      status: data.status || 'not available',
      message: data.message || '',
      request: data.request || {},
      response: data.response || {},
    }
    const item = mapPropertySourceRun({ ...row, created_at: new Date().toISOString() })
    set(s => ({ propertySourceRuns: [item, ...s.propertySourceRuns].slice(0, 500) }))
    const { error } = await supabase.from('property_source_runs').insert(row)
    if (error) console.error('addPropertySourceRun error:', error)
    return item
  },

  async addPropertyLayer(data) {
    const id = data.id || genId()
    const row = {
      id,
      project_id: data.projectId,
      profile_id: data.profileId || null,
      layer_type: data.layerType || '',
      name: data.name || '',
      source: data.source || '',
      source_url: data.sourceUrl || '',
      confidence: data.confidence || 'not available',
      geometry: data.geometry || null,
      attributes: data.attributes || {},
    }
    const item = mapPropertyLayer({ ...row, created_at: new Date().toISOString(), captured_at: new Date().toISOString() })
    set(s => ({ propertyLayers: [item, ...s.propertyLayers] }))
    const { error } = await supabase.from('property_layers').insert(row)
    if (error) console.error('addPropertyLayer error:', error)
    return item
  },

  async addDocumentShare(data) {
    const id = data.id || genId()
    const token = data.token || crypto.randomUUID().replaceAll('-', '')
    const row = {
      id,
      token,
      project_id: data.projectId || null,
      document_ids: data.documentIds || [],
      document_snapshot: data.documentSnapshot || [],
      title: data.title || '',
      expires_at: data.expiresAt || null,
      revoked_at: null,
      created_by: data.createdBy || get().currentUser || '',
    }
    const item = mapDocumentShare({ ...row, access_count: 0, created_at: new Date().toISOString() })
    set(s => ({ documentShares: [item, ...s.documentShares] }))
    const { error } = await supabase.from('document_shares').insert(row)
    if (error) {
      console.error('addDocumentShare error:', error)
      set(s => ({ documentShares: s.documentShares.filter(share => share.id !== id) }))
    }
    return item
  },

  async revokeDocumentShare(id) {
    const revokedAt = new Date().toISOString()
    set(s => ({ documentShares: s.documentShares.map(share => share.id === id ? { ...share, revokedAt } : share) }))
    const { error } = await supabase.from('document_shares').update({ revoked_at: revokedAt }).eq('id', id)
    if (error) console.error('revokeDocumentShare error:', error)
  },

  async addAiActionDraft(data) {
    const id = data.id || genId()
    const now = new Date().toISOString()
    const row = {
      id,
      project_id: data.projectId,
      action_type: data.actionType || data.action_type || '',
      title: data.title || '',
      rationale: data.rationale || '',
      payload: data.payload || {},
      status: data.status || 'pending',
      created_by: data.createdBy || get().currentUser || '',
      created_at: now,
      updated_at: now,
    }
    const draft = mapAiActionDraft(row)
    set(s => ({ aiActionDrafts: [draft, ...s.aiActionDrafts] }))
    const { error } = await supabase.from('ai_action_drafts').insert(row)
    if (error) console.error('addAiActionDraft error:', error)
    return draft
  },

  async updateAiActionDraft(id, data) {
    const updates = { updated_at: new Date().toISOString() }
    if (data.title !== undefined) updates.title = data.title
    if (data.rationale !== undefined) updates.rationale = data.rationale
    if (data.payload !== undefined) updates.payload = data.payload
    if (data.status !== undefined) updates.status = data.status
    set(s => ({ aiActionDrafts: s.aiActionDrafts.map(draft => draft.id === id ? { ...draft, ...data, updatedAt: updates.updated_at } : draft) }))
    const { error } = await supabase.from('ai_action_drafts').update(updates).eq('id', id)
    if (error) console.error('updateAiActionDraft error:', error)
  },

  async dismissAiActionDraft(id) {
    const dismissedAt = new Date().toISOString()
    set(s => ({ aiActionDrafts: s.aiActionDrafts.map(draft => draft.id === id ? { ...draft, status: 'dismissed', dismissedAt } : draft) }))
    const { error } = await supabase.from('ai_action_drafts').update({ status: 'dismissed', dismissed_at: dismissedAt, updated_at: dismissedAt }).eq('id', id)
    if (error) console.error('dismissAiActionDraft error:', error)
  },

  async applyAiActionDraft(id) {
    const draft = get().aiActionDrafts.find(item => item.id === id)
    if (!draft) return
    const payload = draft.payload || {}
    if (draft.actionType === 'create_task') {
      await get().addTask({
        projectId: draft.projectId,
        title: payload.title || draft.title,
        description: payload.description || draft.rationale,
        assignee: payload.assignee || '',
        dueDate: payload.dueDate || '',
        priority: payload.priority || 'medium',
        status: payload.status || 'open',
      })
    }
    if (draft.actionType === 'create_schedule_task') {
      await get().addScheduleTask({
        projectId: draft.projectId,
        name: payload.name || payload.title || draft.title,
        phase: payload.phase || '',
        startDate: payload.startDate || '',
        endDate: payload.endDate || payload.dueDate || '',
        durationDays: payload.durationDays ?? null,
        status: payload.status || 'not-started',
        assignee: payload.assignee || '',
        internalOwner: payload.internalOwner || '',
        projectContactId: payload.projectContactId || '',
        isMilestone: Boolean(payload.isMilestone),
        notes: payload.notes || draft.rationale,
      })
    }
    const appliedAt = new Date().toISOString()
    set(s => ({ aiActionDrafts: s.aiActionDrafts.map(item => item.id === id ? { ...item, status: 'applied', appliedAt, updatedAt: appliedAt } : item) }))
    const { error } = await supabase.from('ai_action_drafts').update({ status: 'applied', applied_at: appliedAt, updated_at: appliedAt }).eq('id', id)
    if (error) console.error('applyAiActionDraft error:', error)
  },

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

  async addCalendarEvent(data) {
    const id = genId()
    const now = new Date().toISOString()
    const row = {
      id,
      project_id: data.projectId || null,
      stage_id: data.stageId || '',
      title: data.title || '',
      event_date: data.eventDate || '',
      event_type: data.eventType || 'event',
      notes: data.notes || '',
      created_by: data.createdBy || get().currentUser || '',
      created_at: now,
      updated_at: now,
    }
    const item = mapCalendarEvent(row)
    set(s => ({ calendarEvents: [...s.calendarEvents, item] }))
    const { error } = await supabase.from('calendar_events').insert(row)
    if (error) console.error('addCalendarEvent error:', error)
    return item
  },

  async updateCalendarEvent(id, data) {
    const updates = { updated_at: new Date().toISOString() }
    if (data.projectId !== undefined) updates.project_id = data.projectId || null
    if (data.stageId !== undefined) updates.stage_id = data.stageId || ''
    if (data.title !== undefined) updates.title = data.title
    if (data.eventDate !== undefined) updates.event_date = data.eventDate
    if (data.eventType !== undefined) updates.event_type = data.eventType
    if (data.notes !== undefined) updates.notes = data.notes
    set(s => ({ calendarEvents: s.calendarEvents.map(item => item.id === id ? { ...item, ...data, updatedAt: updates.updated_at } : item) }))
    const { error } = await supabase.from('calendar_events').update(updates).eq('id', id)
    if (error) console.error('updateCalendarEvent error:', error)
  },

  async deleteCalendarEvent(id) {
    set(s => ({ calendarEvents: s.calendarEvents.filter(item => item.id !== id) }))
    const { error } = await supabase.from('calendar_events').delete().eq('id', id)
    if (error) console.error('deleteCalendarEvent error:', error)
  },

  async addCompany(data) {
    const id = data.id || genId()
    const now = new Date().toISOString()
    const row = { id, name: data.name || '', type: data.type || '', phone: data.phone || '', email: data.email || '', website: data.website || '', address: data.address || '', notes: data.notes || '', created_at: now, updated_at: now }
    const company = mapCompany(row)
    set(s => ({ companies: [...s.companies, company].sort((a, b) => a.name.localeCompare(b.name)) }))
    const { error } = await supabase.from('companies').insert(row)
    if (error) console.error('addCompany error:', error)
    return company
  },

  async updateCompany(id, data) {
    const updates = { updated_at: new Date().toISOString() }
    ;['name', 'type', 'phone', 'email', 'website', 'address', 'notes'].forEach(key => {
      if (data[key] !== undefined) updates[key] = data[key]
    })
    set(s => ({ companies: s.companies.map(item => item.id === id ? { ...item, ...data, updatedAt: updates.updated_at } : item) }))
    const { error } = await supabase.from('companies').update(updates).eq('id', id)
    if (error) console.error('updateCompany error:', error)
  },

  async deleteCompany(id) {
    set(s => ({ companies: s.companies.filter(item => item.id !== id), projectContacts: s.projectContacts.filter(item => item.companyId !== id) }))
    const { error } = await supabase.from('companies').delete().eq('id', id)
    if (error) console.error('deleteCompany error:', error)
  },

  async addContact(data) {
    const id = data.id || genId()
    const now = new Date().toISOString()
    const row = { id, company_id: data.companyId || null, name: data.name || '', title: data.title || '', email: data.email || '', phone: data.phone || '', notes: data.notes || '', created_at: now, updated_at: now }
    const contact = mapContact(row)
    set(s => ({ contacts: [...s.contacts, contact].sort((a, b) => a.name.localeCompare(b.name)) }))
    const { error } = await supabase.from('contacts').insert(row)
    if (error) console.error('addContact error:', error)
    return contact
  },

  async updateContact(id, data) {
    const updates = { updated_at: new Date().toISOString() }
    if (data.companyId !== undefined) updates.company_id = data.companyId || null
    ;['name', 'title', 'email', 'phone', 'notes'].forEach(key => {
      if (data[key] !== undefined) updates[key] = data[key]
    })
    set(s => ({ contacts: s.contacts.map(item => item.id === id ? { ...item, ...data, updatedAt: updates.updated_at } : item) }))
    const { error } = await supabase.from('contacts').update(updates).eq('id', id)
    if (error) console.error('updateContact error:', error)
  },

  async deleteContact(id) {
    set(s => ({ contacts: s.contacts.filter(item => item.id !== id), projectContacts: s.projectContacts.filter(item => item.contactId !== id) }))
    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (error) console.error('deleteContact error:', error)
  },

  async addProjectContact(data) {
    const id = data.id || genId()
    const now = new Date().toISOString()
    const row = { id, project_id: data.projectId, company_id: data.companyId || null, contact_id: data.contactId || null, project_role: data.projectRole || '', discipline: data.discipline || '', stage_ids: data.stageIds || [], status: data.status || 'active', is_primary: Boolean(data.isPrimary), notes: data.notes || '', created_at: now, updated_at: now }
    const item = mapProjectContact(row)
    set(s => ({ projectContacts: [item, ...s.projectContacts] }))
    const { error } = await supabase.from('project_contacts').insert(row)
    if (error) console.error('addProjectContact error:', error)
    return item
  },

  async updateProjectContact(id, data) {
    const updates = { updated_at: new Date().toISOString() }
    if (data.projectId !== undefined) updates.project_id = data.projectId
    if (data.companyId !== undefined) updates.company_id = data.companyId || null
    if (data.contactId !== undefined) updates.contact_id = data.contactId || null
    if (data.projectRole !== undefined) updates.project_role = data.projectRole
    if (data.discipline !== undefined) updates.discipline = data.discipline
    if (data.stageIds !== undefined) updates.stage_ids = data.stageIds
    if (data.status !== undefined) updates.status = data.status
    if (data.isPrimary !== undefined) updates.is_primary = Boolean(data.isPrimary)
    if (data.notes !== undefined) updates.notes = data.notes
    set(s => ({ projectContacts: s.projectContacts.map(item => item.id === id ? { ...item, ...data, updatedAt: updates.updated_at } : item) }))
    const { error } = await supabase.from('project_contacts').update(updates).eq('id', id)
    if (error) console.error('updateProjectContact error:', error)
  },

  async updateBatchProjectContacts(ids, data) {
    if (!ids.length) return
    const updates = { updated_at: new Date().toISOString() }
    if (data.projectRole !== undefined) updates.project_role = data.projectRole
    if (data.discipline !== undefined) updates.discipline = data.discipline
    if (data.stageIds !== undefined) updates.stage_ids = data.stageIds
    if (data.status !== undefined) updates.status = data.status
    set(s => ({ projectContacts: s.projectContacts.map(item => ids.includes(item.id) ? { ...item, ...data, updatedAt: updates.updated_at } : item) }))
    const { error } = await supabase.from('project_contacts').update(updates).in('id', ids)
    if (error) console.error('updateBatchProjectContacts error:', error)
  },

  async deleteProjectContact(id) {
    set(s => ({ projectContacts: s.projectContacts.filter(item => item.id !== id) }))
    const { error } = await supabase.from('project_contacts').delete().eq('id', id)
    if (error) console.error('deleteProjectContact error:', error)
  },

  async deleteBatchProjectContacts(ids) {
    if (!ids.length) return
    set(s => ({ projectContacts: s.projectContacts.filter(item => !ids.includes(item.id)) }))
    const { error } = await supabase.from('project_contacts').delete().in('id', ids)
    if (error) console.error('deleteBatchProjectContacts error:', error)
  },

  async addDailyLog(data) {
    const id = genId()
    const now = new Date().toISOString()
    const row = { id, project_id: data.projectId, log_date: data.logDate || new Date().toISOString().slice(0, 10), summary: data.summary || '', work_completed: data.workCompleted || '', blockers: data.blockers || '', next_steps: data.nextSteps || '', weather: data.weather || '', created_by: data.createdBy || get().currentUser || '', created_at: now, updated_at: now }
    const item = mapDailyLog(row)
    set(s => ({ dailyLogs: [item, ...s.dailyLogs] }))
    const { error } = await supabase.from('daily_logs').insert(row)
    if (error) console.error('addDailyLog error:', error)
    return item
  },

  async updateDailyLog(id, data) {
    const updates = { updated_at: new Date().toISOString() }
    if (data.logDate !== undefined) updates.log_date = data.logDate
    if (data.summary !== undefined) updates.summary = data.summary
    if (data.workCompleted !== undefined) updates.work_completed = data.workCompleted
    if (data.blockers !== undefined) updates.blockers = data.blockers
    if (data.nextSteps !== undefined) updates.next_steps = data.nextSteps
    if (data.weather !== undefined) updates.weather = data.weather
    set(s => ({ dailyLogs: s.dailyLogs.map(item => item.id === id ? { ...item, ...data, updatedAt: updates.updated_at } : item) }))
    const { error } = await supabase.from('daily_logs').update(updates).eq('id', id)
    if (error) console.error('updateDailyLog error:', error)
  },

  async deleteDailyLog(id) {
    set(s => ({ dailyLogs: s.dailyLogs.filter(item => item.id !== id) }))
    const { error } = await supabase.from('daily_logs').delete().eq('id', id)
    if (error) console.error('deleteDailyLog error:', error)
  },

  // ── Activity Log ───────────────────────────────────────────────────────────
  async logActivity(projectId, action, detail, user = '') {
    const id = genId()
    const actor = user || get().currentUser || ''
    const entry = { id, projectId, action, detail, user: actor, timestamp: new Date().toISOString() }
    set(s => ({ activityLog: [entry, ...s.activityLog].slice(0, 500) }))
    const { error } = await supabase.from('activity_log').insert({
      id,
      project_id: projectId,
      action,
      detail,
      actor,
    })
    if (error) console.error('logActivity error:', error)
  },
}))

export default useStore
