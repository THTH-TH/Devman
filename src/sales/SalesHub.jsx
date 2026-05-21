import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardCopy,
  DollarSign,
  ExternalLink,
  FileText,
  Filter,
  Flame,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Settings,
  Table2,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import useSalesStore from './useSalesStore'
import {
  ASSIGNEES,
  BUYER_TYPES,
  CONDITIONS_STATUSES,
  DEPOSIT_STATUSES,
  FINANCE_STATUSES,
  LEAD_SOURCES,
  MERGE_TAGS,
  PIPELINE_STAGES,
  SALES_NAV,
  SPA_STATUSES,
  STAGE_COLORS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TEMPLATE_CATEGORIES,
  TEMP_COLORS,
  TEMPERATURES,
  UNIT_STATUS_COLORS,
  UNIT_STATUSES,
} from './salesConstants'
import {
  buildTodayActions,
  buyerPackItems,
  calculatedTemperature,
  formatDate,
  formatShortDate,
  groupCounts,
  isOverdue,
  leadName,
  money,
  projectMetrics,
  renderTemplate,
  sortLeads,
  suggestedNextAction,
  suggestedUnitsForLead,
  todayISO,
} from './salesUtils'

const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100'

function Badge({ children, className = 'bg-gray-100 text-gray-600' }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}>{children}</span>
}

function MetricCard({ label, value, hint, tone = 'bg-white' }) {
  return (
    <div className={`${tone} rounded-xl border border-gray-100 p-4 shadow-sm`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
    </div>
  )
}

function ProgressBar({ value, color = 'bg-forest-600' }) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function PageHeader({ title, subtitle, action }) {
  return (
    <div className="border-b border-gray-100 bg-white px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-gray-400">{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  )
}

function SalesShell() {
  const { initialized, loading, error, initialize } = useSalesStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-100 p-6">
        <div className="max-w-lg rounded-xl border border-red-100 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold text-gray-900">Sales Hub needs the Supabase migration</h1>
          <p className="mt-2 text-sm text-red-600">{error}</p>
          <p className="mt-4 text-sm text-gray-500">Run `supabase/migrations/20260521160000_sales_hub_v1.sql`, then refresh this page.</p>
        </div>
      </div>
    )
  }

  if (loading || !initialized) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-100">
        <div className="rounded-xl bg-white px-6 py-5 text-center shadow-sm">
          <div className="font-bold text-gray-900">Sales Hub</div>
          <div className="mt-1 text-sm text-gray-400">Loading sales data...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-gray-100">
      <div className="border-b border-gray-100 bg-white px-6">
        <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto py-2">
          {SALES_NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-forest-600 text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <Routes>
          <Route index element={<SalesDashboard />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="leads/:leadId" element={<LeadDetailPage />} />
          <Route path="pipeline" element={<PipelinePage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:projectId" element={<ProjectSalesDetailPage />} />
          <Route path="units" element={<UnitsPage />} />
          <Route path="units/:unitId" element={<UnitDetailPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/sales" replace />} />
        </Routes>
      </div>
    </div>
  )
}

function useSalesLookups() {
  const state = useSalesStore()
  const projectById = useMemo(() => Object.fromEntries(state.projects.map(project => [project.id, project])), [state.projects])
  const leadById = useMemo(() => Object.fromEntries(state.leads.map(lead => [lead.id, lead])), [state.leads])
  const unitById = useMemo(() => Object.fromEntries(state.units.map(unit => [unit.id, unit])), [state.units])
  return { ...state, projectById, leadById, unitById }
}

function SalesDashboard() {
  const { projects, leads, units, tasks } = useSalesStore()
  const activeLeads = leads.filter(lead => !lead.archived && lead.pipelineStage !== 'Lost / Not Now')
  const actions = buildTodayActions({ leads, units, tasks })
  const newThisWeek = activeLeads.filter(lead => new Date(lead.createdAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length
  const presalesRequired = projects.reduce((sum, project) => sum + (project.presalesRequired || 0), 0)
  const presalesAchieved = projects.reduce((sum, project) => sum + projectMetrics(project, activeLeads, units).presalesAchieved, 0)

  const momentum = [
    ['Leads by source', groupCounts(activeLeads, lead => lead.source)],
    ['Leads by project', groupCounts(activeLeads, lead => lead.projectInterest || 'Unknown')],
    ['Leads by temperature', groupCounts(activeLeads, lead => lead.temperature)],
    ['Leads by stage', groupCounts(activeLeads, lead => lead.pipelineStage)],
    ['Units by status', groupCounts(units, unit => unit.status)],
  ]

  return (
    <>
      <PageHeader title="Sales Hub" subtitle="Daily property sales control centre" />
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
          <MetricCard label="Active leads" value={activeLeads.length} />
          <MetricCard label="Hot leads" value={activeLeads.filter(lead => lead.temperature === 'Hot').length} tone="bg-red-50" />
          <MetricCard label="New this week" value={newThisWeek} />
          <MetricCard label="Calls due today" value={actions.leadsToCall.length} />
          <MetricCard label="Overdue follow-ups" value={actions.overdueFollowUps.length} tone={actions.overdueFollowUps.length ? 'bg-amber-50' : 'bg-white'} />
          <MetricCard label="Units reserved" value={units.filter(unit => unit.status === 'Reserved').length} />
          <MetricCard label="Units sold" value={units.filter(unit => ['Deposit Paid', 'Unconditional', 'Settled'].includes(unit.status)).length} />
          <MetricCard label="Presales required" value={presalesRequired} />
          <MetricCard label="Presales achieved" value={presalesAchieved} />
          <MetricCard label="Presales gap" value={Math.max(0, presalesRequired - presalesAchieved)} tone="bg-forest-50" />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {projects.map(project => {
            const metrics = projectMetrics(project, activeLeads, units)
            return (
              <Link key={project.id} to={`/sales/projects/${project.id}`} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm hover:border-gray-200 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">{project.name}</h2>
                    <p className="text-sm text-gray-400">{project.location} - {project.product}</p>
                  </div>
                  <Badge className={project.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}>{project.status}</Badge>
                </div>
                {project.id === 'beachwaters' && (
                  <div className="mt-4 rounded-lg border border-forest-100 bg-forest-50 p-3">
                    <div className="text-sm font-bold text-forest-700">5 presales required</div>
                    <div className="mt-1 text-xs text-forest-700">{metrics.presalesAchieved} achieved - {metrics.presalesGap} to go</div>
                  </div>
                )}
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <MetricMini label="Total" value={metrics.totalUnits} />
                  <MetricMini label="Available" value={metrics.availableUnits} />
                  <MetricMini label="Reserved" value={metrics.reservedUnits} />
                  <MetricMini label="Sold" value={metrics.soldUnits} />
                  <MetricMini label="Hot leads" value={metrics.hotLeads} />
                  <MetricMini label="S&P out" value={metrics.spOut} />
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-gray-400">
                    <span>Presale progress</span>
                    <span>{metrics.presalesAchieved}/{project.presalesRequired}</span>
                  </div>
                  <ProgressBar value={metrics.progress} />
                </div>
              </Link>
            )
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
          <TodayActions actions={actions} />
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900">Sales Momentum</h2>
            <div className="mt-4 space-y-4">
              {momentum.map(([title, counts]) => (
                <CountList key={title} title={title} counts={counts} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function MetricMini({ label, value }) {
  return (
    <div className="rounded-lg bg-gray-50 p-2">
      <div className="text-lg font-bold text-gray-900">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
    </div>
  )
}

function TodayActions({ actions }) {
  const groups = [
    ['Leads to call today', actions.leadsToCall, item => item.fullName],
    ['Follow-ups overdue', actions.overdueFollowUps, item => item.fullName],
    ['Hot leads with no recent contact', actions.staleHotLeads, item => item.fullName],
    ['Reserved units expiring', actions.reservationExpiry, item => `${item.projectName} ${item.unitNumber}`],
    ['S&P sent, not signed', actions.spUnsigned, item => `${item.projectName} ${item.unitNumber}`],
    ['Deposits pending', actions.depositsPending, item => `${item.projectName} ${item.unitNumber}`],
  ]
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900">Today's Actions</h2>
        <Link to="/sales/tasks" className="text-xs font-medium text-ocean-600 hover:underline">Open tasks</Link>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {groups.map(([title, items, label]) => (
          <div key={title} className="rounded-lg border border-gray-100 p-3">
            <div className="text-xs font-bold text-gray-700">{title}</div>
            <div className="mt-2 space-y-1">
              {items.length === 0 ? (
                <div className="text-xs text-gray-400">Clear</div>
              ) : items.slice(0, 4).map(item => (
                <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-gray-700">{label(item)}</span>
                  {'nextActionDate' in item && <span className={isOverdue(item.nextActionDate) ? 'text-red-500' : 'text-gray-400'}>{formatShortDate(item.nextActionDate)}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CountList({ title, counts }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6)
  return (
    <div>
      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">{title}</div>
      <div className="space-y-1.5">
        {entries.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
            <span className="truncate text-gray-700">{label}</span>
            <span className="font-bold text-gray-900">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LeadsPage() {
  const store = useSalesStore()
  const [showLead, setShowLead] = useState(false)
  return (
    <>
      <PageHeader
        title="Sales Leads"
        subtitle={`${store.leads.filter(lead => !lead.archived).length} active leads`}
        action={<button onClick={() => setShowLead(true)} className="inline-flex items-center gap-2 rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-700"><Plus size={15} /> Add lead</button>}
      />
      <div className="mx-auto max-w-7xl p-6">
        <LeadsTable />
      </div>
      {showLead && <LeadModal onClose={() => setShowLead(false)} />}
    </>
  )
}

function LeadsTable({ projectName = '' }) {
  const { leads, projects, markContacted, markInfoSent, moveLeadStage, updateLead, archiveLead } = useSalesStore()
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ project: projectName, buyerType: '', source: '', financeStatus: '', temperature: '', assignedTo: '', stage: '' })
  const [sort, setSort] = useState('newest')
  const [editLead, setEditLead] = useState(null)
  const [taskLead, setTaskLead] = useState(null)
  const [unitLead, setUnitLead] = useState(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return sortLeads(leads.filter(lead => !lead.archived).filter(lead => {
      if (projectName && !lead.projectInterest?.includes(projectName)) return false
      if (q && ![lead.fullName, lead.email, lead.phone].join(' ').toLowerCase().includes(q)) return false
      if (filters.project && !lead.projectInterest?.includes(filters.project)) return false
      if (filters.buyerType && lead.buyerType !== filters.buyerType) return false
      if (filters.source && lead.source !== filters.source) return false
      if (filters.financeStatus && lead.financeStatus !== filters.financeStatus) return false
      if (filters.temperature && lead.temperature !== filters.temperature) return false
      if (filters.assignedTo && lead.assignedTo !== filters.assignedTo) return false
      if (filters.stage && lead.pipelineStage !== filters.stage) return false
      return true
    }), sort)
  }, [leads, search, filters, sort, projectName])

  const setFilter = (key, value) => setFilters(current => ({ ...current, [key]: value }))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input className={`${inputCls} w-64 pl-8`} placeholder="Search name, email, phone" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {!projectName && <Select value={filters.project} onChange={value => setFilter('project', value)} options={projects.map(p => p.name)} placeholder="All projects" />}
        <Select value={filters.buyerType} onChange={value => setFilter('buyerType', value)} options={BUYER_TYPES} placeholder="Buyer type" />
        <Select value={filters.source} onChange={value => setFilter('source', value)} options={LEAD_SOURCES} placeholder="Source" />
        <Select value={filters.financeStatus} onChange={value => setFilter('financeStatus', value)} options={FINANCE_STATUSES} placeholder="Finance" />
        <Select value={filters.temperature} onChange={value => setFilter('temperature', value)} options={TEMPERATURES} placeholder="Temperature" />
        <Select value={filters.assignedTo} onChange={value => setFilter('assignedTo', value)} options={ASSIGNEES} placeholder="Assigned" />
        <Select value={filters.stage} onChange={value => setFilter('stage', value)} options={PIPELINE_STAGES} placeholder="Stage" />
        <Select value={sort} onChange={setSort} options={[['newest', 'Newest'], ['nextAction', 'Next action'], ['hottest', 'Hottest'], ['lastContacted', 'Last contacted'], ['stage', 'Stage']]} placeholder="Sort" />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
              <tr>
                {['Name', 'Project', 'Buyer Type', 'Source', 'Finance', 'Temp', 'Stage', 'Assigned', 'Last Contacted', 'Next Action', 'Date', 'Actions'].map(head => (
                  <th key={head} className="px-4 py-3 text-left font-semibold">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(lead => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/sales/leads/${lead.id}`} className="font-semibold text-gray-900 hover:text-ocean-700">{leadName(lead)}</Link>
                    <div className="text-xs text-gray-400">{lead.email || lead.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{lead.projectInterest}</td>
                  <td className="px-4 py-3 text-gray-600">{lead.buyerType}</td>
                  <td className="px-4 py-3 text-gray-600">{lead.source}</td>
                  <td className="px-4 py-3 text-gray-600">{lead.financeStatus}</td>
                  <td className="px-4 py-3"><Badge className={TEMP_COLORS[lead.temperature]}>{lead.temperature}</Badge></td>
                  <td className="px-4 py-3"><Badge className={STAGE_COLORS[lead.pipelineStage]}>{lead.pipelineStage}</Badge></td>
                  <td className="px-4 py-3 text-gray-600">{lead.assignedTo}</td>
                  <td className="px-4 py-3 text-gray-500">{formatShortDate(lead.lastContactedAt)}</td>
                  <td className="px-4 py-3 text-gray-700">{lead.nextAction || suggestedNextAction(lead)}</td>
                  <td className={`px-4 py-3 ${isOverdue(lead.nextActionDate) ? 'font-semibold text-red-600' : 'text-gray-500'}`}>{formatShortDate(lead.nextActionDate)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <RowButton to={`/sales/leads/${lead.id}`}>Open</RowButton>
                      <RowButton onClick={() => markContacted(lead.id)}>Contacted</RowButton>
                      <RowButton onClick={() => markInfoSent(lead.id)}>Info sent</RowButton>
                      <RowButton onClick={() => updateLead(lead.id, { assignedTo: 'Tim' })}>Tim</RowButton>
                      <RowButton onClick={() => updateLead(lead.id, { assignedTo: 'Dave' })}>Dave</RowButton>
                      <RowButton onClick={() => setEditLead(lead)}>Edit</RowButton>
                      <RowButton onClick={() => setTaskLead(lead)}>Task</RowButton>
                      <RowButton onClick={() => setUnitLead(lead)}>Unit</RowButton>
                      <RowButton onClick={() => {
                        const reason = window.prompt('Lost / not now reason')
                        moveLeadStage(lead.id, 'Lost / Not Now', { lostReason: reason || '' })
                      }}>Lost</RowButton>
                      <RowButton onClick={() => archiveLead(lead.id)}>Archive</RowButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="p-8 text-center text-sm text-gray-400">No leads match this view.</div>}
      </div>

      {editLead && <LeadModal lead={editLead} onClose={() => setEditLead(null)} />}
      {taskLead && <TaskModal lead={taskLead} onClose={() => setTaskLead(null)} />}
      {unitLead && <AssignUnitModal lead={unitLead} onClose={() => setUnitLead(null)} />}
    </div>
  )
}

function RowButton({ children, onClick, to }) {
  const cls = 'rounded-md border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900'
  if (to) return <Link to={to} className={cls}>{children}</Link>
  return <button onClick={onClick} className={cls}>{children}</button>
}

function Select({ value, onChange, options, placeholder }) {
  const normalized = options.map(option => Array.isArray(option) ? option : [option, option])
  return (
    <select className={inputCls} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {normalized.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
    </select>
  )
}

function LeadModal({ lead, onClose }) {
  const { addLead, updateLead, projects } = useSalesStore()
  const [form, setForm] = useState({
    firstName: lead?.firstName || '',
    lastName: lead?.lastName || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    source: lead?.source || 'Meta',
    projectInterest: lead?.projectInterest || 'Beachwaters',
    buyerType: lead?.buyerType || 'Unknown',
    financeStatus: lead?.financeStatus || 'Unknown',
    assignedTo: lead?.assignedTo || 'Tim',
    temperature: lead?.temperature || 'Warm',
    pipelineStage: lead?.pipelineStage || 'New Inquiry',
    notes: lead?.notes || '',
    budgetRange: lead?.budgetRange || '',
    depositCapacity: lead?.depositCapacity || '',
    nextActionDate: lead?.nextActionDate || todayISO(),
    nextAction: lead?.nextAction || '',
    probability: lead?.probability ?? 20,
    hasFinanceApproval: lead?.hasFinanceApproval || false,
    needsBrokerIntro: lead?.needsBrokerIntro || false,
  })
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const save = async () => {
    if (!form.firstName.trim() && !form.lastName.trim()) return
    const fullName = [form.firstName, form.lastName].filter(Boolean).join(' ')
    if (lead) await updateLead(lead.id, { ...form, fullName })
    else await addLead({ ...form, fullName })
    onClose()
  }
  return (
    <Modal title={lead ? 'Edit lead' : 'Add lead'} onClose={onClose} footer={<><button onClick={onClose} className="text-sm text-gray-500">Cancel</button><button onClick={save} className="rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-white">Save lead</button></>}>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="First name"><input className={inputCls} value={form.firstName} onChange={e => set('firstName', e.target.value)} /></Field>
        <Field label="Last name"><input className={inputCls} value={form.lastName} onChange={e => set('lastName', e.target.value)} /></Field>
        <Field label="Email"><input className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} /></Field>
        <Field label="Phone"><input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} /></Field>
        <Field label="Project"><Select value={form.projectInterest} onChange={value => set('projectInterest', value)} options={projects.map(p => p.name)} placeholder="Project" /></Field>
        <Field label="Source"><Select value={form.source} onChange={value => set('source', value)} options={LEAD_SOURCES} placeholder="Source" /></Field>
        <Field label="Buyer type"><Select value={form.buyerType} onChange={value => set('buyerType', value)} options={BUYER_TYPES} placeholder="Buyer type" /></Field>
        <Field label="Finance"><Select value={form.financeStatus} onChange={value => set('financeStatus', value)} options={FINANCE_STATUSES} placeholder="Finance" /></Field>
        <Field label="Assigned to"><Select value={form.assignedTo} onChange={value => set('assignedTo', value)} options={ASSIGNEES} placeholder="Assigned" /></Field>
        <Field label="Temperature"><Select value={form.temperature} onChange={value => set('temperature', value)} options={TEMPERATURES} placeholder="Temperature" /></Field>
        <Field label="Stage"><Select value={form.pipelineStage} onChange={value => set('pipelineStage', value)} options={PIPELINE_STAGES} placeholder="Stage" /></Field>
        <Field label="Probability"><input type="number" className={inputCls} value={form.probability} onChange={e => set('probability', Number(e.target.value))} /></Field>
        <Field label="Budget range"><input className={inputCls} value={form.budgetRange} onChange={e => set('budgetRange', e.target.value)} /></Field>
        <Field label="Deposit capacity"><input className={inputCls} value={form.depositCapacity} onChange={e => set('depositCapacity', e.target.value)} /></Field>
        <Field label="Next action"><input className={inputCls} value={form.nextAction} onChange={e => set('nextAction', e.target.value)} /></Field>
        <Field label="Next action date"><input type="date" className={inputCls} value={form.nextActionDate} onChange={e => set('nextActionDate', e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={form.hasFinanceApproval} onChange={e => set('hasFinanceApproval', e.target.checked)} /> Finance approved</label>
        <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={form.needsBrokerIntro} onChange={e => set('needsBrokerIntro', e.target.checked)} /> Needs broker intro</label>
      </div>
      <Field label="Notes"><textarea className={`${inputCls} min-h-24`} value={form.notes} onChange={e => set('notes', e.target.value)} /></Field>
    </Modal>
  )
}

function PipelinePage() {
  const { leads, moveLeadStage, units, assignUnitToLead } = useSalesStore()
  const activeLeads = leads.filter(lead => !lead.archived)
  const [dragId, setDragId] = useState('')

  const onDrop = async stage => {
    if (!dragId) return
    const lead = leads.find(item => item.id === dragId)
    const lostReason = stage === 'Lost / Not Now' ? window.prompt('Lost / not now reason') : ''
    await moveLeadStage(dragId, stage, { lostReason: lostReason || '' })
    if (stage === 'Unit Selected' && lead && !units.some(unit => unit.assignedLeadId === lead.id)) {
      const available = units.find(unit => unit.status === 'Available' && lead.projectInterest?.includes(unit.projectName))
      if (available && window.confirm(`Assign ${available.projectName} ${available.unitNumber} to ${leadName(lead)}?`)) {
        await assignUnitToLead(lead.id, available.id)
      }
    }
    setDragId('')
  }

  return (
    <>
      <PageHeader title="Sales Pipeline" subtitle="Drag cards between stages to update the deal." />
      <div className="h-full overflow-auto p-6">
        <div className="flex min-w-max gap-4">
          {PIPELINE_STAGES.map(stage => {
            const stageLeads = activeLeads.filter(lead => lead.pipelineStage === stage)
            return (
              <div
                key={stage}
                onDragOver={e => e.preventDefault()}
                onDrop={() => onDrop(stage)}
                className="w-72 shrink-0 rounded-xl border border-gray-100 bg-white shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-gray-50 px-4 py-3">
                  <Badge className={STAGE_COLORS[stage]}>{stage}</Badge>
                  <span className="text-xs font-bold text-gray-400">{stageLeads.length}</span>
                </div>
                <div className="space-y-3 p-3">
                  {stageLeads.map(lead => {
                    const assignedUnit = units.find(unit => unit.assignedLeadId === lead.id)
                    return (
                      <Link
                        key={lead.id}
                        to={`/sales/leads/${lead.id}`}
                        draggable
                        onDragStart={() => setDragId(lead.id)}
                        className="block rounded-lg border border-gray-100 bg-gray-50 p-3 hover:border-gray-200 hover:bg-white"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-gray-900">{leadName(lead)}</div>
                          <Badge className={TEMP_COLORS[lead.temperature]}>{lead.temperature}</Badge>
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-gray-500">
                          <div>{lead.projectInterest} - {lead.buyerType}</div>
                          <div>{lead.assignedTo} - {lead.financeStatus}</div>
                          {assignedUnit && <div className="font-semibold text-forest-700">{assignedUnit.unitNumber}</div>}
                          <div className={isOverdue(lead.nextActionDate) ? 'font-semibold text-red-600' : ''}>{suggestedNextAction(lead)} - {formatShortDate(lead.nextActionDate)}</div>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <ProgressBar value={lead.probability} color="bg-ocean-500" />
                          <span className="text-xs font-bold text-gray-500">{lead.probability}%</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

function ProjectsPage() {
  const { projects, leads, units } = useSalesStore()
  return (
    <>
      <PageHeader title="Sales Projects" subtitle="Project-specific sales targets and inventory." />
      <div className="mx-auto grid max-w-7xl gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
        {projects.map(project => {
          const metrics = projectMetrics(project, leads, units)
          return (
            <Link key={project.id} to={`/sales/projects/${project.id}`} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm hover:border-gray-200 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-bold text-gray-900">{project.name}</h2>
                  <p className="text-sm text-gray-400">{project.location}</p>
                </div>
                <Badge className="bg-gray-100 text-gray-600">{project.status}</Badge>
              </div>
              <p className="mt-3 text-sm text-gray-600">{project.product}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <MetricMini label="Total" value={metrics.totalUnits} />
                <MetricMini label="Avail." value={metrics.availableUnits} />
                <MetricMini label="Reserved" value={metrics.reservedUnits} />
                <MetricMini label="Sold" value={metrics.soldUnits} />
                <MetricMini label="Presales" value={metrics.presalesAchieved} />
                <MetricMini label="Gap" value={metrics.presalesGap} />
              </div>
              <div className="mt-4"><ProgressBar value={metrics.progress} /></div>
              <div className="mt-3 text-xs text-gray-500">{metrics.hotLeads} hot leads</div>
            </Link>
          )
        })}
      </div>
    </>
  )
}

function ProjectSalesDetailPage() {
  const { projectId } = useParams()
  const { projects, leads, units, tasks, activities, updateProject } = useSalesStore()
  const project = projects.find(item => item.id === projectId)
  const [tab, setTab] = useState('Overview')
  if (!project) return <NotFound back="/sales/projects" label="Project not found" />
  const projectLeads = leads.filter(lead => !lead.archived && lead.projectInterest?.includes(project.name))
  const projectUnits = units.filter(unit => unit.projectId === project.id)
  const projectTasks = tasks.filter(task => task.relatedProjectId === project.id)
  const metrics = projectMetrics(project, projectLeads, units)
  const tabs = ['Overview', 'Leads', 'Units', 'Documents', 'Tasks', 'Sales Settings']
  return (
    <>
      <PageHeader
        title={project.name}
        subtitle={`${project.location} - ${project.product}`}
        action={<Link to="/sales/projects" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"><ArrowLeft size={14} /> Projects</Link>}
      />
      <div className="border-b border-gray-100 bg-white px-6">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto">
          {tabs.map(item => <button key={item} onClick={() => setTab(item)} className={`px-4 py-3 text-sm font-semibold ${tab === item ? 'border-b-2 border-forest-600 text-forest-700' : 'text-gray-500'}`}>{item}</button>)}
        </div>
      </div>
      <div className="mx-auto max-w-7xl p-6">
        {tab === 'Overview' && (
          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="font-bold text-gray-900">Project Summary</h2>
                <p className="mt-2 text-sm text-gray-600">{project.description}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <MetricCard label="Presales required" value={project.presalesRequired} />
                  <MetricCard label="Achieved" value={metrics.presalesAchieved} />
                  <MetricCard label="Gap" value={metrics.presalesGap} />
                  <MetricCard label="Likely" value={metrics.likelyPresales} />
                </div>
                <div className="mt-4"><ProgressBar value={metrics.progress} /></div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="font-bold text-gray-900">Unit Status Summary</h2>
                <CountList title="Units" counts={groupCounts(projectUnits, unit => unit.status)} />
              </div>
            </div>
            <div className="space-y-4">
              <PanelList title="Hot leads" items={projectLeads.filter(lead => lead.temperature === 'Hot')} label={item => leadName(item)} to={item => `/sales/leads/${item.id}`} />
              <PanelList title="Warm leads" items={projectLeads.filter(lead => lead.temperature === 'Warm')} label={item => leadName(item)} to={item => `/sales/leads/${item.id}`} />
              <PanelList title="Recent activity" items={activities.filter(activity => projectLeads.some(lead => lead.id === activity.leadId)).slice(0, 5)} label={item => item.title} />
              <PanelList title="Next actions" items={projectLeads.filter(lead => lead.nextActionDate).sort((a, b) => a.nextActionDate.localeCompare(b.nextActionDate)).slice(0, 5)} label={item => `${leadName(item)} - ${suggestedNextAction(item)}`} to={item => `/sales/leads/${item.id}`} />
            </div>
          </div>
        )}
        {tab === 'Leads' && <LeadsTable projectName={project.name} />}
        {tab === 'Units' && <UnitsTable projectId={project.id} />}
        {tab === 'Documents' && <ProjectDocumentsForm project={project} updateProject={updateProject} />}
        {tab === 'Tasks' && <TasksTable projectId={project.id} />}
        {tab === 'Sales Settings' && <ProjectSalesSettingsForm project={project} updateProject={updateProject} />}
      </div>
    </>
  )
}

function PanelList({ title, items, label, to }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? <div className="text-sm text-gray-400">None</div> : items.map(item => {
          const body = <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">{label(item)}</div>
          return to ? <Link key={item.id} to={to(item)}>{body}</Link> : <div key={item.id}>{body}</div>
        })}
      </div>
    </div>
  )
}

function ProjectDocumentsForm({ project, updateProject }) {
  const [form, setForm] = useState({
    defaultBrochureLink: project.defaultBrochureLink || '',
    defaultPlansLink: project.defaultPlansLink || '',
    defaultDriveFolderLink: project.defaultDriveFolderLink || '',
    defaultPriceListLink: project.defaultPriceListLink || '',
    defaultRentalAppraisalLink: project.defaultRentalAppraisalLink || '',
    defaultValuationSummaryLink: project.defaultValuationSummaryLink || '',
    defaultSpaInstructionsLink: project.defaultSpaInstructionsLink || '',
  })
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="font-bold text-gray-900">Project Sales Documents</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {[
          ['defaultBrochureLink', 'Brochure link'],
          ['defaultPlansLink', 'Plans link'],
          ['defaultDriveFolderLink', 'Google Drive folder'],
          ['defaultPriceListLink', 'Price list'],
          ['defaultRentalAppraisalLink', 'Rental appraisal'],
          ['defaultValuationSummaryLink', 'Valuation summary'],
          ['defaultSpaInstructionsLink', 'S&P instructions'],
        ].map(([key, label]) => (
          <Field key={key} label={label}><input className={inputCls} value={form[key]} onChange={e => set(key, e.target.value)} placeholder="https://..." /></Field>
        ))}
      </div>
      <button onClick={() => updateProject(project.id, form)} className="mt-4 rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-white">Save links</button>
    </div>
  )
}

function ProjectSalesSettingsForm({ project, updateProject }) {
  const [form, setForm] = useState({
    presalesRequired: project.presalesRequired,
    defaultAssignee: project.defaultAssignee || 'Tim',
    projectNotes: project.projectNotes || '',
  })
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="font-bold text-gray-900">Sales Settings</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label="Presales required"><input type="number" className={inputCls} value={form.presalesRequired} onChange={e => set('presalesRequired', Number(e.target.value))} /></Field>
        <Field label="Default assignee"><Select value={form.defaultAssignee} onChange={value => set('defaultAssignee', value)} options={ASSIGNEES} placeholder="Default assignee" /></Field>
      </div>
      <Field label="Project sales notes"><textarea className={`${inputCls} min-h-28`} value={form.projectNotes} onChange={e => set('projectNotes', e.target.value)} /></Field>
      <button onClick={() => updateProject(project.id, form)} className="mt-4 rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-white">Save settings</button>
    </div>
  )
}

function UnitsPage() {
  return (
    <>
      <PageHeader title="Sales Units" subtitle="Global sales inventory across Sales Hub projects." />
      <div className="mx-auto max-w-7xl p-6">
        <UnitsTable />
      </div>
    </>
  )
}

function UnitsTable({ projectId = '' }) {
  const { units, projects, updateUnit } = useSalesStore()
  const [filters, setFilters] = useState({ projectId, status: '', bedrooms: '', assigned: '', priceRange: '' })
  const [sort, setSort] = useState('unit')
  const filtered = useMemo(() => {
    return [...units].filter(unit => {
      if (projectId && unit.projectId !== projectId) return false
      if (filters.projectId && unit.projectId !== filters.projectId) return false
      if (filters.status && unit.status !== filters.status) return false
      if (filters.bedrooms && String(unit.bedrooms) !== String(filters.bedrooms)) return false
      if (filters.assigned && !unit.assignedBuyerName.toLowerCase().includes(filters.assigned.toLowerCase())) return false
      return true
    }).sort((a, b) => {
      if (sort === 'price') return Number(a.price || 0) - Number(b.price || 0)
      if (sort === 'status') return a.status.localeCompare(b.status)
      return `${a.projectName}${a.unitNumber}`.localeCompare(`${b.projectName}${b.unitNumber}`, undefined, { numeric: true })
    })
  }, [units, filters, sort, projectId])
  const setFilter = (key, value) => setFilters(current => ({ ...current, [key]: value }))
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {!projectId && <Select value={filters.projectId} onChange={value => setFilter('projectId', value)} options={projects.map(p => [p.id, p.name])} placeholder="All projects" />}
        <Select value={filters.status} onChange={value => setFilter('status', value)} options={UNIT_STATUSES} placeholder="Status" />
        <Select value={filters.bedrooms} onChange={value => setFilter('bedrooms', value)} options={['1', '2', '3']} placeholder="Bedrooms" />
        <input className={`${inputCls} w-56`} value={filters.assigned} onChange={e => setFilter('assigned', e.target.value)} placeholder="Assigned buyer" />
        <Select value={sort} onChange={setSort} options={[['unit', 'Unit number'], ['price', 'Price'], ['status', 'Status']]} placeholder="Sort" />
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
              <tr>{['Project', 'Unit', 'Typology', 'Beds', 'Baths', 'Cars', 'Price', 'Rent', 'Yield', 'Status', 'Buyer', 'Deposit', 'S&P', 'Conditions', 'Settlement', 'Expiry', 'Notes', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(unit => (
                <tr key={unit.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{unit.projectName}</td>
                  <td className="px-4 py-3"><Link to={`/sales/units/${unit.id}`} className="font-semibold text-gray-900 hover:text-ocean-700">{unit.unitNumber}</Link></td>
                  <td className="px-4 py-3 text-gray-600">{unit.typology}</td>
                  <td className="px-4 py-3">{unit.bedrooms}</td>
                  <td className="px-4 py-3">{unit.bathrooms}</td>
                  <td className="px-4 py-3">{unit.carparks}</td>
                  <td className="px-4 py-3 font-semibold">{money(unit.price)}</td>
                  <td className="px-4 py-3 text-gray-600">{unit.rentalAppraisal || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{unit.grossYield ? `${unit.grossYield}%` : '-'}</td>
                  <td className="px-4 py-3"><Badge className={UNIT_STATUS_COLORS[unit.status]}>{unit.status}</Badge></td>
                  <td className="px-4 py-3 text-gray-600">{unit.assignedBuyerName || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{unit.depositStatus}</td>
                  <td className="px-4 py-3 text-gray-600">{unit.spaStatus}</td>
                  <td className="px-4 py-3 text-gray-600">{unit.conditionsStatus}</td>
                  <td className="px-4 py-3 text-gray-600">{unit.settlementStatus}</td>
                  <td className="px-4 py-3 text-gray-600">{formatShortDate(unit.reservationExpiryDate)}</td>
                  <td className="px-4 py-3 text-gray-500">{unit.notes}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <RowButton to={`/sales/units/${unit.id}`}>Open</RowButton>
                      <RowButton onClick={() => updateUnit(unit.id, { status: 'Reserved' })}>Reserve</RowButton>
                      <RowButton onClick={() => updateUnit(unit.id, { status: 'S&P Out', spaStatus: 'Sent' })}>S&P out</RowButton>
                      <RowButton onClick={() => updateUnit(unit.id, { status: 'Under Contract' })}>Contract</RowButton>
                      <RowButton onClick={() => updateUnit(unit.id, { status: 'Deposit Paid', depositStatus: 'Paid' })}>Deposit</RowButton>
                      <RowButton onClick={() => updateUnit(unit.id, { status: 'Unconditional', conditionsStatus: 'Satisfied' })}>Uncond.</RowButton>
                      <RowButton onClick={() => updateUnit(unit.id, { status: 'Settled', settlementStatus: 'Settled' })}>Settled</RowButton>
                      <RowButton onClick={() => updateUnit(unit.id, { status: 'Available', assignedLeadId: '', assignedBuyerName: '' })}>Available</RowButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function UnitDetailPage() {
  const { unitId } = useParams()
  const { units, leads, tasks, updateUnit, assignUnitToLead } = useSalesStore()
  const unit = units.find(item => item.id === unitId)
  const [leadId, setLeadId] = useState(unit?.assignedLeadId || '')
  if (!unit) return <NotFound back="/sales/units" label="Unit not found" />
  const assignedLead = leads.find(lead => lead.id === unit.assignedLeadId)
  const relatedTasks = tasks.filter(task => task.relatedUnitId === unit.id)
  return (
    <>
      <PageHeader title={`${unit.projectName} ${unit.unitNumber}`} subtitle={`${unit.typology} - ${money(unit.price)}`} action={<Link to="/sales/units" className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600">Back to units</Link>} />
      <div className="mx-auto grid max-w-7xl gap-6 p-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-gray-900">Unit Details</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <MetricCard label="Status" value={unit.status} />
              <MetricCard label="Deposit" value={unit.depositStatus} />
              <MetricCard label="S&P" value={unit.spaStatus} />
              <MetricCard label="Conditions" value={unit.conditionsStatus} />
              <MetricCard label="Settlement" value={unit.settlementStatus} />
              <MetricCard label="Yield" value={unit.grossYield ? `${unit.grossYield}%` : '-'} />
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-gray-900">Assign Lead</h2>
            <div className="mt-3 flex gap-3">
              <select className={inputCls} value={leadId} onChange={e => setLeadId(e.target.value)}>
                <option value="">Select lead</option>
                {leads.filter(lead => !lead.archived).map(lead => <option key={lead.id} value={lead.id}>{leadName(lead)} - {lead.projectInterest}</option>)}
              </select>
              <button onClick={() => leadId && assignUnitToLead(leadId, unit.id)} className="rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-white">Assign</button>
            </div>
            {assignedLead && <p className="mt-3 text-sm text-gray-500">Assigned to <Link className="font-semibold text-ocean-600" to={`/sales/leads/${assignedLead.id}`}>{leadName(assignedLead)}</Link></p>}
          </div>
          <PanelList title="Related tasks" items={relatedTasks} label={task => `${task.title} - ${task.status}`} />
        </div>
        <QuickUnitActions unit={unit} updateUnit={updateUnit} />
      </div>
    </>
  )
}

function QuickUnitActions({ unit, updateUnit }) {
  const actions = [
    ['Reserve unit', { status: 'Reserved' }],
    ['Mark S&P sent', { status: 'S&P Out', spaStatus: 'Sent' }],
    ['Mark signed', { status: 'Under Contract', spaStatus: 'Signed' }],
    ['Mark deposit paid', { status: 'Deposit Paid', depositStatus: 'Paid' }],
    ['Mark unconditional', { status: 'Unconditional', conditionsStatus: 'Satisfied' }],
    ['Mark settled', { status: 'Settled', settlementStatus: 'Settled' }],
  ]
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="font-bold text-gray-900">Quick Actions</h2>
      <div className="mt-4 space-y-2">
        {actions.map(([label, data]) => <button key={label} onClick={() => updateUnit(unit.id, data)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600 hover:bg-gray-50">{label}</button>)}
      </div>
    </div>
  )
}

function LeadDetailPage() {
  const { leadId } = useParams()
  const { leads, units, tasks, activities, templates, projects, settings, markContacted, markInfoSent, updateLead, moveLeadStage } = useSalesStore()
  const lead = leads.find(item => item.id === leadId)
  const [showTask, setShowTask] = useState(false)
  const [showUnit, setShowUnit] = useState(false)
  if (!lead) return <NotFound back="/sales/leads" label="Lead not found" />
  const assignedUnit = units.find(unit => unit.assignedLeadId === lead.id)
  const leadTasks = tasks.filter(task => task.relatedLeadId === lead.id)
  const timeline = activities.filter(activity => activity.leadId === lead.id)
  const project = projects.find(item => lead.projectInterest?.includes(item.name))
  const suggestedUnits = suggestedUnitsForLead(lead, units)
  const gmailHref = (settings.gmailSearchUrl || '').replace('{email}', encodeURIComponent(lead.email || lead.fullName))
  const templateContext = {
    leadName: leadName(lead),
    projectName: project?.name || lead.projectInterest,
    unitNumber: assignedUnit?.unitNumber || lead.preferredUnits?.[0] || '',
    brochureLink: project?.defaultBrochureLink || '',
    plansLink: project?.defaultPlansLink || '',
    assignedTo: lead.assignedTo,
    assignedPhone: lead.assignedTo === 'Dave' ? settings.davePhone : settings.timPhone,
    price: assignedUnit ? money(assignedUnit.price) : '',
    depositAmount: assignedUnit ? money(Number(assignedUnit.price || 0) * 0.1) : '',
  }
  const copyTemplate = template => navigator.clipboard?.writeText(`${renderTemplate(template.subject, templateContext)}\n\n${renderTemplate(template.body, templateContext)}`)
  return (
    <>
      <PageHeader title={leadName(lead)} subtitle={`${lead.projectInterest} - ${lead.buyerType}`} action={<Link to="/sales/leads" className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600">Back to leads</Link>} />
      <div className="mx-auto grid max-w-7xl gap-6 p-6 xl:grid-cols-[1.35fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={TEMP_COLORS[lead.temperature]}>{lead.temperature}</Badge>
              <Badge className={STAGE_COLORS[lead.pipelineStage]}>{lead.pipelineStage}</Badge>
              <Badge className="bg-gray-100 text-gray-600">{lead.assignedTo}</Badge>
              <Badge className="bg-ocean-50 text-ocean-700">{lead.probability}%</Badge>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <MetricCard label="Finance" value={lead.financeStatus} />
              <MetricCard label="Next action" value={suggestedNextAction(lead)} />
              <MetricCard label="Next date" value={formatShortDate(lead.nextActionDate)} />
              <MetricCard label="Calculated temp" value={calculatedTemperature(lead)} />
            </div>
          </div>
          <DetailSection title="Contact Details">
            <InfoGrid items={[['Email', lead.email], ['Phone', lead.phone], ['Source', lead.source], ['Created', formatDate(lead.createdAt)], ['Last contacted', formatDate(lead.lastContactedAt)]]} />
          </DetailSection>
          <DetailSection title="Buyer Profile">
            <InfoGrid items={[['Buyer type', lead.buyerType], ['Budget', lead.budgetRange], ['Deposit', lead.depositCapacity], ['Finance', lead.financeStatus], ['Broker required', lead.needsBrokerIntro ? 'Yes' : 'No'], ['Preferred project', lead.projectInterest]]} />
            <p className="mt-3 text-sm text-gray-600">{lead.notes}</p>
          </DetailSection>
          <DetailSection title="Unit Interest">
            {assignedUnit ? <InfoGrid items={[['Assigned unit', `${assignedUnit.projectName} ${assignedUnit.unitNumber}`], ['Status', assignedUnit.status], ['Price', money(assignedUnit.price)], ['Rent', assignedUnit.rentalAppraisal], ['Yield', assignedUnit.grossYield ? `${assignedUnit.grossYield}%` : '-'], ['Reservation expiry', formatShortDate(assignedUnit.reservationExpiryDate)]]} /> : <div className="text-sm text-gray-400">No assigned unit yet.</div>}
            <h3 className="mt-5 text-sm font-bold text-gray-900">Suggested Units</h3>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {suggestedUnits.map(unit => <Link key={unit.id} to={`/sales/units/${unit.id}`} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm hover:bg-white"><span className="font-semibold">{unit.projectName} {unit.unitNumber}</span> - {money(unit.price)}</Link>)}
            </div>
          </DetailSection>
          <DetailSection title="Activity Timeline">
            <div className="space-y-2">{timeline.length === 0 ? <div className="text-sm text-gray-400">No activity yet.</div> : timeline.map(item => <div key={item.id} className="rounded-lg bg-gray-50 p-3 text-sm"><div className="font-semibold text-gray-800">{item.title}</div><div className="text-gray-500">{item.description}</div><div className="mt-1 text-xs text-gray-400">{item.type} - {formatDate(item.createdAt)}</div></div>)}</div>
          </DetailSection>
        </div>
        <div className="space-y-4">
          <DetailSection title="Tasks">
            <button onClick={() => setShowTask(true)} className="mb-3 rounded-lg bg-forest-600 px-3 py-2 text-sm font-semibold text-white">Add task</button>
            <div className="space-y-2">{leadTasks.map(task => <div key={task.id} className="rounded-lg bg-gray-50 p-3 text-sm"><div className="font-semibold">{task.title}</div><div className="text-xs text-gray-500">{task.status} - {formatShortDate(task.dueDate)}</div></div>)}</div>
          </DetailSection>
          <DetailSection title="Buyer Pack Checklist">
            <div className="space-y-2">{buyerPackItems(lead).map(item => <div key={item.key} className="flex items-center gap-2 text-sm"><CheckCircle2 size={15} className={item.done ? 'text-green-600' : 'text-gray-300'} /> {item.label}</div>)}</div>
          </DetailSection>
          <DetailSection title="Email / Actions">
            <div className="grid gap-2">
              <ActionButton onClick={() => markContacted(lead.id)} icon={Phone}>Mark as contacted</ActionButton>
              <ActionButton onClick={() => markInfoSent(lead.id)} icon={FileText}>Mark info sent</ActionButton>
              <ActionButton onClick={() => setShowUnit(true)} icon={FolderKanban}>Assign unit</ActionButton>
              <a href={gmailHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"><Mail size={15} /> Open Gmail search/thread</a>
              <Select value={lead.pipelineStage} onChange={value => moveLeadStage(lead.id, value)} options={PIPELINE_STAGES} placeholder="Move stage" />
              {templates.slice(0, 8).map(template => <button key={template.id} onClick={() => copyTemplate(template)} className="rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600 hover:bg-gray-50"><ClipboardCopy size={14} className="mr-2 inline" /> Copy {template.name}</button>)}
            </div>
          </DetailSection>
        </div>
      </div>
      {showTask && <TaskModal lead={lead} onClose={() => setShowTask(false)} />}
      {showUnit && <AssignUnitModal lead={lead} onClose={() => setShowUnit(false)} />}
    </>
  )
}

function ActionButton({ children, onClick, icon: Icon }) {
  return <button onClick={onClick} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"><Icon size={15} /> {children}</button>
}

function InfoGrid({ items }) {
  return <div className="grid gap-3 md:grid-cols-2">{items.map(([label, value]) => <div key={label}><div className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</div><div className="mt-1 text-sm font-medium text-gray-800">{value || '-'}</div></div>)}</div>
}

function DetailSection({ title, children }) {
  return <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"><h2 className="mb-4 font-bold text-gray-900">{title}</h2>{children}</div>
}

function AssignUnitModal({ lead, onClose }) {
  const { units, assignUnitToLead } = useSalesStore()
  const [unitId, setUnitId] = useState('')
  const available = units.filter(unit => ['Available', 'Enquiry', 'Reserved'].includes(unit.status) && (!lead.projectInterest || lead.projectInterest.includes(unit.projectName)))
  return (
    <Modal title={`Assign unit to ${leadName(lead)}`} onClose={onClose} footer={<><button onClick={onClose} className="text-sm text-gray-500">Cancel</button><button onClick={async () => { if (unitId) await assignUnitToLead(lead.id, unitId); onClose() }} className="rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-white">Assign unit</button></>}>
      <select className={inputCls} value={unitId} onChange={e => setUnitId(e.target.value)}>
        <option value="">Select unit</option>
        {available.map(unit => <option key={unit.id} value={unit.id}>{unit.projectName} {unit.unitNumber} - {unit.status} - {money(unit.price)}</option>)}
      </select>
    </Modal>
  )
}

function TasksPage() {
  return (
    <>
      <PageHeader title="Sales Tasks" subtitle="Today, overdue, upcoming, and completed sales actions." />
      <div className="mx-auto max-w-7xl p-6"><TasksTable /></div>
    </>
  )
}

function TasksTable({ projectId = '' }) {
  const { tasks, leads, units, projects, completeTask, deleteTask } = useSalesStore()
  const [filter, setFilter] = useState({ assignedTo: '', projectId, priority: '', status: '', due: '' })
  const [showTask, setShowTask] = useState(false)
  const filtered = tasks.filter(task => {
    if (projectId && task.relatedProjectId !== projectId) return false
    if (filter.assignedTo && task.assignedTo !== filter.assignedTo) return false
    if (filter.projectId && task.relatedProjectId !== filter.projectId) return false
    if (filter.priority && task.priority !== filter.priority) return false
    if (filter.status && task.status !== filter.status) return false
    if (filter.due === 'today' && task.dueDate !== todayISO()) return false
    if (filter.due === 'overdue' && !isOverdue(task.dueDate)) return false
    if (filter.due === 'upcoming' && task.dueDate <= todayISO()) return false
    return true
  })
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button onClick={() => setShowTask(true)} className="inline-flex items-center gap-2 rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-white"><Plus size={15} /> Add task</button>
        <Select value={filter.assignedTo} onChange={value => setFilter(f => ({ ...f, assignedTo: value }))} options={ASSIGNEES} placeholder="Assigned" />
        {!projectId && <Select value={filter.projectId} onChange={value => setFilter(f => ({ ...f, projectId: value }))} options={projects.map(p => [p.id, p.name])} placeholder="Project" />}
        <Select value={filter.priority} onChange={value => setFilter(f => ({ ...f, priority: value }))} options={TASK_PRIORITIES} placeholder="Priority" />
        <Select value={filter.status} onChange={value => setFilter(f => ({ ...f, status: value }))} options={TASK_STATUSES} placeholder="Status" />
        <Select value={filter.due} onChange={value => setFilter(f => ({ ...f, due: value }))} options={[['today', 'Due today'], ['overdue', 'Overdue'], ['upcoming', 'Upcoming']]} placeholder="Due date" />
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400"><tr>{['Task', 'Lead', 'Project', 'Unit', 'Assigned', 'Priority', 'Due', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(task => {
              const lead = leads.find(item => item.id === task.relatedLeadId)
              const unit = units.find(item => item.id === task.relatedUnitId)
              const project = projects.find(item => item.id === task.relatedProjectId)
              return (
                <tr key={task.id}>
                  <td className="px-4 py-3 font-semibold text-gray-900">{task.title}</td>
                  <td className="px-4 py-3">{lead ? <Link className="text-ocean-600" to={`/sales/leads/${lead.id}`}>{leadName(lead)}</Link> : '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{project?.name || '-'}</td>
                  <td className="px-4 py-3">{unit ? <Link className="text-ocean-600" to={`/sales/units/${unit.id}`}>{unit.unitNumber}</Link> : '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{task.assignedTo}</td>
                  <td className="px-4 py-3 text-gray-600">{task.priority}</td>
                  <td className={`px-4 py-3 ${isOverdue(task.dueDate) && task.status !== 'Complete' ? 'font-semibold text-red-600' : 'text-gray-600'}`}>{formatShortDate(task.dueDate)}</td>
                  <td className="px-4 py-3">{task.status}</td>
                  <td className="px-4 py-3"><div className="flex gap-1"><RowButton onClick={() => completeTask(task.id)}>Complete</RowButton><RowButton onClick={() => deleteTask(task.id)}>Delete</RowButton></div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {showTask && <TaskModal onClose={() => setShowTask(false)} />}
    </div>
  )
}

function TaskModal({ lead, onClose }) {
  const { addTask, projects, units } = useSalesStore()
  const project = projects.find(item => lead?.projectInterest?.includes(item.name))
  const [form, setForm] = useState({ title: '', description: '', relatedLeadId: lead?.id || '', relatedProjectId: project?.id || '', relatedUnitId: '', assignedTo: lead?.assignedTo || 'Tim', dueDate: todayISO(), priority: 'Medium', status: 'Open' })
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const save = async () => {
    if (!form.title.trim()) return
    await addTask(form)
    onClose()
  }
  return (
    <Modal title="Create sales task" onClose={onClose} footer={<><button onClick={onClose} className="text-sm text-gray-500">Cancel</button><button onClick={save} className="rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-white">Save task</button></>}>
      <Field label="Title"><input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} /></Field>
      <Field label="Description"><textarea className={`${inputCls} min-h-20`} value={form.description} onChange={e => set('description', e.target.value)} /></Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Project"><Select value={form.relatedProjectId} onChange={value => set('relatedProjectId', value)} options={projects.map(p => [p.id, p.name])} placeholder="Project" /></Field>
        <Field label="Unit"><Select value={form.relatedUnitId} onChange={value => set('relatedUnitId', value)} options={units.map(u => [u.id, `${u.projectName} ${u.unitNumber}`])} placeholder="Unit" /></Field>
        <Field label="Assigned"><Select value={form.assignedTo} onChange={value => set('assignedTo', value)} options={ASSIGNEES} placeholder="Assigned" /></Field>
        <Field label="Due date"><input type="date" className={inputCls} value={form.dueDate} onChange={e => set('dueDate', e.target.value)} /></Field>
        <Field label="Priority"><Select value={form.priority} onChange={value => set('priority', value)} options={TASK_PRIORITIES} placeholder="Priority" /></Field>
        <Field label="Status"><Select value={form.status} onChange={value => set('status', value)} options={TASK_STATUSES} placeholder="Status" /></Field>
      </div>
    </Modal>
  )
}

function TemplatesPage() {
  const { templates, updateTemplate, leads, projects, units, settings } = useSalesStore()
  const [selected, setSelected] = useState(templates[0] || null)
  const [edit, setEdit] = useState(null)
  const sampleLead = leads[0]
  const sampleProject = projects.find(p => sampleLead?.projectInterest?.includes(p.name)) || projects[0]
  const sampleUnit = units.find(unit => unit.projectId === sampleProject?.id)
  const context = { leadName: leadName(sampleLead), projectName: sampleProject?.name, unitNumber: sampleUnit?.unitNumber, brochureLink: sampleProject?.defaultBrochureLink, plansLink: sampleProject?.defaultPlansLink, assignedTo: sampleLead?.assignedTo || 'Tim', assignedPhone: settings.timPhone, price: money(sampleUnit?.price), depositAmount: money(Number(sampleUnit?.price || 0) * 0.1) }
  const copy = template => navigator.clipboard?.writeText(`${renderTemplate(template.subject, context)}\n\n${renderTemplate(template.body, context)}`)
  return (
    <>
      <PageHeader title="Sales Email Templates" subtitle="Copy-ready sales responses with merge tags." />
      <div className="mx-auto grid max-w-7xl gap-6 p-6 xl:grid-cols-[360px_1fr]">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="space-y-2">{templates.map(template => <button key={template.id} onClick={() => setSelected(template)} className={`w-full rounded-lg px-3 py-2 text-left text-sm ${selected?.id === template.id ? 'bg-forest-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}>{template.name}<div className="text-xs opacity-70">{template.category}</div></button>)}</div>
        </div>
        {selected && (
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="font-bold text-gray-900">{selected.name}</h2><p className="text-sm text-gray-400">{selected.category} - {selected.project || 'All projects'}</p></div>
              <div className="flex gap-2"><button onClick={() => copy(selected)} className="rounded-lg bg-forest-600 px-3 py-2 text-sm font-semibold text-white">Copy</button><button onClick={() => setEdit(selected)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600">Edit</button></div>
            </div>
            <div className="mt-5 rounded-lg bg-gray-50 p-4">
              <div className="text-xs font-semibold uppercase text-gray-400">Subject</div>
              <div className="mt-1 font-semibold text-gray-900">{renderTemplate(selected.subject, context)}</div>
              <div className="mt-4 text-xs font-semibold uppercase text-gray-400">Body</div>
              <pre className="mt-1 whitespace-pre-wrap font-sans text-sm text-gray-700">{renderTemplate(selected.body, context)}</pre>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">{MERGE_TAGS.map(tag => <Badge key={tag} className="bg-gray-100 text-gray-600">{tag}</Badge>)}</div>
          </div>
        )}
      </div>
      {edit && <TemplateModal template={edit} onClose={() => setEdit(null)} onSave={async data => { await updateTemplate(edit.id, data); setEdit(null); setSelected({ ...edit, ...data }) }} />}
    </>
  )
}

function TemplateModal({ template, onSave, onClose }) {
  const [form, setForm] = useState(template)
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  return (
    <Modal title="Edit template" onClose={onClose} wide footer={<><button onClick={onClose} className="text-sm text-gray-500">Cancel</button><button onClick={() => onSave(form)} className="rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-white">Save template</button></>}>
      <Field label="Name"><input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} /></Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Category"><Select value={form.category} onChange={value => set('category', value)} options={TEMPLATE_CATEGORIES} placeholder="Category" /></Field>
        <Field label="Project"><input className={inputCls} value={form.project} onChange={e => set('project', e.target.value)} /></Field>
      </div>
      <Field label="Subject"><input className={inputCls} value={form.subject} onChange={e => set('subject', e.target.value)} /></Field>
      <Field label="Body"><textarea className={`${inputCls} min-h-64`} value={form.body} onChange={e => set('body', e.target.value)} /></Field>
    </Modal>
  )
}

function ReportsPage() {
  const { leads, units, projects } = useSalesStore()
  const activeLeads = leads.filter(lead => !lead.archived)
  const reports = [
    ['Leads by source', groupCounts(activeLeads, lead => lead.source)],
    ['Leads by project', groupCounts(activeLeads, lead => lead.projectInterest)],
    ['Leads by buyer type', groupCounts(activeLeads, lead => lead.buyerType)],
    ['Leads by assigned person', groupCounts(activeLeads, lead => lead.assignedTo)],
    ['Leads by temperature', groupCounts(activeLeads, lead => lead.temperature)],
    ['Leads by pipeline stage', groupCounts(activeLeads, lead => lead.pipelineStage)],
    ['Units by status', groupCounts(units, unit => unit.status)],
    ['Lost leads by reason', groupCounts(activeLeads.filter(lead => lead.pipelineStage === 'Lost / Not Now'), lead => lead.lostReason || 'No reason')],
  ]
  const hotStale = activeLeads.filter(lead => lead.temperature === 'Hot' && !lead.nextActionDate)
  const spUnsigned = units.filter(unit => unit.status === 'S&P Out' || unit.spaStatus === 'Sent')
  const depositsPending = units.filter(unit => unit.depositStatus === 'Requested' || unit.depositStatus === 'Pending')
  return (
    <>
      <PageHeader title="Sales Reports" subtitle="Simple reporting tables for sales control." />
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          {projects.map(project => {
            const metrics = projectMetrics(project, activeLeads, units)
            return <MetricCard key={project.id} label={`${project.name} presales`} value={`${metrics.presalesAchieved}/${project.presalesRequired}`} hint={`${metrics.presalesGap} gap`} />
          })}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{reports.map(([title, counts]) => <div key={title} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"><CountList title={title} counts={counts} /></div>)}</div>
        <div className="grid gap-4 xl:grid-cols-3">
          <PanelList title="Hot leads with no recent contact" items={hotStale} label={item => leadName(item)} to={item => `/sales/leads/${item.id}`} />
          <PanelList title="S&P sent but unsigned" items={spUnsigned} label={item => `${item.projectName} ${item.unitNumber}`} to={item => `/sales/units/${item.id}`} />
          <PanelList title="Deposits pending" items={depositsPending} label={item => `${item.projectName} ${item.unitNumber}`} to={item => `/sales/units/${item.id}`} />
        </div>
      </div>
    </>
  )
}

function SettingsPage() {
  const { settings, projects, updateSettings, updateProject } = useSalesStore()
  const [form, setForm] = useState(settings)
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const setSheet = (key, value) => setForm(current => ({ ...current, googleSheets: { ...(current.googleSheets || {}), [key]: value } }))
  return (
    <>
      <PageHeader title="Sales Hub Settings" subtitle="Local settings for Sales Hub only." />
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-gray-900">Email Settings</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label="Default sender"><input className={inputCls} value={form.defaultSenderName || ''} onChange={e => set('defaultSenderName', e.target.value)} /></Field>
              <Field label="Gmail search URL"><input className={inputCls} value={form.gmailSearchUrl || ''} onChange={e => set('gmailSearchUrl', e.target.value)} /></Field>
              <Field label="Tim phone"><input className={inputCls} value={form.timPhone || ''} onChange={e => set('timPhone', e.target.value)} /></Field>
              <Field label="Dave phone"><input className={inputCls} value={form.davePhone || ''} onChange={e => set('davePhone', e.target.value)} /></Field>
            </div>
            <button onClick={() => updateSettings(form)} className="mt-4 rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-white">Save email settings</button>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-gray-900">Google Sheets Sync</h2>
            <p className="mt-1 text-sm text-gray-400">Coming soon - not connected yet.</p>
            <div className="mt-4 grid gap-3">
              {[
                ['leadsSheetUrl', 'Leads Sheet URL'],
                ['unitsSheetUrl', 'Units Sheet URL'],
                ['salesSheetUrl', 'Sales Sheet URL'],
                ['invoicesSheetUrl', 'Invoices Sheet URL'],
              ].map(([key, label]) => <Field key={key} label={label}><input className={inputCls} value={form.googleSheets?.[key] || ''} onChange={e => setSheet(key, e.target.value)} /></Field>)}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">{['Sync leads', 'Sync units', 'Push sale status', 'Pull new enquiries'].map(label => <button key={label} disabled className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-300">{label} - Coming soon</button>)}</div>
            <button onClick={() => updateSettings(form)} className="mt-4 rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-white">Save sync placeholders</button>
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-gray-900">Default Projects</h2>
          <div className="mt-4 grid gap-3 xl:grid-cols-3">{projects.map(project => <ProjectSalesSettingsForm key={project.id} project={project} updateProject={updateProject} />)}</div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-gray-900">Sales Hub Option Lists</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <OptionList title="Pipeline stages" items={PIPELINE_STAGES} />
            <OptionList title="Lead sources" items={LEAD_SOURCES} />
            <OptionList title="Buyer types" items={BUYER_TYPES} />
            <OptionList title="Finance statuses" items={FINANCE_STATUSES} />
            <OptionList title="Temperatures" items={TEMPERATURES} />
            <OptionList title="Unit statuses" items={UNIT_STATUSES} />
          </div>
        </div>
      </div>
    </>
  )
}

function OptionList({ title, items }) {
  return <div><div className="text-xs font-bold uppercase tracking-wide text-gray-400">{title}</div><div className="mt-2 flex flex-wrap gap-1.5">{items.map(item => <Badge key={item} className="bg-gray-100 text-gray-600">{item}</Badge>)}</div></div>
}

function Field({ label, children }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>{children}</label>
}

function Modal({ title, children, footer, onClose, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ${wide ? 'max-w-3xl' : 'max-w-2xl'}`}>
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <h2 className="font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-600"><X size={17} /></button>
        </div>
        <div className="space-y-4 px-6 py-5">{children}</div>
        {footer && <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-gray-100 bg-white px-6 py-4">{footer}</div>}
      </div>
    </div>
  )
}

function NotFound({ back, label }) {
  return <div className="flex h-full items-center justify-center"><div className="text-center"><p className="mb-3 text-gray-400">{label}</p><Link to={back} className="text-sm font-semibold text-ocean-600">Back</Link></div></div>
}

export default SalesShell
