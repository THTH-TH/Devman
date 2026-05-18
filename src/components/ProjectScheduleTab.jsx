import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart2,
  Calendar,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Diamond,
  List,
  Minus,
  Plus,
  Search,
} from 'lucide-react'
import useStore from '../store/useStore'

const DAY_MS = 86_400_000

const STATUS_OPTIONS = [
  { value: 'not-started', label: 'Not Started', dot: 'bg-gray-300', text: 'text-gray-500', bar: 'bg-gray-300', row: '' },
  { value: 'in-progress', label: 'In Progress', dot: 'bg-forest-600', text: 'text-forest-700', bar: 'bg-forest-600', row: '' },
  { value: 'complete', label: 'Complete', dot: 'bg-emerald-600', text: 'text-emerald-700', bar: 'bg-emerald-600', row: 'bg-emerald-50/25' },
  { value: 'delayed', label: 'Delayed', dot: 'bg-red-600', text: 'text-red-700', bar: 'bg-red-600', row: 'bg-red-50/25' },
  { value: 'blocked', label: 'Blocked', dot: 'bg-red-700', text: 'text-red-800', bar: 'bg-red-700', row: 'bg-red-50/30' },
  { value: 'on-hold', label: 'On Hold', dot: 'bg-amber-400', text: 'text-amber-700', bar: 'bg-amber-400', row: 'bg-amber-50/20' },
]

const STATUS_MAP = Object.fromEntries(STATUS_OPTIONS.map(s => [s.value, s]))
const SELECTABLE_STATUSES = STATUS_OPTIONS.filter(s => s.value !== 'delayed')

function parseDate(value) {
  if (!value) return null
  if (value instanceof Date) {
    const copy = new Date(value)
    copy.setHours(0, 0, 0, 0)
    return copy
  }
  const parts = String(value).split('-').map(Number)
  if (parts.length === 3 && parts.every(Boolean)) return new Date(parts[0], parts[1] - 1, parts[2])
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  d.setHours(0, 0, 0, 0)
  return d
}

function formatInput(value) {
  const d = parseDate(value)
  if (!d) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatShort(value) {
  const d = parseDate(value)
  return d ? d.toLocaleDateString('en-NZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
}

function formatMonth(value) {
  const d = parseDate(value)
  return d ? d.toLocaleDateString('en-NZ', { month: 'short' }) : ''
}

function addDays(value, days) {
  const d = parseDate(value)
  if (!d) return null
  return new Date(d.getTime() + days * DAY_MS)
}

function diffDays(start, end) {
  const s = parseDate(start)
  const e = parseDate(end)
  if (!s || !e) return null
  return Math.round((e - s) / DAY_MS)
}

function durationDays(task) {
  if (task.durationDays) return task.durationDays
  const diff = diffDays(task.startDate, task.endDate)
  return diff == null || diff < 0 ? null : diff + 1
}

function today() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function smartStatus(task) {
  if (task.status === 'complete') return 'complete'
  if (task.status === 'blocked') return 'blocked'
  if (task.status === 'on-hold') return 'on-hold'
  if (task.status === 'delayed') return 'delayed'
  const current = today()
  const finish = parseDate(task.endDate)
  const start = parseDate(task.startDate)
  if (finish && finish < current) return 'delayed'
  if (start && start < current && task.status === 'not-started') return 'delayed'
  if (task.status === 'in-progress' || Number(task.progress || 0) > 0) return 'in-progress'
  return 'not-started'
}

function groupTasks(tasks) {
  const map = new Map()
  tasks
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
    .forEach(task => {
      const phase = task.phase || 'Uncategorised'
      if (!map.has(phase)) map.set(phase, [])
      map.get(phase).push(task)
    })
  return Array.from(map.entries()).map(([phase, items]) => ({ phase, items }))
}

function StatusSelect({ task, onChange }) {
  const status = smartStatus(task)
  const cfg = STATUS_MAP[status] || STATUS_MAP['not-started']

  return (
    <div className="relative inline-flex min-w-[120px] items-center rounded-md bg-gray-50">
      <span className={`pointer-events-none absolute left-3 h-2 w-2 rounded-full ${cfg.dot}`} />
      <select
        className="h-7 w-full appearance-none rounded-md border border-transparent bg-transparent pl-7 pr-8 text-xs text-gray-700 outline-none hover:border-gray-200 focus:border-ocean-400 focus:bg-white"
        value={task.status || 'not-started'}
        onChange={e => onChange(task, e.target.value)}
      >
        {SELECTABLE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-2 text-gray-400" />
    </div>
  )
}

function DateCell({ value, onCommit }) {
  const [draft, setDraft] = useState(formatInput(value))

  useEffect(() => setDraft(formatInput(value)), [value])

  return (
    <input
      type="date"
      className="h-7 w-[118px] rounded-md border border-transparent bg-transparent px-1.5 text-xs text-gray-700 outline-none hover:border-gray-200 focus:border-ocean-400 focus:bg-white"
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== formatInput(value)) onCommit(draft)
      }}
    />
  )
}

function ScheduleStats({ tasks }) {
  const total = tasks.length
  const complete = tasks.filter(t => smartStatus(t) === 'complete').length
  const delayed = tasks.filter(t => smartStatus(t) === 'delayed').length
  const pct = total ? Math.round((complete / total) * 100) : 0

  return (
    <div className="flex flex-wrap items-center gap-4 text-xs">
      <span className="text-gray-500">{total} tasks</span>
      <span className="font-medium text-emerald-700">{complete} complete</span>
      {delayed > 0 && <span className="font-medium text-red-600">{delayed} delayed</span>}
      <span className="text-gray-500">{pct}% done</span>
    </div>
  )
}

function EmptySchedule({ onAddTask }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
      <CalendarDays size={28} className="mx-auto mb-3 text-gray-300" />
      <div className="mb-1 text-sm font-semibold text-gray-700">No schedule tasks yet</div>
      <p className="mb-5 text-sm text-gray-400">Add the first task and start building the project programme.</p>
      <button onClick={onAddTask} className="inline-flex items-center gap-2 rounded-md bg-forest-600 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700">
        <Plus size={14} /> Add task
      </button>
    </div>
  )
}

function TaskForm({ projectId, phaseOptions, onClose }) {
  const { addScheduleTask } = useStore()
  const [form, setForm] = useState({
    name: '',
    phase: phaseOptions[0] || 'Project Commencement',
    startDate: '',
    endDate: '',
    status: 'not-started',
  })

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))

  const save = async () => {
    if (!form.name.trim()) return
    await addScheduleTask({
      projectId,
      name: form.name.trim(),
      phase: form.phase.trim() || 'Uncategorised',
      startDate: form.startDate,
      endDate: form.endDate,
      durationDays: durationDays(form),
      status: form.status,
      progress: form.status === 'complete' ? 100 : 0,
    })
    onClose()
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-gray-800">New schedule task</div>
      <div className="grid gap-3 md:grid-cols-[1fr_210px_150px_150px_140px]">
        <input
          autoFocus
          className="h-9 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-ocean-400"
          placeholder="Task name"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
        />
        <input
          className="h-9 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-ocean-400"
          placeholder="Stage"
          list="schedule-phases"
          value={form.phase}
          onChange={e => set('phase', e.target.value)}
        />
        <datalist id="schedule-phases">
          {phaseOptions.map(phase => <option key={phase} value={phase} />)}
        </datalist>
        <input type="date" className="h-9 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-ocean-400" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
        <input type="date" className="h-9 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-ocean-400" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
        <select className="h-9 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-ocean-400" value={form.status} onChange={e => set('status', e.target.value)}>
          {SELECTABLE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-md px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50">Cancel</button>
        <button onClick={save} disabled={!form.name.trim()} className="rounded-md bg-forest-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-forest-700 disabled:opacity-40">Add task</button>
      </div>
    </div>
  )
}

function TaskListView({ projectId, tasks, showProject = false }) {
  const { updateScheduleTask, deleteScheduleTask } = useStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stageFilter, setStageFilter] = useState('all')
  const [collapsed, setCollapsed] = useState(new Set())
  const [showNewTask, setShowNewTask] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const phases = useMemo(() => [...new Set(tasks.map(t => t.phase).filter(Boolean))], [tasks])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tasks.filter(task => {
      if (statusFilter !== 'all' && smartStatus(task) !== statusFilter) return false
      if (stageFilter !== 'all' && task.phase !== stageFilter) return false
      if (!q) return true
      return [task.name, task.phase, task.assignee, task.internalOwner].some(v => String(v || '').toLowerCase().includes(q))
    })
  }, [tasks, search, statusFilter, stageFilter])

  const grouped = useMemo(() => groupTasks(filtered), [filtered])

  const toggleGroup = phase => {
    setCollapsed(current => {
      const next = new Set(current)
      if (next.has(phase)) next.delete(phase)
      else next.add(phase)
      return next
    })
  }

  const updateStatus = async (task, status) => {
    await updateScheduleTask(task.id, {
      status,
      progress: status === 'complete' ? 100 : status === 'not-started' ? 0 : task.progress,
      actualEnd: status === 'complete' ? formatInput(new Date()) : task.actualEnd,
    })
  }

  const updateDate = async (task, field, value) => {
    const next = { [field]: value }
    if (field === 'startDate' && task.endDate) next.durationDays = durationDays({ ...task, startDate: value })
    if (field === 'endDate') next.durationDays = durationDays({ ...task, endDate: value })
    await updateScheduleTask(task.id, next)
  }

  const tableCols = showProject
    ? 'grid-cols-[minmax(320px,1fr)_150px_132px_132px_80px_150px_48px]'
    : 'grid-cols-[minmax(320px,1fr)_132px_132px_80px_150px_48px]'

  if (!tasks.length && !showNewTask) return <EmptySchedule onAddTask={() => projectId && setShowNewTask(true)} />

  return (
    <div className="space-y-3">
      <ScheduleStats tasks={tasks} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="h-9 w-64 rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-ocean-400"
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="h-9 w-44 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-600 outline-none focus:border-ocean-400" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className="h-9 w-52 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-600 outline-none focus:border-ocean-400" value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
          <option value="all">All Stages</option>
          {phases.map(phase => <option key={phase} value={phase}>{phase}</option>)}
        </select>
        <div className="flex-1" />
        {projectId && (
          <button onClick={() => setShowNewTask(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-forest-600 px-3 text-sm font-medium text-white hover:bg-forest-700">
            <Plus size={14} /> Add Task
          </button>
        )}
        <button onClick={() => setCollapsed(new Set())} className="h-8 rounded-md px-2 text-xs text-gray-600 hover:bg-gray-50">Expand All</button>
        <button onClick={() => setCollapsed(new Set(grouped.map(g => g.phase)))} className="h-8 rounded-md px-2 text-xs text-gray-600 hover:bg-gray-50">Collapse All</button>
      </div>

      {showNewTask && projectId && <TaskForm projectId={projectId} phaseOptions={phases} onClose={() => setShowNewTask(false)} />}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className={`grid ${tableCols} border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500`}>
          <div className="px-5 py-3">Task</div>
          {showProject && <div className="px-3 py-3">Project</div>}
          <div className="px-3 py-3">Start</div>
          <div className="px-3 py-3">Finish</div>
          <div className="px-3 py-3">Days</div>
          <div className="px-3 py-3">Status</div>
          <div />
        </div>

        {grouped.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">No tasks found.</div>
        ) : grouped.map(({ phase, items }) => {
          const isCollapsed = collapsed.has(phase)
          const complete = items.filter(t => smartStatus(t) === 'complete').length
          const delayed = items.filter(t => smartStatus(t) === 'delayed').length
          const pct = items.length ? Math.round((complete / items.length) * 100) : 0

          return (
            <div key={phase}>
              <button
                onClick={() => toggleGroup(phase)}
                className="flex w-full items-center gap-2 border-b border-gray-200 bg-forest-50/25 px-4 py-2 text-left hover:bg-forest-50/50"
              >
                {isCollapsed ? <ChevronRight size={15} className="text-gray-500" /> : <ChevronDown size={15} className="text-gray-500" />}
                <span className="text-sm font-bold uppercase tracking-wide text-forest-700">{phase}</span>
                <span className="text-xs text-gray-500">{complete}/{items.length}</span>
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-gray-500">{pct}%</span>
                {delayed > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">{delayed} delayed</span>}
              </button>

              {!isCollapsed && items.map(task => {
                const status = smartStatus(task)
                const cfg = STATUS_MAP[status] || STATUS_MAP['not-started']
                const days = durationDays(task)

                return (
                  <div
                    key={task.id}
                    className={`group grid ${tableCols} items-center border-b border-gray-200 last:border-b-0 ${cfg.row} hover:bg-gray-50`}
                  >
                    <div className="min-w-0 px-5 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        {task.isMilestone && <Diamond size={12} className="shrink-0 fill-forest-600 text-forest-600" />}
                        <button
                          onClick={() => setShowNewTask(false)}
                          className={`truncate text-left text-sm ${status === 'complete' ? 'text-gray-500 line-through' : 'text-gray-800'}`}
                          title={task.name}
                        >
                          {task.name}
                        </button>
                      </div>
                    </div>
                    {showProject && <div className="truncate px-3 text-sm text-gray-600">{task.projectName || '-'}</div>}
                    <div className="px-2"><DateCell value={task.startDate} onCommit={value => updateDate(task, 'startDate', value)} /></div>
                    <div className="px-2"><DateCell value={task.endDate} onCommit={value => updateDate(task, 'endDate', value)} /></div>
                    <div className="px-3 text-sm text-gray-500">{days ? `${days}d` : '-'}</div>
                    <div className="px-2"><StatusSelect task={task} onChange={updateStatus} /></div>
                    <div className="px-2 text-right">
                      {confirmDelete === task.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { deleteScheduleTask(task.id); setConfirmDelete(null) }} className="rounded px-1.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Yes</button>
                          <button onClick={() => setConfirmDelete(null)} className="rounded px-1.5 py-1 text-xs text-gray-400 hover:bg-gray-50">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(task.id)} className="rounded px-2 py-1 text-xs text-gray-300 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100">Del</button>
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
  )
}

function GanttView({ tasks }) {
  const [zoom, setZoom] = useState(46)
  const [groupByStage, setGroupByStage] = useState(true)
  const scrollRef = useRef(null)

  const datedTasks = tasks.filter(t => t.startDate || t.endDate)
  const allDates = datedTasks.flatMap(t => [parseDate(t.startDate), parseDate(t.endDate)]).filter(Boolean)
  const minDate = allDates.length ? addDays(new Date(Math.min(...allDates.map(d => d.getTime()))), -7) : addDays(new Date(), -14)
  const maxDate = allDates.length ? addDays(new Date(Math.max(...allDates.map(d => d.getTime()))), 14) : addDays(new Date(), 60)
  const totalDays = Math.max(30, diffDays(minDate, maxDate) + 1)
  const colW = Math.round(4 + (zoom / 100) * 36)
  const rowH = 36
  const labelW = 260
  const now = today()
  const todayOffset = diffDays(minDate, now)

  useEffect(() => {
    if (scrollRef.current && todayOffset > 0) {
      scrollRef.current.scrollLeft = Math.max(0, todayOffset * colW - scrollRef.current.clientWidth / 3)
    }
  }, [todayOffset, colW])

  const rows = useMemo(() => {
    if (!groupByStage) return datedTasks.map(task => ({ type: 'task', task }))
    const result = []
    groupTasks(datedTasks).forEach(group => {
      result.push({ type: 'header', phase: group.phase })
      group.items.forEach(task => result.push({ type: 'task', task }))
    })
    return result
  }, [datedTasks, groupByStage])

  const dates = useMemo(() => {
    const list = []
    for (let i = 0; i <= totalDays; i += 1) list.push(addDays(minDate, i))
    return list
  }, [minDate.getTime(), totalDays])

  const labelMode = colW >= 28 ? 'day' : colW >= 12 ? 'week' : 'month'

  const scrollToToday = () => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTo({ left: Math.max(0, todayOffset * colW - scrollRef.current.clientWidth / 3), behavior: 'smooth' })
  }

  const barFor = task => {
    const start = parseDate(task.startDate || task.endDate)
    const end = parseDate(task.endDate || task.startDate)
    if (!start || !end) return null
    return {
      left: Math.max(0, diffDays(minDate, start) * colW),
      width: Math.max(colW, (diffDays(start, end) + 1) * colW),
      endLeft: Math.max(0, diffDays(minDate, end) * colW),
    }
  }

  if (!datedTasks.length) {
    return <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">No tasks with dates yet.</div>
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2">
        <button
          onClick={() => setGroupByStage(v => !v)}
          className={`rounded px-3 py-1.5 text-xs font-medium ${groupByStage ? 'bg-forest-600 text-white' : 'text-gray-600 hover:bg-white'}`}
        >
          Group by Stage
        </button>
        <button onClick={scrollToToday} className="inline-flex items-center gap-1 rounded px-2.5 py-1.5 text-xs text-gray-700 hover:bg-white">
          <CalendarDays size={13} /> Today
        </button>
        <div className="mx-1 h-5 w-px bg-gray-200" />
        <div className="flex items-center gap-2">
          <Minus size={13} className="text-gray-500" />
          <input className="w-28 accent-forest-600" type="range" min="0" max="100" value={zoom} onChange={e => setZoom(Number(e.target.value))} />
          <Plus size={13} className="text-gray-500" />
        </div>
        <div className="flex-1" />
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-5 rounded bg-forest-600" />In Progress</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-5 rounded bg-emerald-600" />Complete</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-5 rounded bg-red-600" />Delayed</span>
          <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rotate-45 bg-forest-600" />Milestone</span>
        </div>
      </div>

      <div className="flex overflow-hidden" style={{ maxHeight: 'calc(100vh - 310px)', minHeight: 430 }}>
        <div className="shrink-0 overflow-y-auto border-r border-gray-200" style={{ width: labelW }}>
          <div className="sticky top-0 z-10 flex h-10 items-center border-b border-gray-200 bg-gray-50 px-4 text-xs font-medium text-gray-500">Task</div>
          {rows.map((row, index) => row.type === 'header' ? (
            <div key={`${row.phase}-${index}`} className="flex items-center border-b border-gray-200 bg-forest-50/30 px-4 text-xs font-bold uppercase tracking-wide text-forest-700" style={{ height: 28 }}>
              <span className="truncate">{row.phase}</span>
            </div>
          ) : (
            <div key={row.task.id} className="flex items-center border-b border-gray-200 px-4 hover:bg-gray-50" style={{ height: rowH }}>
              <div className="flex min-w-0 items-center gap-2">
                {row.task.isMilestone && <span className="h-2.5 w-2.5 rotate-45 bg-forest-600" />}
                <span className="truncate text-sm text-gray-800">{row.task.name}</span>
              </div>
            </div>
          ))}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-auto">
          <div style={{ width: totalDays * colW, minWidth: '100%' }}>
            <div className="sticky top-0 z-10 flex h-10 border-b border-gray-200 bg-gray-50">
              {dates.map((date, index) => {
                const firstOfMonth = date.getDate() === 1
                const monday = date.getDay() === 1
                let show = false
                let label = ''
                if (labelMode === 'day') {
                  show = true
                  label = String(date.getDate())
                } else if (labelMode === 'week') {
                  show = monday || firstOfMonth
                  label = firstOfMonth ? `${formatMonth(date)} ${date.getDate()}` : String(date.getDate())
                } else {
                  show = firstOfMonth
                  label = formatMonth(date)
                }
                if (!show) return null
                return <div key={index} className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] ${firstOfMonth ? 'font-medium text-gray-800' : 'text-gray-500'}`} style={{ left: index * colW }}>{label}</div>
              })}
            </div>

            {rows.map((row, index) => {
              if (row.type === 'header') {
                return (
                  <div key={`${row.phase}-${index}`} className="relative border-b border-gray-200 bg-forest-50/10" style={{ height: 28 }}>
                    {todayOffset >= 0 && todayOffset <= totalDays && <div className="absolute top-0 bottom-0 z-10 w-px bg-red-400" style={{ left: todayOffset * colW }} />}
                  </div>
                )
              }

              const task = row.task
              const bar = barFor(task)
              const status = smartStatus(task)
              const cfg = STATUS_MAP[status] || STATUS_MAP['not-started']
              return (
                <div key={task.id} className="relative border-b border-gray-200 hover:bg-gray-50/50" style={{ height: rowH }}>
                  {labelMode === 'day' && dates.map((date, dayIndex) => (date.getDay() === 0 || date.getDay() === 6) ? (
                    <div key={dayIndex} className="absolute top-0 bottom-0 bg-gray-50" style={{ left: dayIndex * colW, width: colW }} />
                  ) : null)}
                  {todayOffset >= 0 && todayOffset <= totalDays && <div className="absolute top-0 bottom-0 z-10 w-px bg-red-400" style={{ left: todayOffset * colW }} />}
                  {bar && task.isMilestone ? (
                    <div className="absolute top-1/2 z-20 flex -translate-y-1/2 items-center gap-2" style={{ left: bar.endLeft }}>
                      <span className={`h-3.5 w-3.5 -translate-x-1/2 rotate-45 ${cfg.bar}`} />
                      <span className="max-w-[150px] truncate text-[11px] font-medium text-gray-800">{task.name}</span>
                    </div>
                  ) : bar ? (
                    <div className="absolute top-1/2 z-20 flex -translate-y-1/2 items-center" style={{ left: bar.left }}>
                      <div className={`h-5 rounded ${cfg.bar}`} style={{ width: bar.width }} title={`${task.name}: ${formatShort(task.startDate)} - ${formatShort(task.endDate)}`} />
                      <span className="ml-2 max-w-[170px] truncate text-[11px] font-medium text-gray-800">{task.name}</span>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function CalendarView({ tasks }) {
  const [currentMonth, setCurrentMonth] = useState(() => today())
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
  const firstDay = (monthStart.getDay() + 6) % 7
  const calendarStart = addDays(monthStart, -firstDay)
  const days = Array.from({ length: 42 }, (_, i) => addDays(calendarStart, i))

  const tasksForDay = day => tasks.filter(task => {
    const start = parseDate(task.startDate)
    const end = parseDate(task.endDate || task.startDate)
    if (!start || !end) return false
    return day >= start && day <= end
  })

  const moveMonth = offset => setCurrentMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1))

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
        <button onClick={() => moveMonth(-1)} className="rounded p-1.5 text-gray-500 hover:bg-white"><ChevronLeft size={16} /></button>
        <div className="text-sm font-semibold text-gray-800">{currentMonth.toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' })}</div>
        <button onClick={() => moveMonth(1)} className="rounded p-1.5 text-gray-500 hover:bg-white"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/70">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <div key={day} className="py-2 text-center text-xs font-medium text-gray-500">{day}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map(day => {
          const dayTasks = tasksForDay(day)
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
          const isToday = day.toDateString() === today().toDateString()
          return (
            <div key={day.toISOString()} className={`min-h-[96px] border-b border-r border-gray-100 p-1.5 ${isCurrentMonth ? 'bg-white' : 'bg-gray-50/50'}`}>
              <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? 'bg-forest-600 font-bold text-white' : isCurrentMonth ? 'text-gray-700' : 'text-gray-300'}`}>{day.getDate()}</div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map(task => {
                  const cfg = STATUS_MAP[smartStatus(task)] || STATUS_MAP['not-started']
                  return (
                    <div key={task.id} className="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] text-gray-700 hover:bg-gray-50" title={task.name}>
                      {task.isMilestone ? <Diamond size={10} className="shrink-0 fill-forest-600 text-forest-600" /> : <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />}
                      <span className="truncate">{task.name}</span>
                    </div>
                  )
                })}
                {dayTasks.length > 3 && <div className="px-1 text-[10px] text-gray-400">+{dayTasks.length - 3} more</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { CalendarView as ScheduleCalendarView, GanttView as ScheduleGanttView, TaskListView as ScheduleTaskListView, smartStatus as getScheduleSmartStatus }

export default function ScheduleTab({ project }) {
  const { scheduleTasks } = useStore()
  const [view, setView] = useState('list')
  const tasks = useMemo(() => scheduleTasks.filter(t => t.projectId === project.id), [scheduleTasks, project.id])

  const tabs = [
    { key: 'list', label: 'Task List', Icon: List },
    { key: 'gantt', label: 'Gantt', Icon: BarChart2 },
    { key: 'calendar', label: 'Calendar', Icon: Calendar },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-5 border-b border-gray-200">
        {tabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`inline-flex items-center gap-1.5 border-b-2 px-1 pb-3 text-sm transition-colors ${view === key ? 'border-forest-600 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {view === 'list' && <TaskListView projectId={project.id} tasks={tasks} />}
      {view === 'gantt' && <GanttView tasks={tasks} />}
      {view === 'calendar' && <CalendarView tasks={tasks} />}
    </div>
  )
}
