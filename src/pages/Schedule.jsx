import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import useStore from '../store/useStore'
import { STAGE_MAP } from '../data/stages'

const today = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function bucket(dateStr) {
  const d = new Date(dateStr)
  const t = today()
  const in7 = new Date(t.getTime() + 7 * 24 * 60 * 60 * 1000)
  const in30 = new Date(t.getTime() + 30 * 24 * 60 * 60 * 1000)
  if (d < t) return 'overdue'
  if (d <= in7) return 'this-week'
  if (d <= in30) return 'this-month'
  return 'later'
}

const BUCKETS = [
  { key: 'overdue', label: 'Overdue', headerCls: 'bg-red-50 text-red-700 border-red-200', rowCls: 'bg-red-50/40' },
  { key: 'this-week', label: 'This week', headerCls: 'bg-amber-50 text-amber-700 border-amber-200', rowCls: '' },
  { key: 'this-month', label: 'This month', headerCls: 'bg-forest-50 text-forest-700 border-forest-200', rowCls: '' },
  { key: 'later', label: 'Later', headerCls: 'bg-gray-50 text-gray-600 border-gray-200', rowCls: '' },
]

const fmtDate = d => new Date(d).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' })

export default function Schedule() {
  const { projects, checklistItems, milestones } = useStore()
  const [filterProject, setFilterProject] = useState('')

  const items = useMemo(() => {
    const tasks = checklistItems
      .filter(i => i.dueDate && !i.done)
      .map(i => ({
        id: i.id,
        type: 'task',
        label: i.label,
        projectId: i.projectId,
        project: projects.find(p => p.id === i.projectId),
        stage: STAGE_MAP[i.stageId],
        date: i.dueDate,
        owner: i.owner,
        isBlocker: i.isBlocker,
        bucket: bucket(i.dueDate),
      }))

    const ms = milestones
      .filter(m => m.date && !m.complete)
      .map(m => ({
        id: m.id,
        type: 'milestone',
        label: m.label,
        projectId: m.projectId,
        project: projects.find(p => p.id === m.projectId),
        stage: STAGE_MAP[m.stageId],
        date: m.date,
        owner: '',
        isBlocker: false,
        bucket: bucket(m.date),
      }))

    const all = [...tasks, ...ms]
    return filterProject ? all.filter(i => i.projectId === filterProject) : all
  }, [checklistItems, milestones, projects, filterProject])

  const grouped = useMemo(() => {
    const map = {}
    BUCKETS.forEach(b => { map[b.key] = [] })
    items.forEach(i => { if (map[i.bucket]) map[i.bucket].push(i) })
    Object.values(map).forEach(arr => arr.sort((a, b) => new Date(a.date) - new Date(b.date)))
    return map
  }, [items])

  const total = items.length

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Schedule</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total} upcoming item{total !== 1 ? 's' : ''} with due dates</p>
        </div>
        <select
          value={filterProject}
          onChange={e => setFilterProject(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500"
        >
          <option value="">All projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {total === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">
          No upcoming items with due dates. Add due dates to tasks to see them here.
        </div>
      ) : (
        <div className="space-y-6">
          {BUCKETS.map(b => {
            const bucketItems = grouped[b.key]
            if (bucketItems.length === 0) return null
            return (
              <div key={b.key} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Bucket header */}
                <div className={`px-5 py-3 border-b flex items-center justify-between ${b.headerCls}`}>
                  <span className="text-sm font-semibold">{b.label}</span>
                  <span className="text-xs font-medium opacity-70">{bucketItems.length} item{bucketItems.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Items */}
                <div className="divide-y divide-gray-50">
                  {bucketItems.map(item => (
                    <div key={item.id} className={`flex items-center gap-4 px-5 py-3 ${b.rowCls}`}>
                      {/* Type indicator */}
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.type === 'milestone' ? 'bg-purple-400' : item.isBlocker ? 'bg-red-400' : 'bg-blue-300'}`} />

                      {/* Label */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-800 truncate">{item.label}</div>
                        {item.owner && <div className="text-xs text-gray-400 mt-0.5">{item.owner}</div>}
                      </div>

                      {/* Project */}
                      {item.project && (
                        <Link
                          to={`/projects/${item.project.id}`}
                          className="text-xs text-forest-600 hover:underline shrink-0 hidden sm:block"
                          onClick={e => e.stopPropagation()}
                        >
                          {item.project.name}
                        </Link>
                      )}

                      {/* Stage */}
                      {item.stage && (
                        <span className={`text-xs px-2 py-0.5 rounded-full hidden md:inline-block ${item.stage.light} ${item.stage.text}`}>
                          {item.stage.short}
                        </span>
                      )}

                      {/* Type badge */}
                      {item.type === 'milestone' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 hidden sm:inline-block">Milestone</span>
                      )}

                      {/* Date */}
                      <div className={`text-xs font-medium shrink-0 ${b.key === 'overdue' ? 'text-red-600' : 'text-gray-500'}`}>
                        {fmtDate(item.date)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
