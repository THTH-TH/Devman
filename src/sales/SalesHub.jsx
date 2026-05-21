import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useParams } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  LayoutDashboard,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Table2,
  Trash2,
  X,
} from 'lucide-react'
import useSalesStore from './useSalesStore'
import {
  ASSIGNEES,
  BUYER_TYPES,
  FINANCE_STATUSES,
  LEAD_SOURCES,
  PIPELINE_CLOSED_STAGE,
  PIPELINE_CLOSE_STAGES,
  PIPELINE_NEW_STAGE,
  PIPELINE_STAGES,
  PIPELINE_WON_STAGE,
  SALES_NAV,
  STAGE_COLORS,
  TEMP_COLORS,
  TEMPERATURES,
  UNIT_STATUS_COLORS,
} from './salesConstants'
import {
  buildTodayActions,
  buyerPackItems,
  calculatedTemperature,
  daysSince,
  formatDate,
  formatShortDate,
  isOverdue,
  leadName,
  money,
  projectMetrics,
  sortLeads,
  suggestedNextAction,
  todayISO,
} from './salesUtils'

const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100'

function Badge({ children, className = 'bg-gray-100 text-gray-600' }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}>{children}</span>
}

function Button({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${className || 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
    >
      {children}
    </button>
  )
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select className={inputCls} value={value || ''} onChange={event => onChange(event.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(option => {
        const value = Array.isArray(option) ? option[0] : option
        const label = Array.isArray(option) ? option[1] : option
        return <option key={value} value={value}>{label}</option>
      })}
    </select>
  )
}

function PageHeader({ title, subtitle, action }) {
  return (
    <div className="border-b border-gray-100 bg-white px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  )
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
  return <div className="h-2 overflow-hidden rounded-full bg-gray-200"><div className={`h-full ${color}`} style={{ width: `${pct}%` }} /></div>
}

function SalesShell() {
  const { initialized, loading, error, initialize, leads } = useSalesStore()
  const [selectedLeadId, setSelectedLeadId] = useState(null)
  const [showAddLead, setShowAddLead] = useState(false)
  const selectedLead = leads.find(lead => lead.id === selectedLeadId)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (selectedLeadId && !selectedLead) setSelectedLeadId(null)
  }, [selectedLeadId, selectedLead])

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-100 p-6">
        <div className="max-w-lg rounded-xl border border-red-100 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold text-gray-900">Sales Hub needs the latest Supabase migration</h1>
          <p className="mt-2 text-sm text-red-600">{error}</p>
          <p className="mt-4 text-sm text-gray-500">Run the latest `sales_hub_simplified_sheets` migration, then refresh.</p>
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

  const openLead = id => setSelectedLeadId(id)

  return (
    <div className="flex h-full flex-col bg-gray-100">
      <div className="border-b border-gray-100 bg-white px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-1 overflow-x-auto py-2">
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
          <Button onClick={() => setShowAddLead(true)} className="bg-forest-600 text-white hover:bg-forest-700">
            <Plus size={15} /> Add lead
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <Routes>
          <Route index element={<SalesDashboard openLead={openLead} />} />
          <Route path="projects" element={<ProjectsPage openLead={openLead} />} />
          <Route path="projects/:projectId" element={<ProjectSalesPage openLead={openLead} onAddLead={() => setShowAddLead(true)} />} />
          <Route path="pipeline" element={<PipelinePage openLead={openLead} onAddLead={() => setShowAddLead(true)} />} />
          <Route path="leads" element={<LeadsPage openLead={openLead} />} />
          <Route path="leads/:leadId" element={<LeadDeepLink openLead={openLead} />} />
          <Route path="presales" element={<PresalesPage openLead={openLead} />} />
          <Route path="sheets" element={<SheetSyncPage />} />
          <Route path="units/*" element={<Navigate to="/sales/presales" replace />} />
          <Route path="tasks/*" element={<Navigate to="/sales" replace />} />
          <Route path="templates/*" element={<Navigate to="/sales" replace />} />
          <Route path="reports/*" element={<Navigate to="/sales" replace />} />
          <Route path="settings/*" element={<Navigate to="/sales/sheets" replace />} />
          <Route path="*" element={<Navigate to="/sales" replace />} />
        </Routes>
      </div>

      {selectedLead && <LeadDrawer lead={selectedLead} onClose={() => setSelectedLeadId(null)} />}
      {showAddLead && <LeadModal onClose={() => setShowAddLead(false)} />}
    </div>
  )
}

function LeadDeepLink({ openLead }) {
  const { leadId } = useParams()
  useEffect(() => {
    if (leadId) openLead(leadId)
  }, [leadId, openLead])
  return <LeadsPage openLead={openLead} />
}

function SalesDashboard({ openLead }) {
  const { projects, leads, units, tasks, sheetConnections, syncRuns } = useSalesStore()
  const activeLeads = leads.filter(lead => !lead.archived && lead.pipelineStage !== PIPELINE_CLOSED_STAGE)
  const actions = buildTodayActions({ leads, units, tasks })
  const newThisWeek = activeLeads.filter(lead => new Date(lead.createdAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length
  const latestSync = syncRuns[0]
  const beachwaters = projects.find(project => project.id === 'beachwaters')
  const beachMetrics = beachwaters ? projectMetrics(beachwaters, activeLeads, units) : null

  return (
    <>
      <PageHeader title="Sales Hub" subtitle="Daily inbound lead cockpit" />
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
          <MetricCard label="Active leads" value={activeLeads.length} />
          <MetricCard label="New enquiries" value={activeLeads.filter(lead => lead.pipelineStage === PIPELINE_NEW_STAGE).length} hint={`${newThisWeek} this week`} />
          <MetricCard label="Hot leads" value={activeLeads.filter(lead => lead.temperature === 'Hot').length} tone="bg-red-50" />
          <MetricCard label="Calls today" value={actions.leadsToCall.length} />
          <MetricCard label="Overdue" value={actions.overdueFollowUps.length} tone={actions.overdueFollowUps.length ? 'bg-amber-50' : 'bg-white'} />
          <MetricCard label="Close to sale" value={activeLeads.filter(lead => PIPELINE_CLOSE_STAGES.includes(lead.pipelineStage)).length} />
        </div>

        <IntegrationStrip sheetConnections={sheetConnections} />

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">Today's Actions</h2>
                <p className="mt-1 text-sm text-gray-500">The leads that need attention first.</p>
              </div>
              <NavLink to="/sales/pipeline" className="text-sm font-semibold text-forest-700">Open pipeline</NavLink>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <ActionList title="Call today" leads={actions.leadsToCall} openLead={openLead} />
              <ActionList title="Overdue follow-ups" leads={actions.overdueFollowUps} openLead={openLead} urgent />
              <ActionList title="Hot and stale" leads={actions.staleHotLeads} openLead={openLead} />
              <ActionList title="Close to signing" leads={actions.closeLeads} openLead={openLead} />
            </div>
          </div>

          <div className="rounded-xl border border-forest-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-bold text-gray-900">Beachwaters Presales</h2>
                <p className="mt-1 text-sm text-gray-500">Funding focus: 5 presales required.</p>
              </div>
              <Badge className="bg-forest-50 text-forest-700">Priority</Badge>
            </div>
            {beachMetrics && (
              <>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <MiniStat label="Required" value="5" />
                  <MiniStat label="Achieved" value={beachMetrics.presalesAchieved} />
                  <MiniStat label="To go" value={Math.max(0, 5 - beachMetrics.presalesAchieved)} />
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs font-semibold text-gray-500">
                    <span>Presale progress</span>
                    <span>{beachMetrics.presalesAchieved}/5</span>
                  </div>
                  <ProgressBar value={(beachMetrics.presalesAchieved / 5) * 100} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-gray-50 p-3"><b>{beachMetrics.hotLeads}</b> hot leads</div>
                  <div className="rounded-lg bg-gray-50 p-3"><b>{beachMetrics.likelyPresales}</b> likely presales</div>
                  <div className="rounded-lg bg-gray-50 p-3"><b>{beachMetrics.spOut}</b> S&P out</div>
                  <div className="rounded-lg bg-gray-50 p-3"><b>{beachMetrics.depositPaid}</b> deposits</div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <RecentLeads title="New leads" leads={activeLeads.filter(lead => lead.pipelineStage === PIPELINE_NEW_STAGE).slice(0, 8)} openLead={openLead} />
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-gray-900">Sheet Sync</h2>
            <p className="mt-1 text-sm text-gray-500">
              {sheetConnections.length ? `${sheetConnections.length} lead sheet connection${sheetConnections.length === 1 ? '' : 's'}` : 'No lead sheets connected yet.'}
            </p>
            <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
              {latestSync ? (
                <div>
                  Last sync: <b>{latestSync.status}</b>, {latestSync.rowsCreated} created, {latestSync.rowsUpdated} updated, {latestSync.rowsSkipped} skipped.
                </div>
              ) : (
                <div>Connect a Google Sheet, preview the columns, then run Sync now.</div>
              )}
            </div>
            <NavLink to="/sales/sheets" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Configure sheets <ChevronRight size={14} />
            </NavLink>
          </div>
        </div>
      </div>
    </>
  )
}

function ActionList({ title, leads, openLead, urgent = false }) {
  return (
    <div className="rounded-lg border border-gray-100 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-wide text-gray-400">{title}</div>
        <Badge className={urgent && leads.length ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'}>{leads.length}</Badge>
      </div>
      <div className="space-y-1">
        {leads.length === 0 ? (
          <div className="text-sm text-gray-400">Clear</div>
        ) : leads.slice(0, 5).map(lead => (
          <button key={lead.id} onClick={() => openLead(lead.id)} className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-gray-50">
            <span className="truncate text-sm font-medium text-gray-800">{leadName(lead)}</span>
            <span className={`text-xs ${isOverdue(lead.nextActionDate) ? 'text-red-600' : 'text-gray-400'}`}>{formatShortDate(lead.nextActionDate)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function RecentLeads({ title, leads, openLead }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="font-bold text-gray-900">{title}</h2>
      <div className="mt-4 space-y-2">
        {leads.length === 0 ? <div className="text-sm text-gray-400">No leads in this bucket.</div> : leads.map(lead => (
          <button key={lead.id} onClick={() => openLead(lead.id)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2 text-left hover:bg-gray-50">
            <div>
              <div className="font-semibold text-gray-900">{leadName(lead)}</div>
              <div className="text-xs text-gray-500">{lead.source} - {lead.projectInterest || 'No project'}</div>
            </div>
            <Badge className={TEMP_COLORS[lead.temperature]}>{lead.temperature}</Badge>
          </button>
        ))}
      </div>
    </div>
  )
}

function MiniStat({ label, value }) {
  return <div className="rounded-lg bg-gray-50 p-3 text-center"><div className="text-xl font-bold text-gray-900">{value}</div><div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</div></div>
}

function IntegrationStrip({ sheetConnections }) {
  const tiles = [
    ['Google Sheets', sheetConnections.length ? `${sheetConnections.length} lead sheet${sheetConnections.length === 1 ? '' : 's'} linked` : 'Lead intake ready to connect', 'Connected intake', Table2],
    ['Gmail contacts', 'OAuth contact import next', 'Not connected yet', Mail],
    ['Facebook / Meta', 'Lead form source mapping', 'Coming soon', LayoutDashboard],
  ]
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-gray-900">Integrations</h2>
          <p className="mt-0.5 text-sm text-gray-500">Keep Sheets as the intake. Gmail contacts will be a separate connect step when we add contact OAuth.</p>
        </div>
        <NavLink to="/sales/sheets" className="text-sm font-semibold text-forest-700">Manage sync</NavLink>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {tiles.map(([name, detail, status, Icon]) => (
          <div key={name} className="flex min-w-[220px] flex-1 items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-ocean-700 shadow-sm"><Icon size={17} /></span>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-gray-900">{name}</div>
              <div className="truncate text-xs text-gray-500">{detail}</div>
            </div>
            <Badge className={status === 'Connected intake' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}>{status}</Badge>
          </div>
        ))}
      </div>
    </div>
  )
}

function PipelinePage({ openLead, onAddLead }) {
  const { leads } = useSalesStore()
  const activeLeads = leads.filter(lead => !lead.archived)

  return (
    <>
      <PageHeader title="Sales Pipeline" subtitle="Kanban is the default working view. Switch to table when you need a denser Monday-style list." />
      <div className="p-6">
        <PipelineBoardSection leads={activeLeads} openLead={openLead} onAddLead={onAddLead} />
      </div>
    </>
  )
}

function PipelineBoardSection({ leads, openLead, onAddLead, title = 'Pipeline' }) {
  const { moveLeadStage } = useSalesStore()
  const [dragLeadId, setDragLeadId] = useState(null)
  const [view, setView] = useState('kanban')
  const [search, setSearch] = useState('')
  const [owner, setOwner] = useState('')
  const q = search.toLowerCase()
  const visibleLeads = leads.filter(lead => {
    if (q && ![lead.fullName, lead.email, lead.phone, lead.projectInterest, lead.source].join(' ').toLowerCase().includes(q)) return false
    if (owner && lead.assignedTo !== owner) return false
    return true
  })

  const move = async (leadId, stage) => {
    if (!leadId) return
    const extra = {}
    if (stage === PIPELINE_CLOSED_STAGE) {
      extra.lostReason = window.prompt('Closed lost / not proceeding reason?', 'Not now') || 'Not now'
    }
    await moveLeadStage(leadId, stage, extra)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-gray-900">{title}</h2>
            <p className="mt-0.5 text-sm text-gray-500">HubSpot stages, Monday-style controls, DevMan-owned workflow.</p>
          </div>
          <ViewToggle value={view} onChange={setView} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={onAddLead} className="bg-ocean-600 text-white hover:bg-ocean-700"><Plus size={14} /> New lead</Button>
          <div className="relative min-w-72 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input className={`${inputCls} py-2 pl-8`} placeholder="Search board" value={search} onChange={event => setSearch(event.target.value)} />
          </div>
          <div className="w-40"><Select value={owner} onChange={setOwner} options={ASSIGNEES} placeholder="Person" /></div>
          <Button>Filter</Button>
          <Button>Group by stage</Button>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="flex min-h-[calc(100vh-250px)] gap-3 overflow-x-auto bg-[#f5f8fb] p-3 pb-4">
          {PIPELINE_STAGES.map(stage => {
            const stageLeads = visibleLeads.filter(lead => lead.pipelineStage === stage)
            return (
              <div
                key={stage}
                onDragOver={event => event.preventDefault()}
                onDrop={() => move(dragLeadId, stage)}
                className="flex w-[292px] shrink-0 flex-col rounded-lg border border-[#d9e2ec] bg-[#eaf1f7]"
              >
                <div className="sticky top-0 z-10 border-b border-[#d9e2ec] bg-[#f7fbff] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold uppercase tracking-wide text-gray-700">{stage}</div>
                    </div>
                    <span className="rounded border border-[#d9e2ec] bg-white px-1.5 py-0.5 text-xs font-bold text-gray-500">{stageLeads.length}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto p-2">
                  {stageLeads.map(lead => (
                    <PipelineCard key={lead.id} lead={lead} openLead={openLead} onDragStart={() => setDragLeadId(lead.id)} />
                  ))}
                  {!stageLeads.length && <div className="rounded-md border border-dashed border-[#d9e2ec] bg-white/50 px-3 py-4 text-center text-xs text-gray-400">No leads</div>}
                </div>
                <div className="border-t border-[#d9e2ec] bg-white px-3 py-2 text-xs font-semibold text-gray-500">
                  {stageLeads.length} lead{stageLeads.length === 1 ? '' : 's'}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <PipelineTable leads={visibleLeads} openLead={openLead} />
      )}
    </div>
  )
}

function PipelineCard({ lead, openLead, onDragStart }) {
  const stale = lead.temperature === 'Hot' && daysSince(lead.lastContactedAt) >= 2
  const value = lead.budgetRange || (lead.preferredUnits?.[0] || '')
  return (
    <button
      draggable
      onDragStart={onDragStart}
      onClick={() => openLead(lead.id)}
      className="w-full rounded-md border border-[#d9e2ec] bg-white p-3 text-left shadow-sm hover:border-ocean-200 hover:shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-bold text-ocean-700">{leadName(lead)}</div>
          <div className="mt-1 truncate text-xs text-gray-500">{lead.projectInterest || 'No project'} - {lead.source}</div>
        </div>
        <Badge className={TEMP_COLORS[lead.temperature]}>{lead.temperature}</Badge>
      </div>
      <div className="mt-3 space-y-1 text-xs text-gray-500">
        {value && <div>Amount: <b className="text-gray-700">{value}</b></div>}
        <div>Owner: <b className="text-gray-700">{lead.assignedTo}</b></div>
        <div>Created: {formatShortDate(lead.createdAt)}</div>
        <div className="line-clamp-2">Next: {suggestedNextAction(lead)}</div>
      </div>
      <ActivityDots lead={lead} />
      {(stale || isOverdue(lead.nextActionDate)) && (
        <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
          <AlertCircle size={12} /> {isOverdue(lead.nextActionDate) ? 'Overdue' : 'Stale hot lead'}
        </div>
      )}
    </button>
  )
}

function ViewToggle({ value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
      {[
        ['kanban', LayoutDashboard, 'Kanban'],
        ['table', Table2, 'Table'],
      ].map(([id, Icon, label]) => (
        <button key={id} onClick={() => onChange(id)} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-semibold ${value === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
          <Icon size={14} /> {label}
        </button>
      ))}
    </div>
  )
}

function ActivityDots({ lead }) {
  const active = [
    Boolean(lead.lastContactedAt),
    Boolean(lead.documentsSent?.brochure || lead.documentsSent?.plans),
    Boolean(lead.preferredUnits?.length),
    PIPELINE_CLOSE_STAGES.includes(lead.pipelineStage),
  ]
  return (
    <div className="mt-3 flex items-center gap-1 border-t border-gray-100 pt-2">
      {Array.from({ length: 10 }).map((_, index) => (
        <span key={index} className={`h-5 w-1.5 rounded-full ${active[index % active.length] ? (index % 2 ? 'bg-ocean-300' : 'bg-pink-300') : 'bg-gray-100'}`} />
      ))}
      <span className="ml-auto text-xs font-semibold text-ocean-600">+</span>
    </div>
  )
}

function PipelineTable({ leads, openLead }) {
  return (
    <div className="overflow-x-auto bg-white">
      {PIPELINE_STAGES.map(stage => {
        const rows = leads.filter(lead => lead.pipelineStage === stage)
        return (
          <div key={stage} className="border-b border-gray-100">
            <div className="flex items-center gap-2 px-4 py-3">
              <span className={`h-5 w-1 rounded-full ${stage === PIPELINE_WON_STAGE ? 'bg-green-400' : stage === PIPELINE_CLOSED_STAGE ? 'bg-gray-400' : 'bg-blue-400'}`} />
              <button className="font-bold text-ocean-700">{stage}</button>
              <Badge>{rows.length}</Badge>
            </div>
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="border-y border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
                <tr>{['Lead', 'Stage', 'Owner', 'Project', 'Source', 'Value / Unit', 'Contact', 'Next action', 'Temp'].map(head => <th key={head} className="px-3 py-2 text-left font-semibold">{head}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(lead => (
                  <tr key={lead.id} onClick={() => openLead(lead.id)} className="cursor-pointer hover:bg-gray-50">
                    <td className="px-3 py-2 font-semibold text-ocean-700">{leadName(lead)}</td>
                    <td className="px-3 py-2"><Badge className={STAGE_COLORS[lead.pipelineStage]}>{lead.pipelineStage}</Badge></td>
                    <td className="px-3 py-2 text-gray-600">{lead.assignedTo}</td>
                    <td className="px-3 py-2 text-gray-600">{lead.projectInterest || '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{lead.source}</td>
                    <td className="px-3 py-2 text-gray-600">{lead.budgetRange || lead.preferredUnits?.join(', ') || '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{lead.phone || lead.email || '-'}</td>
                    <td className={`px-3 py-2 ${isOverdue(lead.nextActionDate) ? 'font-semibold text-red-600' : 'text-gray-600'}`}>{suggestedNextAction(lead)}</td>
                    <td className="px-3 py-2"><Badge className={TEMP_COLORS[lead.temperature]}>{lead.temperature}</Badge></td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={9} className="px-4 py-3 text-sm text-gray-400">No leads in this group.</td></tr>}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}

function LeadsPage({ openLead }) {
  return (
    <>
      <PageHeader title="Leads" subtitle="Clean working table for inbound leads." />
      <div className="mx-auto max-w-7xl p-6">
        <LeadsTable openLead={openLead} />
      </div>
    </>
  )
}

function LeadsTable({ openLead, projectName = '' }) {
  const { leads, projects, markContacted, markInfoSent, moveLeadStage, updateLead, archiveLead } = useSalesStore()
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ project: projectName, source: '', stage: '', assignedTo: '', temperature: '' })
  const [sort, setSort] = useState('stale')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const base = leads.filter(lead => !lead.archived).filter(lead => {
      if (q && ![lead.fullName, lead.email, lead.phone].join(' ').toLowerCase().includes(q)) return false
      if (filters.project && !lead.projectInterest?.includes(filters.project)) return false
      if (filters.source && lead.source !== filters.source) return false
      if (filters.stage && lead.pipelineStage !== filters.stage) return false
      if (filters.assignedTo && lead.assignedTo !== filters.assignedTo) return false
      if (filters.temperature && lead.temperature !== filters.temperature) return false
      return true
    })
    if (sort === 'stale') {
      return [...base].sort((a, b) => {
        const aRank = (isOverdue(a.nextActionDate) ? 0 : 10) + (a.temperature === 'Hot' && daysSince(a.lastContactedAt) >= 2 ? 0 : 5)
        const bRank = (isOverdue(b.nextActionDate) ? 0 : 10) + (b.temperature === 'Hot' && daysSince(b.lastContactedAt) >= 2 ? 0 : 5)
        return aRank - bRank || String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
      })
    }
    return sortLeads(base, sort)
  }, [leads, search, filters, sort])

  const setFilter = (key, value) => setFilters(current => ({ ...current, [key]: value }))
  const markLost = lead => {
    const lostReason = window.prompt('Closed lost / not proceeding reason?', lead.lostReason || 'Not now')
    if (lostReason !== null) moveLeadStage(lead.id, PIPELINE_CLOSED_STAGE, { lostReason })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-72 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input className={`${inputCls} pl-8`} placeholder="Search name, email, phone" value={search} onChange={event => setSearch(event.target.value)} />
          </div>
          {!projectName && <div className="w-44"><Select value={filters.project} onChange={value => setFilter('project', value)} options={projects.map(project => project.name)} placeholder="All projects" /></div>}
          <div className="w-40"><Select value={filters.source} onChange={value => setFilter('source', value)} options={LEAD_SOURCES} placeholder="Source" /></div>
          <div className="w-44"><Select value={filters.stage} onChange={value => setFilter('stage', value)} options={PIPELINE_STAGES} placeholder="Stage" /></div>
          <div className="w-40"><Select value={filters.assignedTo} onChange={value => setFilter('assignedTo', value)} options={ASSIGNEES} placeholder="Owner" /></div>
          <div className="w-40"><Select value={filters.temperature} onChange={value => setFilter('temperature', value)} options={TEMPERATURES} placeholder="Temp" /></div>
          <div className="w-44"><Select value={sort} onChange={setSort} options={[['stale', 'Stale first'], ['newest', 'Newest'], ['nextAction', 'Next action'], ['hottest', 'Hottest'], ['lastContacted', 'Last contacted']]} /></div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
              <tr>
                {['Lead', 'Project', 'Source', 'Stage', 'Temp', 'Owner', 'Last contacted', 'Next action', 'Notes', 'Quick actions'].map(head => (
                  <th key={head} className="px-4 py-3 text-left font-semibold">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(lead => (
                <tr key={lead.id} onClick={() => openLead(lead.id)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{leadName(lead)}</div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                      {lead.phone && <span className="inline-flex items-center gap-1"><Phone size={11} />{lead.phone}</span>}
                      {lead.email && <span className="inline-flex items-center gap-1"><Mail size={11} />{lead.email}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{lead.projectInterest || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{lead.source}</td>
                  <td className="px-4 py-3"><Badge className={STAGE_COLORS[lead.pipelineStage]}>{lead.pipelineStage}</Badge></td>
                  <td className="px-4 py-3"><Badge className={TEMP_COLORS[lead.temperature]}>{lead.temperature}</Badge></td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs"
                      value={lead.assignedTo}
                      onClick={event => event.stopPropagation()}
                      onChange={event => updateLead(lead.id, { assignedTo: event.target.value })}
                    >
                      {ASSIGNEES.map(item => <option key={item}>{item}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatShortDate(lead.lastContactedAt)}</td>
                  <td className={`px-4 py-3 ${isOverdue(lead.nextActionDate) ? 'font-semibold text-red-600' : 'text-gray-600'}`}>
                    <div className="max-w-[190px] truncate">{suggestedNextAction(lead)}</div>
                    <div className="text-xs text-gray-400">{formatShortDate(lead.nextActionDate)}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-500"><div className="max-w-[190px] truncate">{lead.notes || '-'}</div></td>
                  <td className="px-4 py-3" onClick={event => event.stopPropagation()}>
                    <div className="flex flex-wrap gap-1">
                      <SmallButton onClick={() => markContacted(lead.id)}>Contacted</SmallButton>
                      <SmallButton onClick={() => markInfoSent(lead.id)}>Info sent</SmallButton>
                      <SmallButton onClick={() => markLost(lead)}>Lost</SmallButton>
                      <SmallButton onClick={() => archiveLead(lead.id)}>Archive</SmallButton>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400">No leads match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SmallButton(props) {
  return <button {...props} className="rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50" />
}

function ProjectsPage({ openLead }) {
  const { projects, leads, units } = useSalesStore()
  const activeLeads = leads.filter(lead => !lead.archived && lead.pipelineStage !== PIPELINE_CLOSED_STAGE)

  return (
    <>
      <PageHeader title="Sales Projects" subtitle="Start with the development, then work the leads, units, and presales from there." />
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="grid gap-4 xl:grid-cols-3">
          {projects.map(project => {
            const metrics = projectMetrics(project, activeLeads, units)
            const projectLeads = activeLeads.filter(lead => lead.projectInterest?.includes(project.name))
            const closeLeads = projectLeads.filter(lead => PIPELINE_CLOSE_STAGES.includes(lead.pipelineStage))
            return (
              <Link key={project.id} to={`/sales/projects/${project.id}`} className={`rounded-xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${project.id === 'beachwaters' ? 'border-forest-200 ring-2 ring-forest-50' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">{project.name}</h2>
                    <p className="mt-1 text-sm text-gray-500">{project.location} - {project.product}</p>
                  </div>
                  <Badge className={project.id === 'beachwaters' ? 'bg-forest-50 text-forest-700' : 'bg-gray-100 text-gray-600'}>{project.status}</Badge>
                </div>
                {project.id === 'beachwaters' && (
                  <div className="mt-4 rounded-lg border border-forest-100 bg-forest-50 p-3">
                    <div className="text-sm font-bold text-forest-800">5 presales required</div>
                    <div className="mt-1 text-xs text-forest-700">{metrics.presalesAchieved} achieved - {Math.max(0, 5 - metrics.presalesAchieved)} to go</div>
                  </div>
                )}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <MiniStat label="Leads" value={projectLeads.length} />
                  <MiniStat label="Hot" value={projectLeads.filter(lead => lead.temperature === 'Hot').length} />
                  <MiniStat label="Close" value={closeLeads.length} />
                  <MiniStat label="Avail." value={metrics.availableUnits} />
                  <MiniStat label="S&P" value={metrics.spOut} />
                  <MiniStat label="Uncond." value={metrics.unconditional} />
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs font-semibold text-gray-500">
                    <span>Presales</span>
                    <span>{metrics.presalesAchieved}/{project.presalesRequired}</span>
                  </div>
                  <ProgressBar value={metrics.progress} />
                </div>
                <div className="mt-4 flex items-center justify-between text-sm font-semibold text-forest-700">
                  Open project <ChevronRight size={15} />
                </div>
              </Link>
            )
          })}
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-gray-900">Project-first workflow</h2>
              <p className="mt-1 text-sm text-gray-500">Use Projects for the development view, Pipeline for the board, Leads for the clean list, and Presales for targets.</p>
            </div>
            <NavLink to="/sales/pipeline" className="rounded-lg bg-forest-600 px-3 py-2 text-sm font-semibold text-white hover:bg-forest-700">Open pipeline</NavLink>
          </div>
        </div>
      </div>
    </>
  )
}

function ProjectSalesPage({ openLead, onAddLead }) {
  const { projectId } = useParams()
  const { projects, leads, units, updateProject, updateUnit } = useSalesStore()
  const [tab, setTab] = useState('pipeline')
  const project = projects.find(item => item.id === projectId)
  if (!project) return <Navigate to="/sales/projects" replace />

  const activeLeads = leads.filter(lead => !lead.archived && lead.pipelineStage !== PIPELINE_CLOSED_STAGE)
  const projectLeads = activeLeads.filter(lead => lead.projectInterest?.includes(project.name))
  const projectUnits = units.filter(unit => unit.projectId === project.id)
  const metrics = projectMetrics(project, activeLeads, units)
  const closeLeads = projectLeads.filter(lead => PIPELINE_CLOSE_STAGES.includes(lead.pipelineStage))
  const hotLeads = projectLeads.filter(lead => lead.temperature === 'Hot')

  return (
    <>
      <PageHeader
        title={project.name}
        subtitle={`${project.location} sales workspace`}
        action={<Link to="/sales/projects" className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Back to projects</Link>}
      />
      <div className="mx-auto max-w-7xl space-y-5 p-6">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">{project.name}</h2>
                <Badge className="bg-forest-50 text-forest-700">{project.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-gray-500">{project.product || project.description}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <MiniStat label="Required" value={project.presalesRequired} />
              <MiniStat label="Achieved" value={metrics.presalesAchieved} />
              <MiniStat label="Gap" value={metrics.presalesGap} />
            </div>
          </div>
          <div className="mt-4">
            <ProgressBar value={metrics.progress} />
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-100 bg-white p-2 shadow-sm">
          {[
            ['overview', 'Overview'],
            ['leads', 'Leads'],
            ['pipeline', 'Pipeline'],
            ['units', 'Units'],
            ['settings', 'Sales Settings'],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${tab === id ? 'bg-forest-600 text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <MetricCard label="Project leads" value={projectLeads.length} />
                <MetricCard label="Hot leads" value={hotLeads.length} tone="bg-red-50" />
                <MetricCard label="Close leads" value={closeLeads.length} />
                <MetricCard label="Likely presales" value={metrics.likelyPresales} />
              </div>
              <PipelineBoardSection leads={projectLeads} openLead={openLead} onAddLead={onAddLead} title="Project pipeline" />
            </div>
            <div className="space-y-6">
              <RecentLeads title="Hot leads" leads={hotLeads.slice(0, 6)} openLead={openLead} />
              <RecentLeads title="Close to sale" leads={closeLeads.slice(0, 6)} openLead={openLead} />
            </div>
          </div>
        )}

        {tab === 'leads' && <ProjectLeadsTable leads={projectLeads} openLead={openLead} />}

        {tab === 'pipeline' && <PipelineBoardSection leads={projectLeads} openLead={openLead} onAddLead={onAddLead} title={`${project.name} pipeline`} />}

        {tab === 'units' && <ProjectUnitTable units={projectUnits} leads={leads} openLead={openLead} updateUnit={updateUnit} />}

        {tab === 'settings' && (
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-gray-900">Sales Settings</h2>
            <p className="mt-1 text-sm text-gray-500">Light project settings only. This does not connect to DevMan project management.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Field label="Total units"><input className={inputCls} type="number" defaultValue={project.totalUnits} onBlur={event => updateProject(project.id, { totalUnits: event.target.value })} /></Field>
              <Field label="Presales required"><input className={inputCls} type="number" defaultValue={project.presalesRequired} onBlur={event => updateProject(project.id, { presalesRequired: event.target.value })} /></Field>
              <Field label="Presales achieved"><input className={inputCls} type="number" defaultValue={project.presalesAchieved} onBlur={event => updateProject(project.id, { presalesAchieved: event.target.value })} /></Field>
            </div>
            <Field label="Project sales notes"><textarea className={`${inputCls} mt-3 min-h-24`} defaultValue={project.projectNotes} onBlur={event => updateProject(project.id, { projectNotes: event.target.value })} /></Field>
          </div>
        )}
      </div>
    </>
  )
}

function ProjectStageList({ leads, openLead, detailed = false }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="font-bold text-gray-900">Project pipeline</h2>
      <div className="mt-4 space-y-3">
        {PIPELINE_STAGES.filter(stage => stage !== PIPELINE_CLOSED_STAGE).map(stage => {
          const stageLeads = leads.filter(lead => lead.pipelineStage === stage)
          return (
            <div key={stage} className="rounded-lg border border-gray-100">
              <div className="flex items-center justify-between bg-gray-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Badge className={STAGE_COLORS[stage]}>{stage}</Badge>
                  <span className="text-xs text-gray-400">{stageLeads.length} lead{stageLeads.length === 1 ? '' : 's'}</span>
                </div>
              </div>
              {(detailed || stageLeads.length > 0) && (
                <div className="divide-y divide-gray-50">
                  {stageLeads.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-400">No leads here.</div>
                  ) : stageLeads.map(lead => (
                    <button key={lead.id} onClick={() => openLead(lead.id)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-gray-50">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-gray-900">{leadName(lead)}</div>
                        <div className="truncate text-xs text-gray-500">{suggestedNextAction(lead)}</div>
                      </div>
                      <Badge className={TEMP_COLORS[lead.temperature]}>{lead.temperature}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ProjectLeadsTable({ leads, openLead }) {
  const { updateLead } = useSalesStore()
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState('')
  const [owner, setOwner] = useState('')
  const [temperature, setTemperature] = useState('')
  const q = search.toLowerCase()
  const rows = sortLeads(leads.filter(lead => {
    if (q && ![lead.fullName, lead.email, lead.phone, lead.notes].join(' ').toLowerCase().includes(q)) return false
    if (stage && lead.pipelineStage !== stage) return false
    if (owner && lead.assignedTo !== owner) return false
    if (temperature && lead.temperature !== temperature) return false
    return true
  }), 'stale')

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
        <div className="relative min-w-72 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          <input className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100" placeholder="Search project leads" value={search} onChange={event => setSearch(event.target.value)} />
        </div>
        <div className="w-40"><Select value={stage} onChange={setStage} options={PIPELINE_STAGES} placeholder="Stage" /></div>
        <div className="w-36"><Select value={owner} onChange={setOwner} options={ASSIGNEES} placeholder="Owner" /></div>
        <div className="w-36"><Select value={temperature} onChange={setTemperature} options={TEMPERATURES} placeholder="Temp" /></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] text-[13px]">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-400">
            <tr>
              {['Name', 'Email', 'Phone', 'Owner', 'Stage', 'Temp', 'Last activity', 'Next action', 'Notes'].map(head => (
                <th key={head} className="px-3 py-2 text-left font-semibold">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(lead => {
              const initials = leadName(lead).split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()
              return (
                <tr key={lead.id} onClick={() => openLead(lead.id)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ocean-50 text-[10px] font-bold text-ocean-700">{initials || '?'}</span>
                      <span className="truncate font-semibold text-ocean-700">{leadName(lead)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2"><div className="max-w-[210px] truncate font-medium text-ocean-700">{lead.email || '-'}</div></td>
                  <td className="px-3 py-2 text-gray-600">{lead.phone || '-'}</td>
                  <td className="px-3 py-2" onClick={event => event.stopPropagation()}>
                    <select className="max-w-[150px] rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700" value={lead.assignedTo} onChange={event => updateLead(lead.id, { assignedTo: event.target.value })}>
                      {ASSIGNEES.map(item => <option key={item}>{item}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2"><Badge className={STAGE_COLORS[lead.pipelineStage]}>{lead.pipelineStage}</Badge></td>
                  <td className="px-3 py-2"><Badge className={TEMP_COLORS[lead.temperature]}>{lead.temperature}</Badge></td>
                  <td className="px-3 py-2 text-gray-600">{formatShortDate(lead.lastContactedAt || lead.updatedAt || lead.createdAt)}</td>
                  <td className={`px-3 py-2 ${isOverdue(lead.nextActionDate) ? 'font-semibold text-red-600' : 'text-gray-600'}`}>
                    <div className="max-w-[190px] truncate">{suggestedNextAction(lead)}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-500"><div className="max-w-[240px] truncate">{lead.notes || '-'}</div></td>
                </tr>
              )
            })}
            {rows.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">No project leads match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ProjectUnitTable({ units, leads, openLead, updateUnit }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-4">
        <h2 className="font-bold text-gray-900">Units</h2>
        <p className="mt-1 text-sm text-gray-500">Light sales tracking only: status and attached buyer.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
            <tr>{['Unit', 'Type', 'Price', 'Status', 'Attached lead', 'Notes'].map(head => <th key={head} className="px-4 py-3 text-left">{head}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {units.map(unit => {
              const lead = leads.find(item => item.id === unit.assignedLeadId)
              return (
                <tr key={unit.id}>
                  <td className="px-4 py-3 font-semibold text-gray-900">{unit.unitNumber}</td>
                  <td className="px-4 py-3 text-gray-600">{unit.typology}</td>
                  <td className="px-4 py-3 text-gray-600">{money(unit.price)}</td>
                  <td className="px-4 py-3">
                    <select className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs" value={unit.status} onChange={event => updateUnit(unit.id, { status: event.target.value })}>
                      {['Available', 'Enquiry', 'Reserved', 'S&P Out', 'Under Contract', 'Deposit Paid', 'Unconditional', 'Settled', 'Hold'].map(status => <option key={status}>{status}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">{lead ? <button onClick={() => openLead(lead.id)} className="font-semibold text-forest-700 hover:underline">{leadName(lead)}</button> : <span className="text-gray-400">-</span>}</td>
                  <td className="px-4 py-3 text-gray-500">{unit.notes || '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LeadDrawer({ lead, onClose }) {
  const { projects, units, activities, updateLead, markContacted, markInfoSent, moveLeadStage, assignUnitToLead, addLeadNote } = useSalesStore()
  const [form, setForm] = useState(lead)
  const [note, setNote] = useState('')
  const [unitId, setUnitId] = useState('')
  const leadActivities = activities.filter(activity => activity.leadId === lead.id).slice(0, 12)
  const projectOptions = projects.map(project => project.name)
  const matchingUnits = units.filter(unit => !form.projectInterest || unit.projectName === form.projectInterest || form.projectInterest.includes(unit.projectName))
  const gmailUrl = lead.email ? `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(lead.email)}` : ''

  useEffect(() => setForm(lead), [lead])

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const save = () => updateLead(lead.id, form)
  const togglePack = key => {
    const next = { ...(form.documentsSent || {}), [key]: !form.documentsSent?.[key] }
    set('documentsSent', next)
    updateLead(lead.id, { documentsSent: next })
  }
  const addNote = async () => {
    await addLeadNote(lead.id, note)
    setNote('')
  }
  const assignUnit = async () => {
    if (!unitId) return
    await assignUnitToLead(lead.id, unitId)
    setUnitId('')
  }
  const markLost = () => {
    const lostReason = window.prompt('Closed lost / not proceeding reason?', form.lostReason || 'Not now')
    if (lostReason !== null) moveLeadStage(lead.id, PIPELINE_CLOSED_STAGE, { lostReason })
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25" onClick={event => event.target === event.currentTarget && onClose()}>
      <aside className="flex h-full w-full max-w-[560px] flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-gray-900">{leadName(lead)}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge className={TEMP_COLORS[lead.temperature]}>{lead.temperature}</Badge>
              <Badge className={STAGE_COLORS[lead.pipelineStage]}>{lead.pipelineStage}</Badge>
              {lead.sheetConnectionId && <Badge className="bg-sky-50 text-sky-700">Sheet synced</Badge>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-50"><X size={18} /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <Section title="Contact">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Full name"><input className={inputCls} value={form.fullName || ''} onChange={event => set('fullName', event.target.value)} /></Field>
              <Field label="Source"><Select value={form.source} onChange={value => set('source', value)} options={LEAD_SOURCES} /></Field>
              <Field label="Email"><input className={inputCls} value={form.email || ''} onChange={event => set('email', event.target.value)} /></Field>
              <Field label="Phone"><input className={inputCls} value={form.phone || ''} onChange={event => set('phone', event.target.value)} /></Field>
            </div>
          </Section>

          <Section title="Sales status">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Stage"><Select value={form.pipelineStage} onChange={value => set('pipelineStage', value)} options={PIPELINE_STAGES} /></Field>
              <Field label="Temperature"><Select value={form.temperature} onChange={value => set('temperature', value)} options={TEMPERATURES} /></Field>
              <Field label="Assigned to"><Select value={form.assignedTo} onChange={value => set('assignedTo', value)} options={ASSIGNEES} /></Field>
              <Field label="Next action date"><input type="date" className={inputCls} value={form.nextActionDate || ''} onChange={event => set('nextActionDate', event.target.value)} /></Field>
            </div>
            <Field label="Next action"><input className={inputCls} value={form.nextAction || ''} placeholder={suggestedNextAction(form)} onChange={event => set('nextAction', event.target.value)} /></Field>
          </Section>

          <Section title="Buyer profile">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Project interest"><Select value={form.projectInterest} onChange={value => set('projectInterest', value)} options={[...projectOptions, 'Unsure']} /></Field>
              <Field label="Buyer type"><Select value={form.buyerType} onChange={value => set('buyerType', value)} options={BUYER_TYPES} /></Field>
              <Field label="Finance status"><Select value={form.financeStatus} onChange={value => set('financeStatus', value)} options={FINANCE_STATUSES} /></Field>
              <Field label="Budget"><input className={inputCls} value={form.budgetRange || ''} onChange={event => set('budgetRange', event.target.value)} /></Field>
              <Field label="Deposit capacity"><input className={inputCls} value={form.depositCapacity || ''} onChange={event => set('depositCapacity', event.target.value)} /></Field>
              <Field label="Suggested temp"><div className="rounded-lg bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">{calculatedTemperature(form)}</div></Field>
            </div>
          </Section>

          <Section title="Unit interest">
            <div className="flex gap-2">
              <select className={inputCls} value={unitId} onChange={event => setUnitId(event.target.value)}>
                <option value="">Select unit</option>
                {matchingUnits.map(unit => <option key={unit.id} value={unit.id}>{unit.projectName} {unit.unitNumber} - {unit.status} - {money(unit.price)}</option>)}
              </select>
              <Button onClick={assignUnit}>Assign</Button>
            </div>
            <div className="mt-2 text-sm text-gray-500">{form.preferredUnits?.length ? form.preferredUnits.join(', ') : 'No preferred unit set.'}</div>
          </Section>

          <Section title="Buyer pack">
            <div className="grid gap-2 md:grid-cols-2">
              {buyerPackItems(form).map(item => (
                <button key={item.key} onClick={() => togglePack(item.key)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${item.done ? 'border-green-100 bg-green-50 text-green-700' : 'border-gray-100 bg-gray-50 text-gray-500'}`}>
                  <CheckCircle2 size={15} /> {item.label}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Notes and activity">
            <Field label="Notes"><textarea className={`${inputCls} min-h-28`} value={form.notes || ''} onChange={event => set('notes', event.target.value)} /></Field>
            <div className="flex gap-2">
              <input className={inputCls} value={note} placeholder="Add quick note" onChange={event => setNote(event.target.value)} />
              <Button onClick={addNote}>Add</Button>
            </div>
            <div className="space-y-2">
              {leadActivities.map(activity => (
                <div key={activity.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <div className="font-semibold text-gray-800">{activity.title}</div>
                  <div className="text-gray-500">{activity.description}</div>
                  <div className="mt-1 text-xs text-gray-400">{formatDate(activity.createdAt)}</div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="border-t border-gray-100 bg-white px-5 py-4">
          <div className="flex flex-wrap justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => markContacted(lead.id)}>Mark contacted</Button>
              <Button onClick={() => markInfoSent(lead.id)}>Info sent</Button>
              <Button onClick={markLost}>Lost / Not now</Button>
              {gmailUrl && <a href={gmailUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Gmail <ExternalLink size={14} /></a>}
            </div>
            <Button onClick={save} className="bg-forest-600 text-white hover:bg-forest-700">Save lead</Button>
          </div>
        </div>
      </aside>
    </div>
  )
}

function PresalesPage({ openLead }) {
  const { projects, leads, units, updateProject } = useSalesStore()
  const activeLeads = leads.filter(lead => !lead.archived && lead.pipelineStage !== PIPELINE_CLOSED_STAGE)
  return (
    <>
      <PageHeader title="Presales" subtitle="Light project/unit view focused on presale targets." />
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="grid gap-4 xl:grid-cols-3">
          {projects.map(project => {
            const metrics = projectMetrics(project, activeLeads, units)
            const likelyLeads = activeLeads.filter(lead => lead.projectInterest?.includes(project.name) && ['Hot', 'Warm'].includes(lead.temperature) && PIPELINE_CLOSE_STAGES.includes(lead.pipelineStage))
            return (
              <div key={project.id} className={`rounded-xl border bg-white p-5 shadow-sm ${project.id === 'beachwaters' ? 'border-forest-200 ring-2 ring-forest-50' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-gray-900">{project.name}</h2>
                    <p className="mt-1 text-sm text-gray-500">{project.location} - {project.product}</p>
                  </div>
                  <Badge className={project.id === 'beachwaters' ? 'bg-forest-50 text-forest-700' : 'bg-gray-100 text-gray-600'}>{project.status}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <MiniStat label="Required" value={project.presalesRequired} />
                  <MiniStat label="Achieved" value={metrics.presalesAchieved} />
                  <MiniStat label="Gap" value={metrics.presalesGap} />
                </div>
                <div className="mt-4">
                  <ProgressBar value={metrics.progress} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-gray-50 p-3"><b>{metrics.availableUnits}</b> available</div>
                  <div className="rounded-lg bg-gray-50 p-3"><b>{metrics.reservedUnits}</b> reserved</div>
                  <div className="rounded-lg bg-gray-50 p-3"><b>{metrics.spOut}</b> S&P out</div>
                  <div className="rounded-lg bg-gray-50 p-3"><b>{metrics.unconditional}</b> unconditional</div>
                </div>
                <div className="mt-4">
                  <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Likely buyers</div>
                  <div className="space-y-1">
                    {likelyLeads.slice(0, 5).map(lead => (
                      <button key={lead.id} onClick={() => openLead(lead.id)} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-gray-50">
                        <span className="truncate text-sm font-medium text-gray-800">{leadName(lead)}</span>
                        <Badge className={STAGE_COLORS[lead.pipelineStage]}>{lead.pipelineStage}</Badge>
                      </button>
                    ))}
                    {!likelyLeads.length && <div className="text-sm text-gray-400">No likely buyers yet.</div>}
                  </div>
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-semibold text-gray-600">Adjust target</summary>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <input className={inputCls} type="number" defaultValue={project.presalesRequired} onBlur={event => updateProject(project.id, { presalesRequired: event.target.value })} />
                    <input className={inputCls} type="number" defaultValue={project.presalesAchieved} onBlur={event => updateProject(project.id, { presalesAchieved: event.target.value })} />
                  </div>
                </details>
              </div>
            )
          })}
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-gray-900">Simple Unit Register</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
                <tr>{['Project', 'Unit', 'Type', 'Price', 'Status', 'Attached lead'].map(head => <th key={head} className="px-4 py-3 text-left">{head}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {units.map(unit => {
                  const lead = leads.find(item => item.id === unit.assignedLeadId)
                  return (
                    <tr key={unit.id}>
                      <td className="px-4 py-3 font-semibold text-gray-900">{unit.projectName}</td>
                      <td className="px-4 py-3">{unit.unitNumber}</td>
                      <td className="px-4 py-3 text-gray-600">{unit.typology}</td>
                      <td className="px-4 py-3 text-gray-600">{money(unit.price)}</td>
                      <td className="px-4 py-3"><Badge className={UNIT_STATUS_COLORS[unit.status]}>{unit.status}</Badge></td>
                      <td className="px-4 py-3">{lead ? <button onClick={() => openLead(lead.id)} className="font-semibold text-forest-700 hover:underline">{leadName(lead)}</button> : <span className="text-gray-400">-</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}

function SheetSyncPage() {
  const {
    projects,
    sheetConnections,
    sheetMappings,
    syncRuns,
    sheetSyncReady,
    sheetSyncError,
    addSheetConnection,
    deleteSheetConnection,
    saveSheetMapping,
    previewSheetConnection,
    syncSheetConnection,
    syncAllSheets,
  } = useSalesStore()
  const [form, setForm] = useState({ name: '', spreadsheetUrl: '', spreadsheetId: '', sheetName: '', rangeA1: '', projectHint: '', sourceHint: '', headerRow: 1 })
  const [preview, setPreview] = useState(null)
  const [fieldMap, setFieldMap] = useState({})
  const [defaults, setDefaults] = useState({ assignedTo: 'Unassigned', buyerType: 'Unknown', financeStatus: 'Unknown', temperature: 'Warm' })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))

  const runPreview = async () => {
    setBusy(true)
    setMessage('')
    try {
      const result = await previewSheetConnection(form)
      setPreview(result)
      setFieldMap(result.suggestedFieldMap || {})
      set('spreadsheetId', result.spreadsheetId)
      if (!form.sheetName) set('sheetName', result.sheetName)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  const saveConnection = async () => {
    if (!preview) {
      setMessage('Preview the sheet first so DevMan can confirm access and columns.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const connection = await addSheetConnection({
        ...form,
        spreadsheetId: form.spreadsheetId || preview.spreadsheetId,
        sheetName: form.sheetName || preview.sheetName,
        name: form.name || `${form.projectHint || 'Lead'} sheet`,
      })
      await saveSheetMapping(connection.id, { headerRow: form.headerRow, fieldMap, defaults })
      setMessage('Connection saved. Run Sync now to pull leads into Sales Hub.')
      setPreview(null)
      setForm({ name: '', spreadsheetUrl: '', spreadsheetId: '', sheetName: '', rangeA1: '', projectHint: '', sourceHint: '', headerRow: 1 })
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  const runSync = async id => {
    setBusy(true)
    setMessage('')
    try {
      const result = id ? await syncSheetConnection(id) : await syncAllSheets()
      setMessage(id ? `Sync complete: ${result.rowsCreated} created, ${result.rowsUpdated} updated, ${result.rowsSkipped} skipped.` : 'All active lead sheets synced.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  const fields = [
    ['leadId', 'Lead ID'],
    ['fullName', 'Full name'],
    ['firstName', 'First name'],
    ['lastName', 'Last name'],
    ['email', 'Email'],
    ['phone', 'Phone'],
    ['source', 'Source'],
    ['projectInterest', 'Project interest'],
    ['buyerType', 'Buyer type'],
    ['financeStatus', 'Finance status'],
    ['temperature', 'Lead temperature'],
    ['budgetRange', 'Budget'],
    ['depositCapacity', 'Deposit capacity'],
    ['preferredUnits', 'Preferred units'],
    ['message', 'Message / enquiry'],
    ['createdAt', 'Created date'],
    ['nextAction', 'Next action'],
    ['nextActionDate', 'Next action date'],
  ]

  return (
    <>
      <PageHeader
        title="Sheet Sync"
        subtitle="Read-only Google Sheets intake for inbound sales leads."
        action={<Button onClick={() => runSync()} disabled={busy || !sheetConnections.length || !sheetSyncReady} className="bg-forest-600 text-white hover:bg-forest-700"><RefreshCw size={15} /> Sync all</Button>}
      />
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        {!sheetSyncReady && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <b>Sheet Sync migration required.</b> Run `supabase/migrations/20260521190000_sales_hub_simplified_sheets.sql`, then refresh. {sheetSyncError}
          </div>
        )}

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3 rounded-lg bg-forest-50 p-3 text-sm text-forest-800">
            <AlertCircle className="mt-0.5 shrink-0" size={16} />
            <div>
              Share each lead sheet with the DevMan service account email. DevMan reads sheets only; it does not write status back to Google Sheets in this version.
              {preview?.serviceAccountEmail && <div className="mt-1 font-semibold">Service account: {preview.serviceAccountEmail}</div>}
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Connection name"><input className={inputCls} value={form.name} onChange={event => set('name', event.target.value)} placeholder="Beachwaters Meta leads" /></Field>
                <Field label="Project hint"><Select value={form.projectHint} onChange={value => set('projectHint', value)} options={projects.map(project => project.name)} placeholder="Project" /></Field>
                <Field label="Spreadsheet URL"><input className={inputCls} value={form.spreadsheetUrl} onChange={event => set('spreadsheetUrl', event.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." /></Field>
                <Field label="Spreadsheet ID"><input className={inputCls} value={form.spreadsheetId} onChange={event => set('spreadsheetId', event.target.value)} placeholder="Optional if URL is pasted" /></Field>
                <Field label="Sheet tab name"><input className={inputCls} value={form.sheetName} onChange={event => set('sheetName', event.target.value)} placeholder="Leads" /></Field>
                <Field label="Range"><input className={inputCls} value={form.rangeA1} onChange={event => set('rangeA1', event.target.value)} placeholder="'Leads'!A1:Z1000" /></Field>
                <Field label="Source hint"><Select value={form.sourceHint} onChange={value => set('sourceHint', value)} options={LEAD_SOURCES} placeholder="Source" /></Field>
                <Field label="Header row"><input type="number" min="1" className={inputCls} value={form.headerRow} onChange={event => set('headerRow', event.target.value)} /></Field>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={runPreview} disabled={busy || !sheetSyncReady} className="bg-forest-600 text-white hover:bg-forest-700"><Table2 size={15} /> Preview columns</Button>
                <Button onClick={saveConnection} disabled={busy || !preview || !sheetSyncReady}>Save connection</Button>
              </div>
              {message && <div className={`rounded-lg px-3 py-2 text-sm ${/fail|error|required|configured/i.test(message) ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{message}</div>}
            </div>

            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <h2 className="font-bold text-gray-900">Column mapping</h2>
              {!preview ? (
                <p className="mt-2 text-sm text-gray-500">Preview a sheet to map columns into Sales Hub fields.</p>
              ) : (
                <div className="mt-3 max-h-[520px] space-y-3 overflow-y-auto pr-1">
                  <div className="rounded-lg bg-white p-3 text-sm text-gray-600">
                    <b>{preview.spreadsheetTitle}</b><br />
                    Tab: {preview.sheetName}. Headers found: {preview.headers.length}.
                  </div>
                  {fields.map(([field, label]) => (
                    <div key={field} className="grid grid-cols-[135px_1fr] items-center gap-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</div>
                      <select className={inputCls} value={fieldMap[field] || ''} onChange={event => setFieldMap(current => ({ ...current, [field]: event.target.value }))}>
                        <option value="">Not mapped</option>
                        {preview.headers.map(header => <option key={header} value={header}>{header}</option>)}
                      </select>
                    </div>
                  ))}
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Default owner"><Select value={defaults.assignedTo} onChange={value => setDefaults(current => ({ ...current, assignedTo: value }))} options={ASSIGNEES} /></Field>
                    <Field label="Default temp"><Select value={defaults.temperature} onChange={value => setDefaults(current => ({ ...current, temperature: value }))} options={TEMPERATURES} /></Field>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-gray-900">Connected lead sheets</h2>
            <div className="mt-4 space-y-3">
              {sheetConnections.length === 0 && <div className="text-sm text-gray-400">No sheets connected yet.</div>}
              {sheetConnections.map(connection => {
                const mapping = sheetMappings.find(item => item.connectionId === connection.id)
                return (
                  <div key={connection.id} className="rounded-lg border border-gray-100 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-gray-900">{connection.name}</div>
                        <div className="mt-1 text-sm text-gray-500">{connection.sheetName || 'First tab'} - {connection.projectHint || 'No project hint'} - {connection.sourceHint || 'No source hint'}</div>
                        <div className="mt-1 text-xs text-gray-400">Mapped fields: {Object.keys(mapping?.fieldMap || {}).length || 0}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => runSync(connection.id)} disabled={busy || !sheetSyncReady}><RefreshCw size={14} /> Sync now</Button>
                        <Button onClick={() => deleteSheetConnection(connection.id)}><Trash2 size={14} /></Button>
                      </div>
                    </div>
                    <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                      Last status: <b>{connection.lastSyncStatus}</b>{connection.lastSyncMessage ? ` - ${connection.lastSyncMessage}` : ''}{connection.lastSyncedAt ? ` - ${formatDate(connection.lastSyncedAt)}` : ''}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-gray-900">Recent sync runs</h2>
            <div className="mt-4 space-y-2">
              {syncRuns.length === 0 && <div className="text-sm text-gray-400">No sync history yet.</div>}
              {syncRuns.slice(0, 10).map(run => (
                <div key={run.id} className="rounded-lg bg-gray-50 p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <b className={run.status === 'Failed' ? 'text-red-700' : 'text-gray-900'}>{run.status}</b>
                    <span className="text-xs text-gray-400">{formatDate(run.startedAt)}</span>
                  </div>
                  <div className="mt-1 text-gray-600">{run.rowsCreated} created, {run.rowsUpdated} updated, {run.rowsSkipped} skipped</div>
                  {run.errors?.length > 0 && <div className="mt-1 text-xs text-red-600">{run.errors.length} row error(s)</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function LeadModal({ onClose }) {
  const { projects, addLead } = useSalesStore()
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    source: 'Other',
    projectInterest: '',
    buyerType: 'Unknown',
    financeStatus: 'Unknown',
    assignedTo: 'Tim',
    temperature: 'Warm',
    pipelineStage: PIPELINE_NEW_STAGE,
    notes: '',
  })
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const save = async () => {
    if (!form.fullName && !form.email && !form.phone) return
    await addLead(form)
    onClose()
  }
  return (
    <Modal title="Add lead" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button onClick={save} className="bg-forest-600 text-white hover:bg-forest-700">Save lead</Button></>}>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Full name"><input className={inputCls} value={form.fullName} onChange={event => set('fullName', event.target.value)} /></Field>
        <Field label="Project"><Select value={form.projectInterest} onChange={value => set('projectInterest', value)} options={projects.map(project => project.name)} placeholder="Project" /></Field>
        <Field label="Email"><input className={inputCls} value={form.email} onChange={event => set('email', event.target.value)} /></Field>
        <Field label="Phone"><input className={inputCls} value={form.phone} onChange={event => set('phone', event.target.value)} /></Field>
        <Field label="Source"><Select value={form.source} onChange={value => set('source', value)} options={LEAD_SOURCES} /></Field>
        <Field label="Assigned"><Select value={form.assignedTo} onChange={value => set('assignedTo', value)} options={ASSIGNEES} /></Field>
      </div>
      <Field label="Notes"><textarea className={`${inputCls} min-h-24`} value={form.notes} onChange={event => set('notes', event.target.value)} /></Field>
    </Modal>
  )
}

function Section({ title, children }) {
  return <section className="space-y-3"><h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">{title}</h3>{children}</section>
}

function Field({ label, children }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>{children}</label>
}

function Modal({ title, children, footer, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={event => event.target === event.currentTarget && onClose()}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
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

export default SalesShell
