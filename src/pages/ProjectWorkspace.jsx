import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, AlertTriangle } from 'lucide-react'
import useStore from '../store/useStore'
import StatusPill from '../components/StatusPill'
import ProgressBar from '../components/ProgressBar'
import StageTracker from '../components/StageTracker'
import { STAGE_MAP, STAGES, STAGE_IDS } from '../data/stages'
import ChecklistView from './ChecklistView'

const TABS = ['Overview', 'Checklist', 'Tasks', 'Documents', 'Timeline', 'Notes']

function Placeholder({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
        <span className="text-gray-300 text-lg">⚙</span>
      </div>
      <p className="text-sm text-gray-400">{label} coming soon.</p>
    </div>
  )
}

function OverviewTab({ project }) {
  const { checklistItems, activityLog } = useStore()
  const items = checklistItems.filter(i => i.projectId === project.id)

  const stageStats = useMemo(() => {
    return STAGES.map(stage => {
      const stageItems = items.filter(i => i.stageId === stage.id)
      const done = stageItems.filter(i => i.done).length
      const pct = stageItems.length ? Math.round((done / stageItems.length) * 100) : 0
      return { ...stage, total: stageItems.length, done, pct }
    }).filter(s => s.total > 0)
  }, [items])

  const blockers = items.filter(i => i.isBlocker && !i.done)
  const requiredIncomplete = items.filter(i => i.requiredToProgress && !i.done &&
    i.stageId === project.currentStage)
  const total = items.length
  const done = items.filter(i => i.done).length
  const overdue = items.filter(i => i.dueDate && !i.done && new Date(i.dueDate) < new Date())

  const recent = activityLog.filter(a => a.projectId === project.id).slice(0, 8)

  const fmtTime = ts => {
    const d = new Date(ts)
    return d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }) +
      ' at ' + d.toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Left column */}
      <div className="xl:col-span-2 space-y-4">
        {/* Overall stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total items', value: total },
            { label: 'Completed', value: done, color: 'text-green-600' },
            { label: 'Overdue', value: overdue.length, color: overdue.length ? 'text-red-600' : '' },
            { label: 'Blockers', value: blockers.length, color: blockers.length ? 'text-red-600' : '' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="text-xs text-gray-400 mb-1">{stat.label}</div>
              <div className={`text-2xl font-bold ${stat.color || 'text-gray-800'}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Stage progress */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Stage progress</h3>
          <div className="space-y-3">
            {stageStats.map(stage => (
              <div key={stage.id}>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span className={`font-medium ${stage.text}`}>{stage.label}</span>
                  <span>{stage.done}/{stage.total} &mdash; {stage.pct}%</span>
                </div>
                <ProgressBar value={stage.pct} color={stage.bg} height="h-1.5" />
              </div>
            ))}
          </div>
        </div>

        {/* Blockers */}
        {blockers.length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={15} className="text-red-500" />
              <h3 className="text-sm font-semibold text-red-700">Blockers ({blockers.length})</h3>
            </div>
            <ul className="space-y-1">
              {blockers.map(item => (
                <li key={item.id} className="text-xs text-red-600 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Required incomplete */}
        {requiredIncomplete.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-amber-700 mb-3">
              Required before stage advance ({requiredIncomplete.length})
            </h3>
            <ul className="space-y-1">
              {requiredIncomplete.map(item => (
                <li key={item.id} className="text-xs text-amber-700 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Right column — activity */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">Activity</h3>
        </div>
        {recent.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">No activity yet.</div>
        ) : (
          <div className="divide-y divide-gray-50 overflow-y-auto max-h-96">
            {recent.map(entry => (
              <div key={entry.id} className="px-5 py-3">
                <div className="text-xs font-medium text-gray-700">{entry.action}</div>
                <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{entry.detail}</div>
                <div className="text-[10px] text-gray-300 mt-1">{fmtTime(entry.timestamp)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProjectWorkspace() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { projects, checklistItems, updateProject } = useStore()
  const [activeTab, setActiveTab] = useState('Overview')
  const [editingStage, setEditingStage] = useState(false)
  const [editingStatus, setEditingStatus] = useState(false)

  const project = projects.find(p => p.id === projectId)
  const projectItems = project ? checklistItems.filter(i => i.projectId === project.id) : []
  const done = projectItems.filter(i => i.done).length
  const pct = projectItems.length ? Math.round((done / projectItems.length) * 100) : 0
  const stage = project ? STAGE_MAP[project.currentStage] : null

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24">
        <p className="text-gray-400 mb-4">Project not found.</p>
        <Link to="/projects" className="text-blue-600 text-sm hover:underline">Back to projects</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Project header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
        <div className="flex items-start justify-between gap-4 max-w-7xl mx-auto">
          <div className="flex items-start gap-3 min-w-0">
            <button
              onClick={() => navigate('/projects')}
              className="mt-0.5 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">{project.name}</h1>
              <p className="text-sm text-gray-400">{project.address}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* Status selector */}
            <div className="relative">
              <button onClick={() => setEditingStatus(v => !v)}>
                <StatusPill status={project.status} />
              </button>
              {editingStatus && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[130px]">
                  {['Active', 'On Hold', 'Blocked', 'Complete'].map(s => (
                    <button
                      key={s}
                      className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
                      onClick={() => {
                        updateProject(project.id, { status: s })
                        setEditingStatus(false)
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Progress */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <ProgressBar value={pct} height="h-1.5" className="w-20" />
              <span className="text-xs">{pct}%</span>
            </div>
            <Link
              to={`/checklist/${project.id}`}
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
            >
              <ExternalLink size={12} />
              Checklist
            </Link>
          </div>
        </div>

        {/* Stage tracker */}
        <div className="mt-4 max-w-7xl mx-auto">
          <StageTracker currentStage={project.currentStage} />
        </div>

        {/* Stage edit */}
        <div className="mt-3 max-w-7xl mx-auto flex items-center gap-2">
          <span className="text-xs text-gray-400">Stage:</span>
          {editingStage ? (
            <select
              className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={project.currentStage}
              autoFocus
              onChange={e => {
                updateProject(project.id, { currentStage: e.target.value })
                setEditingStage(false)
              }}
              onBlur={() => setEditingStage(false)}
            >
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          ) : (
            <button
              onClick={() => setEditingStage(true)}
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${stage?.light || 'bg-gray-100'} ${stage?.text || 'text-gray-600'} hover:opacity-80 transition-opacity`}
            >
              {stage?.label || project.currentStage}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-6 shrink-0">
        <div className="flex gap-0 max-w-7xl mx-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {activeTab === 'Overview' && <OverviewTab project={project} />}
          {activeTab === 'Checklist' && <ChecklistView projectId={project.id} />}
          {activeTab === 'Tasks' && <Placeholder label="Tasks" />}
          {activeTab === 'Documents' && <Placeholder label="Documents" />}
          {activeTab === 'Timeline' && <Placeholder label="Timeline" />}
          {activeTab === 'Notes' && <Placeholder label="Notes" />}
        </div>
      </div>
    </div>
  )
}
