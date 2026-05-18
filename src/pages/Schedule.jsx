import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart2, Calendar, ChevronDown, ChevronRight, Diamond, List, Search } from 'lucide-react'
import useStore from '../store/useStore'

const DAY_MS = 86_400_000
const TODAY = new Date()
TODAY.setHours(0, 0, 0, 0)

const STATUS = {
  complete: { label: 'Complete', dot: 'bg-green-500', text: 'text-green-700', bar: 'bg-green-500' },
  delayed: { label: 'Delayed', dot: 'bg-red-500', text: 'text-red-700', bar: 'bg-red-500' },
  blocked: { label: 'Blocked', dot: 'bg-red-700', text: 'text-red-800', bar: 'bg-red-700' },
  'on-hold': { label: 'On hold', dot: 'bg-amber-400', text: 'text-amber-700', bar: 'bg-amber-400' },
  'in-progress': { label: 'In progress', dot: 'bg-ocean-500', text: 'text-ocean-700', bar: 'bg-ocean-500' },
  'not-started': { label: 'Not started', dot: 'bg-gray-300', text: 'text-gray-500', bar: 'bg-gray-300' },
}

function parseDate(value) {
  if (!value) return null
  const parts = String(value).split('-').map(Number)
  if (parts.length === 3 && parts.every(Boolean)) return new Date(parts[0], parts[1] - 1, parts[2])
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  d.setHours(0, 0, 0, 0)
  return d
}

function fmtShort(value) {
  const d = parseDate(value)
  return d ? d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }) : '-'
}

function fmtFull(value) {
  const d = parseDate(value)
  return d ? d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
}

function diffDays(a, b) {
  const start = parseDate(a)
  const end = parseDate(b)
  if (!start || !end) return null
  return Math.round((end - start) / DAY_MS)
}

function addDays(date, days) {
  const d = parseDate(date) || new Date(date)
  return new Date(d.getTime() + days * DAY_MS)
}

function getStatus(item) {
  if (item.status === 'complete' || item.done) return 'complete'
  if (item.status === 'blocked') return 'blocked'
  if (item.status === 'on-hold') return 'on-hold'
  const end = parseDate(item.dueDate)
  if (end && end < TODAY) return 'delayed'
  if ((item.progress || 0) > 0 || item.status === 'in-progress') return 'in-progress'
  return 'not-started'
}

function StatusMark({ item }) {
  const status = getStatus(item)
  const cfg = STATUS[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function EmptySchedule() {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
      <Calendar size={30} className="mx-auto mb-3 text-gray-300" />
      <div className="mb-1 text-sm font-semibold text-gray-700">No programme tasks yet</div>
      <p className="mx-auto max-w-md text-sm text-gray-400">
        Open a project, go to its Schedule tab, and add the first phase.
      </p>
    </div>
  )
}

function ListView({ items }) {
  const [collapsed, setCollapsed] = useState({})

  const grouped = useMemo(() => {
    const byProject = new Map()
    items.forEach(item => {
      const projectName = item.project?.name || 'No project'
      if (!byProject.has(projectName)) byProject.set(projectName, new Map())
      const phases = byProject.get(projectName)
      const phase = item.phase || 'Unassigned'
      if (!phases.has(phase)) phases.set(phase, [])
      phases.get(phase).push(item)
    })
    return Array.from(byProject.entries()).map(([projectName, phases]) => ({
      projectName,
      phases: Array.from(phases.entries()).map(([phase, phaseItems]) => ({
        phase,
        items: phaseItems.sort((a, b) => (parseDate(a.dueDate) || 0) - (parseDate(b.dueDate) || 0)),
      })),
    }))
  }, [items])

  return (
    <div className="space-y-4">
      {grouped.map(projectGroup => (
        <div key={projectGroup.projectName} className="overflow-hidden rounded-xl border border-gray-100 bg-white">
          <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
            <div className="text-sm font-semibold text-gray-800">{projectGroup.projectName}</div>
          </div>

          {projectGroup.phases.map(({ phase, items: phaseItems }) => {
            const key = `${projectGroup.projectName}:${phase}`
            const open = !collapsed[key]
            const complete = phaseItems.filter(i => getStatus(i) === 'complete').length
            const delayed = phaseItems.filter(i => getStatus(i) === 'delayed').length
            return (
              <div key={phase} className="border-b border-gray-50 last:border-b-0">
                <button
                  onClick={() => setCollapsed(c => ({ ...c, [key]: !c[key] }))}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-gray-50"
                >
                  {open ? <ChevronDown size={13} className="text-gray-400" /> : <ChevronRight size={13} className="text-gray-400" />}
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-600">{phase}</span>
                  <span className="text-xs text-gray-400">{phaseItems.length} tasks</span>
                  {complete > 0 && <span className="text-xs font-medium text-green-700">{complete} done</span>}
                  {delayed > 0 && <span className="text-xs font-medium text-red-700">{delayed} delayed</span>}
                </button>

                {open && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" style={{ minWidth: 760 }}>
                      <thead>
                        <tr className="border-y border-gray-50 bg-gray-50/70 text-left text-xs uppercase text-gray-400">
                          <th className="px-4 py-2 font-medium">Task</th>
                          <th className="w-32 px-3 py-2 font-medium">Start</th>
                          <th className="w-32 px-3 py-2 font-medium">Finish</th>
                          <th className="w-28 px-3 py-2 font-medium">Days</th>
                          <th className="w-36 px-3 py-2 font-medium">Status</th>
                          <th className="w-28 px-3 py-2 font-medium">Project</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {phaseItems.map(item => {
                          const days = diffDays(item.startDate, item.dueDate)
                          return (
                            <tr key={item.id} className="hover:bg-gray-50/70">
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  {item.isMilestone
                                    ? <Diamond size={12} className="shrink-0 fill-amber-400 text-amber-500" />
                                    : <span className={`h-2 w-2 rounded-full ${STATUS[getStatus(item)].dot}`} />
                                  }
                                  <span className={`font-medium ${getStatus(item) === 'complete' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{item.label}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-xs text-gray-500">{fmtShort(item.startDate)}</td>
                              <td className={`px-3 py-2.5 text-xs ${getStatus(item) === 'delayed' ? 'font-medium text-red-700' : 'text-gray-500'}`}>{fmtShort(item.dueDate)}</td>
                              <td className="px-3 py-2.5 text-xs text-gray-400">{days == null ? '-' : `${days + 1}d`}</td>
                              <td className="px-3 py-2.5"><StatusMark item={item} /></td>
                              <td className="px-3 py-2.5">
                                {item.project
                                  ? <Link className="text-xs font-medium text-forest-600 hover:underline" to={`/projects/${item.project.id}`}>Open</Link>
                                  : <span className="text-xs text-gray-300">-</span>
                                }
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function GanttView({ items }) {
  const [zoom, setZoom] = useState('weeks')
  const dayPx = zoom === 'days' ? 20 : zoom === 'weeks' ? 8 : 4
  const dated = items.filter(i => i.startDate || i.dueDate)
  const labelW = 280

  const timeline = useMemo(() => {
    if (!dated.length) {
      return { start: new Date(TODAY.getFullYear(), TODAY.getMonth(), 1), end: addDays(TODAY, 60) }
    }
    const dates = dated.flatMap(i => [parseDate(i.startDate), parseDate(i.dueDate)]).filter(Boolean)
    const min = new Date(Math.min(...dates.map(d => d.getTime())))
    const max = new Date(Math.max(...dates.map(d => d.getTime())))
    return {
      start: new Date(min.getFullYear(), min.getMonth(), 1),
      end: new Date(max.getFullYear(), max.getMonth() + 2, 0),
    }
  }, [dated])

  if (!dated.length) return <EmptySchedule />

  const totalDays = Math.max(1, diffDays(timeline.start, timeline.end) + 1)
  const totalW = totalDays * dayPx
  const xFor = date => Math.max(0, (diffDays(timeline.start, date) || 0) * dayPx)
  const todayX = xFor(TODAY)
  const monthSegments = []
  let cursor = new Date(timeline.start)
  while (cursor <= timeline.end) {
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
    monthSegments.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
      label: cursor.toLocaleDateString('en-NZ', { month: 'short', year: '2-digit' }),
      x: xFor(cursor),
      w: (diffDays(cursor, end) + 1) * dayPx,
    })
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }

  const grouped = new Map()
  dated.forEach(item => {
    const key = item.project?.name || 'No project'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(item)
  })

  const grid = (
    <>
      {monthSegments.map(m => <div key={m.key} className="absolute top-0 h-full border-l border-gray-200/80" style={{ left: m.x }} />)}
      {todayX >= 0 && todayX <= totalW && <div className="absolute top-0 z-10 h-full border-l-2 border-ocean-500/50" style={{ left: todayX }} />}
    </>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
          {Object.entries(STATUS).map(([key, cfg]) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-5 rounded ${cfg.bar}`} />
              {cfg.label}
            </span>
          ))}
        </div>
        <div className="flex rounded-lg bg-gray-100 p-1">
          {['days', 'weeks', 'months'].map(key => (
            <button
              key={key}
              onClick={() => setZoom(key)}
              className={`rounded-md px-3 py-1 text-xs font-medium capitalize ${zoom === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        <div className="overflow-x-auto">
          <div style={{ minWidth: labelW + totalW, width: labelW + totalW }}>
            <div className="flex border-b border-gray-200" style={{ height: 38 }}>
              <div className="sticky left-0 z-20 flex shrink-0 items-center border-r border-gray-100 bg-gray-50 px-4" style={{ width: labelW }}>
                <span className="text-xs font-medium text-gray-500">Task</span>
              </div>
              <div className="relative shrink-0 bg-gray-50" style={{ width: totalW }}>
                {monthSegments.map(m => (
                  <div key={m.key} className="absolute top-0 flex h-full items-center border-r border-gray-200 px-2" style={{ left: m.x, width: m.w }}>
                    <span className="whitespace-nowrap text-xs font-semibold text-gray-500">{m.label}</span>
                  </div>
                ))}
                {todayX >= 0 && todayX <= totalW && <div className="absolute top-2 z-20 text-[10px] font-bold text-ocean-700" style={{ left: todayX + 5 }}>Today</div>}
              </div>
            </div>

            {Array.from(grouped.entries()).map(([projectName, projectItems]) => (
              <div key={projectName}>
                <div className="flex border-b border-gray-100 bg-gray-50" style={{ height: 28 }}>
                  <div className="sticky left-0 z-10 flex shrink-0 items-center border-r border-gray-100 bg-gray-50 px-4" style={{ width: labelW }}>
                    <span className="truncate text-[11px] font-bold uppercase text-gray-500">{projectName}</span>
                  </div>
                  <div className="relative shrink-0" style={{ width: totalW }}>{grid}</div>
                </div>
                {projectItems.map(item => {
                  const status = getStatus(item)
                  const cfg = STATUS[status]
                  const start = parseDate(item.startDate || item.dueDate)
                  const end = parseDate(item.dueDate || item.startDate)
                  const left = xFor(start)
                  const width = Math.max(dayPx * 2, (diffDays(start, end) + 1) * dayPx)
                  return (
                    <div key={item.id} className="flex border-b border-gray-50 hover:bg-gray-50/60" style={{ height: 34 }}>
                      <div className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-gray-100 bg-white px-4" style={{ width: labelW }}>
                        {item.isMilestone ? <Diamond size={11} className="shrink-0 fill-amber-400 text-amber-500" /> : <span className={`h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />}
                        <span className={`truncate text-xs ${status === 'complete' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{item.label}</span>
                      </div>
                      <div className="relative shrink-0" style={{ width: totalW }}>
                        {grid}
                        {item.isMilestone ? (
                          <div className={`${cfg.bar} absolute top-1/2 h-3.5 w-3.5 rounded-sm`} style={{ left: xFor(end), transform: 'translate(-50%, -50%) rotate(45deg)' }} />
                        ) : (
                          <div className={`${cfg.bar} absolute top-1/2 rounded opacity-85`} style={{ left, width, height: 16, transform: 'translateY(-50%)' }} title={`${item.label}: ${fmtFull(start)} to ${fmtFull(end)}`} />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function CalendarView({ items }) {
  const [month, setMonth] = useState(TODAY.getMonth())
  const [year, setYear] = useState(TODAY.getFullYear())

  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' })

  const byDay = useMemo(() => {
    const map = {}
    items.forEach(item => {
      const due = parseDate(item.dueDate)
      if (!due || due.getFullYear() !== year || due.getMonth() !== month) return
      const day = due.getDate()
      if (!map[day]) map[day] = []
      map[day].push(item)
    })
    return map
  }, [items, month, year])

  const moveMonth = delta => {
    const next = new Date(year, month + delta, 1)
    setMonth(next.getMonth())
    setYear(next.getFullYear())
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
      <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3">
        <button onClick={() => moveMonth(-1)} className="rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100">Prev</button>
        <div className="flex-1 text-center text-sm font-semibold text-gray-800">{monthLabel}</div>
        <button onClick={() => moveMonth(1)} className="rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100">Next</button>
        <button onClick={() => { setMonth(TODAY.getMonth()); setYear(TODAY.getFullYear()) }} className="rounded-lg bg-forest-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-forest-700">Today</button>
      </div>
      <div className="grid grid-cols-7 border-b border-gray-100">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="py-2 text-center text-xs font-medium text-gray-400">{day}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, index) => {
          if (!day) return <div key={`pad-${index}`} className="min-h-[92px] border-b border-r border-gray-50 bg-gray-50/30" />
          const dayItems = byDay[day] || []
          const isToday = day === TODAY.getDate() && month === TODAY.getMonth() && year === TODAY.getFullYear()
          return (
            <div key={day} className="min-h-[92px] border-b border-r border-gray-50 p-1.5">
              <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? 'bg-forest-600 font-bold text-white' : 'text-gray-600'}`}>{day}</div>
              <div className="space-y-0.5">
                {dayItems.slice(0, 4).map(item => (
                  <div key={item.id} className="flex items-center gap-1 truncate text-xs text-gray-600" title={`${item.project?.name || ''}: ${item.label}`}>
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS[getStatus(item)].dot}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                ))}
                {dayItems.length > 4 && <div className="pl-2 text-xs text-gray-400">+{dayItems.length - 4} more</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Schedule() {
  const { projects, scheduleTasks, milestones } = useStore()
  const [view, setView] = useState('list')
  const [filterProject, setFilterProject] = useState('')
  const [search, setSearch] = useState('')

  const items = useMemo(() => {
    const programme = scheduleTasks.map(task => {
      const project = projects.find(p => p.id === task.projectId)
      return {
        id: task.id,
        type: 'programme',
        label: task.name,
        project,
        projectId: task.projectId,
        phase: task.phase || 'Unassigned',
        startDate: task.startDate,
        dueDate: task.endDate || task.startDate,
        status: task.status,
        progress: task.progress,
        isMilestone: task.isMilestone,
      }
    })
    const projectMilestones = milestones.map(milestone => {
      const project = projects.find(p => p.id === milestone.projectId)
      return {
        id: `milestone-${milestone.id}`,
        type: 'project-milestone',
        label: milestone.label,
        project,
        projectId: milestone.projectId,
        phase: 'Project milestones',
        startDate: milestone.date,
        dueDate: milestone.date,
        status: milestone.complete ? 'complete' : 'not-started',
        done: milestone.complete,
        progress: milestone.complete ? 100 : 0,
        isMilestone: true,
      }
    })
    return [...programme, ...projectMilestones]
  }, [scheduleTasks, milestones, projects])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(item => {
      if (filterProject && item.projectId !== filterProject) return false
      if (!q) return true
      return [item.label, item.phase, item.project?.name].some(value => String(value || '').toLowerCase().includes(q))
    })
  }, [items, filterProject, search])

  const stats = useMemo(() => ({
    total: filtered.length,
    complete: filtered.filter(i => getStatus(i) === 'complete').length,
    delayed: filtered.filter(i => getStatus(i) === 'delayed').length,
    milestones: filtered.filter(i => i.isMilestone).length,
  }), [filtered])

  const tabs = [
    { key: 'list', label: 'Programme', Icon: List },
    { key: 'gantt', label: 'Gantt', Icon: BarChart2 },
    { key: 'calendar', label: 'Calendar', Icon: Calendar },
  ]

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Schedule</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            {stats.total} items · {stats.complete} complete · {stats.delayed} delayed · {stats.milestones} milestones
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              className="w-56 rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-ocean-500"
              placeholder="Search schedule"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-ocean-500">
            <option value="">All projects</option>
            {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <div className="flex rounded-lg bg-gray-100 p-1">
            {tabs.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${view === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptySchedule />
      ) : (
        <>
          {view === 'list' && <ListView items={filtered} />}
          {view === 'gantt' && <GanttView items={filtered} />}
          {view === 'calendar' && <CalendarView items={filtered} />}
        </>
      )}
    </div>
  )
}
