import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { List, BarChart2, Calendar, ChevronDown, ChevronRight } from 'lucide-react'
import useStore from '../store/useStore'
import { STAGES, STAGE_MAP } from '../data/stages'

// ── Helpers ───────────────────────────────────────────────────────────────────

const todayDate = new Date()
todayDate.setHours(0, 0, 0, 0)

function getStatus(item) {
  if (item.done) return 'complete'
  if (item.dueDate && new Date(item.dueDate) < todayDate) return 'delayed'
  if (item.status === 'in-progress') return 'in-progress'
  return 'not-started'
}

const STATUS = {
  complete:     { dot: 'bg-green-500',  text: 'text-green-700',  label: 'Complete' },
  delayed:      { dot: 'bg-red-500',    text: 'text-red-600',    label: 'Delayed' },
  'in-progress':{ dot: 'bg-amber-500',  text: 'text-amber-700',  label: 'In Progress' },
  'not-started':{ dot: 'bg-gray-300',   text: 'text-gray-400',   label: 'Not Started' },
}

const fmtShort = d => d ? new Date(d).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }) : '—'
const fmtFull  = d => d ? new Date(d).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

function daysBetween(a, b) {
  if (!a || !b) return null
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}

const MILESTONE_STAGE = {
  id: 'milestones', label: 'Milestones', short: 'MS',
  bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700',
  border: 'border-purple-300', dot: 'bg-purple-500',
}
const ALL_STAGES = [...STAGES, MILESTONE_STAGE]

// ── Task List View ─────────────────────────────────────────────────────────────

function TaskListView({ items, filterProject }) {
  const [collapsed, setCollapsed] = useState({})
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(i =>
      i.label.toLowerCase().includes(q) ||
      (i.project?.name || '').toLowerCase().includes(q)
    )
  }, [items, search])

  const byStage = useMemo(() => {
    const map = {}
    ALL_STAGES.forEach(s => { map[s.id] = [] })
    filtered.forEach(i => {
      const key = i.type === 'milestone' ? 'milestones' : (i.stageId || 'milestones')
      if (map[key]) map[key].push(i)
    })
    Object.values(map).forEach(arr =>
      arr.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate) - new Date(b.dueDate)
      })
    )
    return map
  }, [filtered])

  const total = items.length
  const complete = items.filter(i => i.done).length
  const delayed = items.filter(i => getStatus(i) === 'delayed').length
  const pct = total > 0 ? Math.round(complete / total * 100) : 0

  return (
    <div>
      {/* Stats + search */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <span className="text-gray-500"><span className="font-medium text-gray-800">{total}</span> tasks</span>
          <span className="text-green-600 font-medium">{complete} complete</span>
          {delayed > 0 && <span className="text-red-600 font-medium">{delayed} delayed</span>}
          <span className="text-gray-400">{pct}% done</span>
        </div>
        <input
          type="text"
          placeholder="Search tasks…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ml-auto px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 w-48"
        />
      </div>

      <div className="space-y-2">
        {ALL_STAGES.map(stage => {
          const stageItems = byStage[stage.id] || []
          if (stageItems.length === 0) return null
          const done = stageItems.filter(i => i.done).length
          const pct = stageItems.length ? Math.round(done / stageItems.length * 100) : 0
          const isOpen = !collapsed[stage.id]

          return (
            <div key={stage.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Stage header */}
              <button
                onClick={() => setCollapsed(s => ({ ...s, [stage.id]: !s[stage.id] }))}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
              >
                {isOpen ? <ChevronDown size={13} className="text-gray-400 shrink-0" /> : <ChevronRight size={13} className="text-gray-400 shrink-0" />}
                <span className={`text-xs font-bold uppercase tracking-wide ${stage.text}`}>{stage.label}</span>
                <span className="text-xs text-gray-400">{done}/{stageItems.length}</span>
                <div className="flex-1 mx-2">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{pct}%</span>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100">
                  {/* Column headers */}
                  <div className="grid items-center px-4 py-1.5 bg-gray-50 text-xs font-medium text-gray-400 uppercase tracking-wide"
                    style={{ gridTemplateColumns: filterProject ? '1fr 100px 60px 90px' : '1fr 120px 100px 60px 90px' }}>
                    <span>Task</span>
                    {!filterProject && <span className="hidden lg:block">Project</span>}
                    <span>Due</span>
                    <span className="hidden md:block">Days</span>
                    <span>Status</span>
                  </div>

                  <div className="divide-y divide-gray-50">
                    {stageItems.map(item => {
                      const st = getStatus(item)
                      const sty = STATUS[st]
                      const daysLeft = item.dueDate ? daysBetween(todayDate, item.dueDate) : null

                      return (
                        <div
                          key={item.id}
                          className="grid items-center px-4 py-2.5 hover:bg-gray-50/60 text-sm"
                          style={{ gridTemplateColumns: filterProject ? '1fr 100px 60px 90px' : '1fr 120px 100px 60px 90px' }}
                        >
                          {/* Task name */}
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sty.dot}`} />
                            <span className={`truncate ${item.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                              {item.label}
                            </span>
                            {item.type === 'milestone' && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 shrink-0">MS</span>
                            )}
                          </div>

                          {/* Project */}
                          {!filterProject && (
                            <div className="hidden lg:block min-w-0">
                              {item.project
                                ? <Link to={`/projects/${item.project.id}`} className="text-xs text-forest-600 hover:underline truncate block">{item.project.name}</Link>
                                : <span className="text-xs text-gray-300">—</span>
                              }
                            </div>
                          )}

                          {/* Due */}
                          <span className={`text-xs shrink-0 ${st === 'delayed' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                            {fmtShort(item.dueDate)}
                          </span>

                          {/* Days */}
                          <span className="text-xs hidden md:block shrink-0 text-gray-400">
                            {daysLeft === null ? '—' : daysLeft < 0 ? <span className="text-red-500">{Math.abs(daysLeft)}d late</span> : `${daysLeft}d`}
                          </span>

                          {/* Status */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`w-1.5 h-1.5 rounded-full ${sty.dot}`} />
                            <span className={`text-xs ${sty.text}`}>{sty.label}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Gantt View ─────────────────────────────────────────────────────────────────

function GanttView({ items }) {
  const [collapsed, setCollapsed] = useState({})

  const ganttItems = useMemo(() => items.filter(i => i.dueDate), [items])

  const { minDate, totalDays, months } = useMemo(() => {
    if (!ganttItems.length) return { minDate: todayDate, totalDays: 60, months: [] }

    let min = Infinity, max = -Infinity
    ganttItems.forEach(i => {
      // start = startDate if set, else dueDate - 7 days
      const startMs = i.startDate
        ? new Date(i.startDate).getTime()
        : new Date(i.dueDate).getTime() - 7 * 86400000
      const endMs = new Date(i.dueDate).getTime()
      if (startMs < min) min = startMs
      if (endMs > max) max = endMs
    })

    const padMin = new Date(min - 14 * 86400000)
    padMin.setDate(1) // snap to month start
    const padMax = new Date(max + 14 * 86400000)
    const totalDays = (padMax - padMin) / 86400000

    // Build month markers
    const months = []
    const cursor = new Date(padMin)
    cursor.setDate(1)
    while (cursor <= padMax) {
      const left = (cursor - padMin) / 86400000 / totalDays * 100
      months.push({
        left,
        label: cursor.toLocaleDateString('en-NZ', { month: 'short', year: '2-digit' }),
      })
      cursor.setMonth(cursor.getMonth() + 1)
    }

    return { minDate: padMin, totalDays, months }
  }, [ganttItems])

  const todayLeft = (todayDate - minDate) / 86400000 / totalDays * 100

  const byStage = useMemo(() => {
    const map = {}
    ALL_STAGES.forEach(s => { map[s.id] = [] })
    ganttItems.forEach(i => {
      const key = i.type === 'milestone' ? 'milestones' : (i.stageId || 'milestones')
      if (map[key]) map[key].push(i)
    })
    return map
  }, [ganttItems])

  if (!ganttItems.length) {
    return (
      <div className="text-center py-20 text-gray-400 text-sm">
        No tasks with due dates. Add due dates to see the Gantt chart.
      </div>
    )
  }

  const LABEL_W = 200

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2.5 border-b border-gray-100 text-xs text-gray-500">
        <span className="font-semibold text-gray-700 mr-1">Gantt</span>
        {[
          { color: 'bg-green-500', label: 'Complete' },
          { color: 'bg-forest-500', label: 'In Progress' },
          { color: 'bg-red-400', label: 'Delayed' },
          { color: 'bg-gray-200', label: 'Not Started' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className={`w-3 h-2.5 rounded-sm inline-block ${l.color}`} />
            <span>{l.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 inline-block bg-purple-500 rotate-45 rounded-sm" />
          <span>Milestone</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="w-0.5 h-4 bg-red-400 inline-block" />
          <span className="text-red-500">Today</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: 700 }}>
          {/* Timeline header */}
          <div className="flex border-b border-gray-100" style={{ paddingLeft: LABEL_W }}>
            <div className="relative flex-1 h-7 bg-gray-50">
              {months.map((m, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full flex items-center pl-1.5 text-xs text-gray-400 border-l border-gray-100"
                  style={{ left: `${m.left}%` }}
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {ALL_STAGES.map(stage => {
            const stageItems = byStage[stage.id] || []
            if (!stageItems.length) return null
            const done = stageItems.filter(i => i.done).length
            const isOpen = !collapsed[stage.id]

            return (
              <div key={stage.id}>
                {/* Stage header row */}
                <div
                  className="flex items-center cursor-pointer hover:bg-gray-50 border-b border-gray-100"
                  onClick={() => setCollapsed(s => ({ ...s, [stage.id]: !s[stage.id] }))}
                >
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50/80 shrink-0" style={{ width: LABEL_W }}>
                    {isOpen ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />}
                    <span className={`text-xs font-bold uppercase tracking-wide truncate ${stage.text}`}>{stage.label}</span>
                    <span className="text-xs text-gray-400 ml-auto shrink-0">{done}/{stageItems.length}</span>
                  </div>
                  <div className="flex-1 h-9 bg-gray-50/40 border-l border-gray-100 relative">
                    {months.map((m, i) => (
                      <div key={i} className="absolute top-0 h-full border-l border-gray-100" style={{ left: `${m.left}%` }} />
                    ))}
                    <div className="absolute top-0 h-full border-l-2 border-red-300/50" style={{ left: `${todayLeft}%` }} />
                  </div>
                </div>

                {isOpen && stageItems.map(item => {
                  const st = getStatus(item)
                  const startMs = item.startDate
                    ? new Date(item.startDate).getTime()
                    : new Date(item.dueDate).getTime() - 7 * 86400000
                  const endMs = new Date(item.dueDate).getTime()
                  const leftPct = Math.max(0, (startMs - minDate.getTime()) / 86400000 / totalDays * 100)
                  const endPct = Math.min(100, (endMs - minDate.getTime()) / 86400000 / totalDays * 100)
                  const widthPct = Math.max(endPct - leftPct, 0.4)

                  const barColor =
                    st === 'complete'     ? 'bg-green-500' :
                    st === 'delayed'      ? 'bg-red-400' :
                    st === 'in-progress'  ? 'bg-forest-500' : 'bg-gray-200'

                  return (
                    <div
                      key={item.id}
                      className="flex items-center border-b border-gray-50 hover:bg-gray-50/40"
                      style={{ height: 34 }}
                    >
                      <div className="flex items-center gap-1.5 px-3 shrink-0 overflow-hidden" style={{ width: LABEL_W }}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS[st].dot}`} />
                        <span className={`text-xs truncate ${item.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {item.label}
                        </span>
                      </div>

                      <div className="flex-1 relative h-full border-l border-gray-100">
                        {/* Grid lines */}
                        {months.map((m, i) => (
                          <div key={i} className="absolute top-0 h-full border-l border-gray-100/70" style={{ left: `${m.left}%` }} />
                        ))}
                        {/* Today line */}
                        <div className="absolute top-0 h-full border-l-2 border-red-400/50 z-10" style={{ left: `${todayLeft}%` }} />

                        {/* Milestone diamond */}
                        {item.type === 'milestone' ? (
                          <div
                            className="absolute top-1/2 w-2.5 h-2.5 bg-purple-500 rotate-45 rounded-sm z-20"
                            style={{ left: `${endPct}%`, transform: 'translateX(-50%) translateY(-50%) rotate(45deg)' }}
                          />
                        ) : (
                          <div
                            title={`${item.label} — due ${fmtFull(item.dueDate)}`}
                            className={`absolute top-1/2 -translate-y-1/2 rounded ${barColor} opacity-80 hover:opacity-100 cursor-default transition-opacity`}
                            style={{ left: `${leftPct}%`, width: `${widthPct}%`, height: 14 }}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Calendar View ─────────────────────────────────────────────────────────────

function CalendarView({ items }) {
  const [month, setMonth] = useState(todayDate.getMonth())
  const [year, setYear]   = useState(todayDate.getFullYear())

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }
  const goToday   = () => { setMonth(todayDate.getMonth()); setYear(todayDate.getFullYear()) }

  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const byDay = useMemo(() => {
    const map = {}
    items.forEach(i => {
      if (!i.dueDate) return
      const d = new Date(i.dueDate)
      if (d.getFullYear() !== year || d.getMonth() !== month) return
      const k = d.getDate()
      if (!map[k]) map[k] = []
      map[k].push(i)
    })
    return map
  }, [items, year, month])

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let i = 1; i <= daysInMonth; i++) cells.push(i)

  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' })
  const ty = todayDate.getFullYear(), tm = todayDate.getMonth(), td = todayDate.getDate()

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100">
        <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 text-sm">‹</button>
        <span className="font-semibold text-gray-800 flex-1 text-center">{monthLabel}</span>
        <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 text-sm">›</button>
        <button onClick={goToday} className="px-2.5 py-1 text-xs bg-forest-600 text-white rounded-lg hover:bg-forest-700">Today</button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="py-2 text-center text-xs font-medium text-gray-400">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (!day) return (
            <div key={`pad-${idx}`} className="min-h-[80px] border-b border-r border-gray-50 bg-gray-50/30" />
          )
          const dayItems = byDay[day] || []
          const isToday = day === td && month === tm && year === ty
          const isPast  = new Date(year, month, day) < todayDate

          return (
            <div
              key={day}
              className={`min-h-[80px] border-b border-r border-gray-50 p-1.5 ${isPast && !isToday ? 'bg-gray-50/20' : ''}`}
            >
              <div className={`w-6 h-6 flex items-center justify-center text-xs rounded-full mb-1 ${
                isToday ? 'bg-forest-600 text-white font-bold' : 'text-gray-600'
              }`}>
                {day}
              </div>
              <div className="space-y-0.5">
                {dayItems.slice(0, 3).map(item => {
                  const st = getStatus(item)
                  const dot =
                    st === 'complete'     ? 'bg-green-500' :
                    st === 'delayed'      ? 'bg-red-500' :
                    st === 'in-progress'  ? 'bg-amber-500' : 'bg-forest-400'
                  return (
                    <div key={item.id} className="flex items-center gap-1 text-xs text-gray-600 truncate">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                  )
                })}
                {dayItems.length > 3 && (
                  <div className="text-xs text-gray-400 pl-2.5">+{dayItems.length - 3} more</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function Schedule() {
  const { projects, checklistItems, milestones } = useStore()
  const [view, setView] = useState('list')
  const [filterProject, setFilterProject] = useState('')

  const items = useMemo(() => {
    const tasks = checklistItems.map(i => ({
      id: i.id,
      type: 'task',
      label: i.label,
      projectId: i.projectId,
      project: projects.find(p => p.id === i.projectId),
      stageId: i.stageId,
      stage: STAGE_MAP[i.stageId],
      startDate: i.startDate,
      dueDate: i.dueDate,
      createdAt: i.createdAt,
      owner: i.owner,
      isBlocker: i.isBlocker,
      status: i.status,
      done: i.done,
      priority: i.priority,
    }))

    const ms = milestones.map(m => ({
      id: m.id,
      type: 'milestone',
      label: m.label,
      projectId: m.projectId,
      project: projects.find(p => p.id === m.projectId),
      stageId: m.stageId,
      stage: STAGE_MAP[m.stageId],
      startDate: m.date,
      dueDate: m.date,
      createdAt: m.date,
      owner: '',
      isBlocker: false,
      status: m.complete ? 'complete' : 'not-started',
      done: m.complete,
      priority: 'medium',
    }))

    const all = [...tasks, ...ms]
    return filterProject ? all.filter(i => i.projectId === filterProject) : all
  }, [checklistItems, milestones, projects, filterProject])

  const TABS = [
    { key: 'list',     label: 'Task List', Icon: List },
    { key: 'gantt',    label: 'Gantt',     Icon: BarChart2 },
    { key: 'calendar', label: 'Calendar',  Icon: Calendar },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Schedule</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {items.length} tasks · {items.filter(i => i.done).length} complete · {items.filter(i => getStatus(i) === 'delayed').length} delayed
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View tabs */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 text-sm">
            {TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                  view === key
                    ? 'bg-white shadow-sm text-forest-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {/* Project filter */}
          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500"
          >
            <option value="">All projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {view === 'list'     && <TaskListView items={items} filterProject={filterProject} />}
      {view === 'gantt'    && <GanttView    items={items} />}
      {view === 'calendar' && <CalendarView items={items} />}
    </div>
  )
}
