import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import useStore from '../store/useStore'
import EmptyState from '../components/EmptyState'
import StatusPill from '../components/StatusPill'
import ProgressBar from '../components/ProgressBar'
import { STAGES, STAGE_MAP } from '../data/stages'

export default function AllProjects() {
  const { projects, checklistItems } = useStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterStage, setFilterStage] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterOwner, setFilterOwner] = useState('')

  const owners = useMemo(() => {
    const set = new Set(projects.map(p => p.owner).filter(Boolean))
    return [...set]
  }, [projects])

  const enriched = useMemo(() => {
    return projects.map(p => {
      const items = checklistItems.filter(i => i.projectId === p.id)
      const done = items.filter(i => i.done).length
      const overdue = items.filter(i => i.dueDate && !i.done && new Date(i.dueDate) < new Date()).length
      const pct = items.length ? Math.round((done / items.length) * 100) : 0
      return { ...p, pct, overdue, stage: STAGE_MAP[p.currentStage] }
    })
  }, [projects, checklistItems])

  const filtered = useMemo(() => {
    return enriched.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.address.toLowerCase().includes(search.toLowerCase())) return false
      if (filterStage && p.currentStage !== filterStage) return false
      if (filterStatus && p.status !== filterStatus) return false
      if (filterOwner && p.owner !== filterOwner) return false
      return true
    })
  }, [enriched, search, filterStage, filterStatus, filterOwner])

  if (projects.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">All Projects</h1>
          <p className="text-sm text-gray-400 mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          to="/projects/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          New project
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
          />
        </div>

        <select
          value={filterStage}
          onChange={e => setFilterStage(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All stages</option>
          {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          {['Active', 'On Hold', 'Blocked', 'Complete'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {owners.length > 0 && (
          <select
            value={filterOwner}
            onChange={e => setFilterOwner(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All owners</option>
            {owners.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )}

        {(search || filterStage || filterStatus || filterOwner) && (
          <button
            onClick={() => { setSearch(''); setFilterStage(''); setFilterStatus(''); setFilterOwner('') }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No projects match your filters.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div
              key={p.id}
              onClick={() => navigate(`/projects/${p.id}`)}
              className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 p-5 cursor-pointer transition-all"
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{p.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{p.address}</p>
                </div>
                <StatusPill status={p.status} />
              </div>

              {/* Stage badge */}
              {p.stage && (
                <div className="mb-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.stage.light} ${p.stage.text}`}>
                    {p.stage.label}
                  </span>
                </div>
              )}

              {/* Progress */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Progress</span>
                  <span>{p.pct}%</span>
                </div>
                <ProgressBar value={p.pct} height="h-1.5" />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{p.owner || '—'}</span>
                <div className="flex items-center gap-3">
                  {p.overdue > 0 && (
                    <span className="text-red-500 font-medium">{p.overdue} overdue</span>
                  )}
                  {p.targetCompletion && (
                    <span>{new Date(p.targetCompletion).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
