import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Diamond,
  Flag,
  GripVertical,
  List,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import useStore from '../store/useStore'
import { STAGE_MAP } from '../data/stages'

const DAY_MS = 86_400_000
const INPUT_CLS = 'w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:border-ocean-500 focus:outline-none focus:ring-1 focus:ring-ocean-500'
const ICON_BTN_CLS = 'inline-flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700'

const STATUS_OPTIONS = [
  { value: 'not-started', label: 'Not started', dot: 'bg-gray-300', text: 'text-gray-500', bar: 'bg-gray-300' },
  { value: 'in-progress', label: 'In progress', dot: 'bg-ocean-500', text: 'text-ocean-700', bar: 'bg-ocean-500' },
  { value: 'complete', label: 'Complete', dot: 'bg-green-500', text: 'text-green-700', bar: 'bg-green-500' },
  { value: 'delayed', label: 'Delayed', dot: 'bg-red-500', text: 'text-red-700', bar: 'bg-red-500' },
  { value: 'blocked', label: 'Blocked', dot: 'bg-red-700', text: 'text-red-800', bar: 'bg-red-700' },
  { value: 'on-hold', label: 'On hold', dot: 'bg-amber-400', text: 'text-amber-700', bar: 'bg-amber-400' },
]

const STATUS_MAP = Object.fromEntries(STATUS_OPTIONS.map(s => [s.value, s]))
const EDITABLE_STATUS_OPTIONS = STATUS_OPTIONS.filter(s => s.value !== 'delayed')

function parseDate(value) {
  if (!value) return null
  if (value instanceof Date) return sod(value)
  const parts = String(value).split('-').map(Number)
  if (parts.length === 3 && parts.every(Boolean)) return new Date(parts[0], parts[1] - 1, parts[2])
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : sod(d)
}

function sod(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function diffDays(a, b) {
  const start = parseDate(a)
  const end = parseDate(b)
  if (!start || !end) return null
  return Math.round((end - start) / DAY_MS)
}

function addDays(value, days) {
  const d = parseDate(value)
  if (!d) return null
  return new Date(d.getTime() + Number(days) * DAY_MS)
}

function fmtInput(value) {
  const d = parseDate(value)
  if (!d) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtShort(value) {
  const d = parseDate(value)
  return d ? d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }) : '-'
}

function fmtFull(value) {
  const d = parseDate(value)
  return d ? d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
}

function calcDuration(start, end) {
  const days = diffDays(start, end)
  return days == null || days < 0 ? null : days + 1
}

function endFromDuration(start, durationDays) {
  const days = Number(durationDays)
  if (!start || !days || days < 1) return ''
  return fmtInput(addDays(start, days - 1))
}

function relativeDays(value) {
  const days = diffDays(new Date(), value)
  if (days == null) return ''
  if (days === 0) return 'today'
  return days > 0 ? `in ${days}d` : `${Math.abs(days)}d ago`
}

function getDisplayStatus(task) {
  if (task.status === 'complete') return 'complete'
  if (task.status === 'blocked') return 'blocked'
  if (task.status === 'on-hold') return 'on-hold'
  const end = parseDate(task.endDate)
  if (end && end < sod(new Date())) return 'delayed'
  if ((task.progress || 0) > 0) return 'in-progress'
  return task.status || 'not-started'
}

function progressFor(task) {
  if (task.status === 'complete') return 100
  return Math.max(0, Math.min(100, Number(task.progress || 0)))
}

function StatusDot({ status, className = '' }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP['not-started']
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${cfg.dot} ${className}`} />
}

function StatusLabel({ task }) {
  const status = getDisplayStatus(task)
  const cfg = STATUS_MAP[status] || STATUS_MAP['not-started']
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.text} bg-gray-50`}>
      <StatusDot status={status} />
      {cfg.label}
    </span>
  )
}

function BufferedInput({ value, onCommit, type = 'text', placeholder = '', className = '', min, max }) {
  const [draft, setDraft] = useState(value ?? '')
  const inputRef = useRef(null)

  useEffect(() => setDraft(value ?? ''), [value])

  const commit = () => {
    const next = type === 'number' ? draft : String(draft).trim()
    if (String(next) !== String(value ?? '')) onCommit(next)
  }

  return (
    <input
      ref={inputRef}
      type={type}
      min={min}
      max={max}
      className={`${INPUT_CLS} ${className}`}
      placeholder={placeholder}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault()
          inputRef.current?.blur()
        }
        if (e.key === 'Escape') {
          setDraft(value ?? '')
          inputRef.current?.blur()
        }
      }}
    />
  )
}

function BufferedTextarea({ value, onCommit, placeholder = '' }) {
  const [draft, setDraft] = useState(value ?? '')
  const ref = useRef(null)

  useEffect(() => setDraft(value ?? ''), [value])

  const commit = () => {
    const next = String(draft).trim()
    if (next !== String(value ?? '')) onCommit(next)
  }

  return (
    <textarea
      ref={ref}
      rows={3}
      className={`${INPUT_CLS} resize-none leading-relaxed`}
      placeholder={placeholder}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') ref.current?.blur()
        if (e.key === 'Escape') {
          setDraft(value ?? '')
          ref.current?.blur()
        }
      }}
    />
  )
}

function DateInput({ value, onChange }) {
  return (
    <input
      type="date"
      className={INPUT_CLS}
      value={fmtInput(value)}
      onChange={e => onChange(e.target.value)}
    />
  )
}

function EmptySchedule({ onAddPhase }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
      <CalendarDays size={28} className="mx-auto mb-3 text-gray-300" />
      <div className="mb-1 text-sm font-semibold text-gray-700">No programme tasks yet</div>
      <p className="mx-auto mb-5 max-w-md text-sm text-gray-400">
        Add phases for consent, procurement, construction, and handover, then build out the dated tasks.
      </p>
      <button
        onClick={onAddPhase}
        className="inline-flex items-center gap-2 rounded-lg bg-forest-600 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700"
      >
        <Plus size={14} />
        Add first phase
      </button>
    </div>
  )
}

function NewTaskRow({ phase, allTasks, teamMembers, onSave, onCancel }) {
  const nameRef = useRef(null)
  const [form, setForm] = useState({
    name: '',
    assignee: '',
    internalOwner: '',
    startDate: '',
    endDate: '',
    durationDays: '',
    dependencyId: '',
    lagDays: 0,
    isMilestone: false,
    notes: '',
  })

  useEffect(() => nameRef.current?.focus(), [])

  const set = (key, value) => setForm(f => {
    const next = { ...f, [key]: value }
    if (key === 'startDate' && next.durationDays) next.endDate = endFromDuration(value, next.durationDays)
    if (key === 'endDate') next.durationDays = calcDuration(next.startDate, value) ?? ''
    if (key === 'durationDays' && next.startDate) next.endDate = endFromDuration(next.startDate, value)
    return next
  })

  const save = () => {
    if (!form.name.trim()) {
      onCancel()
      return
    }
    onSave({
      ...form,
      phase,
      name: form.name.trim(),
      durationDays: form.durationDays === '' ? calcDuration(form.startDate, form.endDate) : Number(form.durationDays),
      lagDays: Number(form.lagDays || 0),
      progress: 0,
      status: 'not-started',
    })
  }

  return (
    <tr className="border-b border-ocean-100 bg-ocean-50/40">
      <td className="px-3 py-2" />
      <td className="px-2 py-2">
        <div className="space-y-2">
          <input
            ref={nameRef}
            className={INPUT_CLS}
            placeholder="Task name"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') save()
              if (e.key === 'Escape') onCancel()
            }}
          />
          <label className="inline-flex items-center gap-1.5 text-xs text-gray-500">
            <input
              type="checkbox"
              checked={form.isMilestone}
              onChange={e => set('isMilestone', e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-ocean-600 focus:ring-ocean-500"
            />
            Milestone
          </label>
        </div>
      </td>
      <td className="px-2 py-2">
        <div className="space-y-2">
          <select className={INPUT_CLS} value={form.assignee} onChange={e => set('assignee', e.target.value)}>
            <option value="">Contractor / assignee</option>
            {teamMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
          </select>
          <input className={INPUT_CLS} placeholder="Internal owner" value={form.internalOwner} onChange={e => set('internalOwner', e.target.value)} />
        </div>
      </td>
      <td className="px-2 py-2">
        <div className="grid grid-cols-[1fr_1fr_56px] gap-1.5">
          <DateInput value={form.startDate} onChange={v => set('startDate', v)} />
          <DateInput value={form.endDate} onChange={v => set('endDate', v)} />
          <input className={INPUT_CLS} type="number" min="0" placeholder="Days" value={form.durationDays} onChange={e => set('durationDays', e.target.value)} />
        </div>
      </td>
      <td className="px-2 py-2">
        <div className="grid grid-cols-[1fr_52px] gap-1.5">
          <select className={INPUT_CLS} value={form.dependencyId} onChange={e => set('dependencyId', e.target.value)}>
            <option value="">No dependency</option>
            {allTasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input className={INPUT_CLS} type="number" value={form.lagDays} onChange={e => set('lagDays', e.target.value)} title="Lag days" />
        </div>
      </td>
      <td className="px-2 py-2 text-xs text-gray-300">-</td>
      <td className="px-2 py-2 text-xs text-gray-400">Not started</td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-1">
          <button onClick={save} className="inline-flex h-7 w-7 items-center justify-center rounded text-green-600 hover:bg-green-50" title="Save task">
            <Check size={14} />
          </button>
          <button onClick={onCancel} className={ICON_BTN_CLS} title="Cancel">
            <X size={14} />
          </button>
        </div>
      </td>
    </tr>
  )
}

function PhaseHeader({ phaseName, items, collapsed, onToggle, onRename, onAddTask }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(phaseName)
  const done = items.filter(t => getDisplayStatus(t) === 'complete').length
  const delayed = items.filter(t => getDisplayStatus(t) === 'delayed').length
  const pct = items.length ? Math.round((done / items.length) * 100) : 0

  const commit = () => {
    setEditing(false)
    const next = draft.trim()
    if (next && next !== phaseName) onRename(phaseName, next)
    else setDraft(phaseName)
  }

  return (
    <tr className="border-y border-gray-200 bg-gray-50">
      <td className="px-3 py-2">
        <button onClick={() => onToggle(phaseName)} className="text-gray-400 hover:text-gray-600">
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
      </td>
      <td colSpan={6} className="px-2 py-2">
        <div className="flex flex-wrap items-center gap-2">
          {editing ? (
            <input
              autoFocus
              className="rounded border border-ocean-300 bg-white px-2 py-1 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-ocean-500"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={e => {
                if (e.key === 'Enter') commit()
                if (e.key === 'Escape') {
                  setDraft(phaseName)
                  setEditing(false)
                }
              }}
            />
          ) : (
            <button onClick={() => onToggle(phaseName)} className="text-xs font-bold uppercase tracking-wide text-gray-700">
              {phaseName}
            </button>
          )}
          <button onClick={() => setEditing(true)} className="text-gray-300 hover:text-gray-500" title="Rename phase">
            <Pencil size={11} />
          </button>
          <span className="text-xs text-gray-400">{items.length} tasks</span>
          <span className="text-xs text-green-600">{done} done</span>
          {delayed > 0 && <span className="text-xs font-medium text-red-600">{delayed} delayed</span>}
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-200">
            <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-gray-400">{pct}%</span>
        </div>
      </td>
      <td className="px-2 py-2 text-right">
        <button
          onClick={() => onAddTask(phaseName)}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-gray-500 hover:bg-white hover:text-forest-600"
        >
          <Plus size={11} />
          Add task
        </button>
      </td>
    </tr>
  )
}

function ScheduleTable({ project, tasks, milestones }) {
  const { addScheduleTask, updateScheduleTask, deleteScheduleTask, renamePhase, teamMembers, updateMilestone } = useStore()
  const [collapsed, setCollapsed] = useState({})
  const [expandedTask, setExpandedTask] = useState(null)
  const [addingPhase, setAddingPhase] = useState(null)
  const [addingNewPhase, setAddingNewPhase] = useState(false)
  const [newPhaseName, setNewPhaseName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [phaseFilter, setPhaseFilter] = useState('all')

  const phaseOptions = useMemo(() => {
    return [...new Set(tasks.map(t => t.phase || '(No phase)'))].sort((a, b) => a.localeCompare(b))
  }, [tasks])

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tasks.filter(task => {
      const displayStatus = getDisplayStatus(task)
      if (phaseFilter !== 'all' && (task.phase || '(No phase)') !== phaseFilter) return false
      if (statusFilter !== 'all' && displayStatus !== statusFilter) return false
      if (!q) return true
      return [
        task.name,
        task.phase,
        task.assignee,
        task.internalOwner,
        task.notes,
      ].some(value => String(value || '').toLowerCase().includes(q))
    })
  }, [tasks, search, statusFilter, phaseFilter])

  const phases = useMemo(() => {
    const map = new Map()
    filteredTasks
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
      .forEach(task => {
        const phase = task.phase || '(No phase)'
        if (!map.has(phase)) map.set(phase, [])
        map.get(phase).push(task)
      })
    return Array.from(map.entries()).map(([name, items]) => ({ name, items }))
  }, [filteredTasks])

  const stats = useMemo(() => {
    const total = tasks.length
    const complete = tasks.filter(t => getDisplayStatus(t) === 'complete').length
    const delayed = tasks.filter(t => getDisplayStatus(t) === 'delayed').length
    const blocked = tasks.filter(t => getDisplayStatus(t) === 'blocked').length
    const pct = total ? Math.round((complete / total) * 100) : 0
    return { total, complete, delayed, blocked, pct }
  }, [tasks])

  const projectMilestones = milestones.filter(m => m.projectId === project.id && m.date)

  const togglePhase = phase => setCollapsed(current => ({ ...current, [phase]: !current[phase] }))

  const handleRenamePhase = async (oldPhase, newPhase) => {
    await renamePhase(project.id, oldPhase, newPhase)
  }

  const handleAddTask = async data => {
    await addScheduleTask({ ...data, projectId: project.id })
    setAddingPhase(null)
    setAddingNewPhase(false)
    setNewPhaseName('')
  }

  const handleUpdate = (task, patch) => {
    const next = { ...patch }
    if (patch.startDate !== undefined) {
      if (task.durationDays) next.endDate = endFromDuration(patch.startDate, task.durationDays)
      else if (task.endDate) next.durationDays = calcDuration(patch.startDate, task.endDate)
    }
    if (patch.endDate !== undefined) next.durationDays = calcDuration(task.startDate, patch.endDate)
    if (patch.durationDays !== undefined) {
      const duration = Number(patch.durationDays || 0)
      next.durationDays = duration || null
      if (task.startDate && duration) next.endDate = endFromDuration(task.startDate, duration)
    }
    if (patch.progress !== undefined) {
      const progress = Math.max(0, Math.min(100, Number(patch.progress || 0)))
      next.progress = progress
      if (progress === 100) next.status = 'complete'
      if (progress > 0 && task.status === 'not-started') next.status = 'in-progress'
    }
    if (patch.status === 'complete') next.progress = 100
    if (patch.status === 'not-started') next.progress = 0
    updateScheduleTask(task.id, next)
  }

  const createNewPhase = () => {
    const phase = newPhaseName.trim()
    if (!phase) return
    setAddingPhase(phase)
    setAddingNewPhase(false)
  }

  if (tasks.length === 0 && !addingNewPhase && !addingPhase) {
    return <EmptySchedule onAddPhase={() => setAddingNewPhase(true)} />
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: 'Tasks', value: stats.total },
          { label: 'Complete', value: stats.complete, color: 'text-green-700' },
          { label: 'Delayed', value: stats.delayed, color: stats.delayed ? 'text-red-700' : 'text-gray-800' },
          { label: 'Blocked', value: stats.blocked, color: stats.blocked ? 'text-red-800' : 'text-gray-800' },
          { label: 'Done', value: `${stats.pct}%`, color: 'text-ocean-700' },
        ].map(item => (
          <div key={item.label} className="rounded-xl border border-gray-100 bg-white p-3">
            <div className="text-xs text-gray-400">{item.label}</div>
            <div className={`mt-1 text-xl font-bold ${item.color || 'text-gray-800'}`}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            className="w-60 rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm focus:border-ocean-500 focus:outline-none focus:ring-1 focus:ring-ocean-500"
            placeholder="Search programme"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-ocean-500" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-ocean-500" value={phaseFilter} onChange={e => setPhaseFilter(e.target.value)}>
          <option value="all">All phases</option>
          {phaseOptions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setCollapsed(Object.fromEntries(phases.map(p => [p.name, true])))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50"
          >
            Collapse all
          </button>
          <button
            onClick={() => setCollapsed({})}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50"
          >
            Expand all
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 1180 }}>
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase text-gray-400">
                <th className="w-9 px-3 py-2.5 font-medium" />
                <th className="w-[260px] px-2 py-2.5 font-medium">Task</th>
                <th className="w-[190px] px-2 py-2.5 font-medium">Responsible</th>
                <th className="w-[250px] px-2 py-2.5 font-medium">Planned</th>
                <th className="w-[210px] px-2 py-2.5 font-medium">Dependency</th>
                <th className="w-[180px] px-2 py-2.5 font-medium">Actual</th>
                <th className="w-[170px] px-2 py-2.5 font-medium">Status</th>
                <th className="w-12 px-2 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {phases.map(({ name: phaseName, items }) => (
                <Fragment key={phaseName}>
                  <PhaseHeader
                    phaseName={phaseName}
                    items={items}
                    collapsed={collapsed[phaseName]}
                    onToggle={togglePhase}
                    onRename={handleRenamePhase}
                    onAddTask={setAddingPhase}
                  />

                  {!collapsed[phaseName] && items.map(task => {
                    const displayStatus = getDisplayStatus(task)
                    const dependency = tasks.find(t => t.id === task.dependencyId)
                    const isExpanded = expandedTask === task.id
                    const duration = task.durationDays ?? calcDuration(task.startDate, task.endDate)
                    return (
                      <Fragment key={task.id}>
                        <tr className="group border-b border-gray-50 hover:bg-gray-50/70">
                          <td className="px-3 py-2 align-top">
                            <div className="flex items-center gap-1">
                              <button onClick={() => setExpandedTask(isExpanded ? null : task.id)} className="text-gray-300 hover:text-gray-600" title="Task details">
                                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                              </button>
                              <GripVertical size={12} className="text-gray-200" />
                            </div>
                          </td>
                          <td className="px-2 py-2 align-top">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                {task.isMilestone ? <Diamond size={12} className="shrink-0 fill-amber-400 text-amber-500" /> : <StatusDot status={displayStatus} />}
                                <BufferedInput
                                  value={task.name}
                                  onCommit={value => updateScheduleTask(task.id, { name: value })}
                                  placeholder="Task name"
                                  className={`font-medium ${task.status === 'complete' ? 'text-gray-400 line-through' : 'text-gray-800'}`}
                                />
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-400">
                                <label className="inline-flex items-center gap-1.5">
                                  <input
                                    type="checkbox"
                                    checked={!!task.isMilestone}
                                    onChange={e => updateScheduleTask(task.id, { isMilestone: e.target.checked })}
                                    className="h-3.5 w-3.5 rounded border-gray-300 text-ocean-600 focus:ring-ocean-500"
                                  />
                                  Milestone
                                </label>
                                {task.notes && <span>Has notes</span>}
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-2 align-top">
                            <div className="space-y-2">
                              <select className={INPUT_CLS} value={task.assignee || ''} onChange={e => updateScheduleTask(task.id, { assignee: e.target.value })}>
                                <option value="">Contractor / assignee</option>
                                {teamMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                              </select>
                              <BufferedInput
                                value={task.internalOwner || ''}
                                onCommit={value => updateScheduleTask(task.id, { internalOwner: value })}
                                placeholder="Internal owner"
                              />
                            </div>
                          </td>
                          <td className="px-2 py-2 align-top">
                            <div className="grid grid-cols-[1fr_1fr_56px] gap-1.5">
                              <DateInput value={task.startDate} onChange={value => handleUpdate(task, { startDate: value })} />
                              <DateInput value={task.endDate} onChange={value => handleUpdate(task, { endDate: value })} />
                              <BufferedInput
                                type="number"
                                min="0"
                                value={duration ?? ''}
                                onCommit={value => handleUpdate(task, { durationDays: value })}
                                placeholder="Days"
                              />
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400">
                              <Clock3 size={11} />
                              <span>{task.startDate || task.endDate ? `${fmtShort(task.startDate)} to ${fmtShort(task.endDate)}` : 'No planned dates'}</span>
                            </div>
                          </td>
                          <td className="px-2 py-2 align-top">
                            <div className="grid grid-cols-[1fr_52px] gap-1.5">
                              <select className={INPUT_CLS} value={task.dependencyId || ''} onChange={e => updateScheduleTask(task.id, { dependencyId: e.target.value })}>
                                <option value="">No dependency</option>
                                {tasks.filter(t => t.id !== task.id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                              <BufferedInput
                                type="number"
                                value={task.lagDays ?? 0}
                                onCommit={value => updateScheduleTask(task.id, { lagDays: Number(value || 0) })}
                                placeholder="Lag"
                              />
                            </div>
                            <div className="mt-1 truncate text-[11px] text-gray-400" title={dependency?.name || ''}>
                              {dependency ? `After: ${dependency.name}` : 'Lag in days'}
                            </div>
                          </td>
                          <td className="px-2 py-2 align-top">
                            <div className="grid grid-cols-2 gap-1.5">
                              <DateInput value={task.actualStart} onChange={value => updateScheduleTask(task.id, { actualStart: value })} />
                              <DateInput value={task.actualEnd} onChange={value => updateScheduleTask(task.id, { actualEnd: value })} />
                            </div>
                            <div className="mt-1 text-[11px] text-gray-400">
                              {task.actualEnd ? `Finished ${relativeDays(task.actualEnd)}` : 'Actual dates'}
                            </div>
                          </td>
                          <td className="px-2 py-2 align-top">
                            <div className="space-y-2">
                              <select className={INPUT_CLS} value={task.status || 'not-started'} onChange={e => handleUpdate(task, { status: e.target.value })}>
                                {EDITABLE_STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                              </select>
                              <div className="grid grid-cols-[1fr_56px] items-center gap-2">
                                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                  <div className={`${(STATUS_MAP[displayStatus] || STATUS_MAP['not-started']).bar} h-full rounded-full`} style={{ width: `${progressFor(task)}%` }} />
                                </div>
                                <BufferedInput
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={progressFor(task)}
                                  onCommit={value => handleUpdate(task, { progress: value })}
                                  className="text-right"
                                />
                              </div>
                              <StatusLabel task={task} />
                            </div>
                          </td>
                          <td className="px-2 py-2 align-top">
                            {confirmDelete === task.id ? (
                              <div className="flex flex-col items-end gap-1">
                                <button onClick={() => { deleteScheduleTask(task.id); setConfirmDelete(null) }} className="rounded px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Delete</button>
                                <button onClick={() => setConfirmDelete(null)} className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-100">Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmDelete(task.id)} className="inline-flex h-7 w-7 items-center justify-center rounded text-gray-300 hover:bg-red-50 hover:text-red-500" title="Delete task">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="border-b border-gray-50 bg-gray-50/40">
                            <td />
                            <td colSpan={7} className="px-2 py-3">
                              <div className="grid gap-3 md:grid-cols-[1fr_260px]">
                                <div>
                                  <div className="mb-1 text-xs font-medium text-gray-500">Notes</div>
                                  <BufferedTextarea
                                    value={task.notes || ''}
                                    onCommit={value => updateScheduleTask(task.id, { notes: value })}
                                    placeholder="RFIs, access constraints, procurement notes, inspection comments..."
                                  />
                                </div>
                                <div className="rounded-lg border border-gray-100 bg-white p-3 text-xs text-gray-500">
                                  <div className="mb-2 font-semibold text-gray-700">Task snapshot</div>
                                  <div className="space-y-1">
                                    <div>Phase: <span className="text-gray-800">{task.phase || '-'}</span></div>
                                    <div>Planned finish: <span className="text-gray-800">{fmtFull(task.endDate)}</span></div>
                                    <div>Dependency: <span className="text-gray-800">{dependency?.name || '-'}</span></div>
                                    <div>Status: <span className={(STATUS_MAP[displayStatus] || STATUS_MAP['not-started']).text}>{(STATUS_MAP[displayStatus] || STATUS_MAP['not-started']).label}</span></div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}

                  {!collapsed[phaseName] && addingPhase === phaseName && (
                    <NewTaskRow
                      phase={phaseName}
                      allTasks={tasks}
                      teamMembers={teamMembers}
                      onSave={handleAddTask}
                      onCancel={() => setAddingPhase(null)}
                    />
                  )}

                  {!collapsed[phaseName] && addingPhase !== phaseName && (
                    <tr className="border-b border-gray-50">
                      <td />
                      <td colSpan={7} className="px-2 py-2">
                        <button onClick={() => setAddingPhase(phaseName)} className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-forest-600">
                          <Plus size={12} />
                          Add task
                        </button>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}

              {addingNewPhase && (
                <tr className="border-t-2 border-forest-200 bg-forest-50/40">
                  <td />
                  <td colSpan={7} className="px-2 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        autoFocus
                        className="w-64 rounded border border-forest-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-forest-600"
                        placeholder="Phase name"
                        value={newPhaseName}
                        onChange={e => setNewPhaseName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') createNewPhase()
                          if (e.key === 'Escape') {
                            setAddingNewPhase(false)
                            setNewPhaseName('')
                          }
                        }}
                      />
                      <button disabled={!newPhaseName.trim()} onClick={createNewPhase} className="rounded-lg bg-forest-600 px-3 py-2 text-sm font-medium text-white hover:bg-forest-700 disabled:opacity-40">
                        Create phase
                      </button>
                      <button onClick={() => { setAddingNewPhase(false); setNewPhaseName('') }} className="px-2 py-2 text-sm text-gray-500 hover:text-gray-700">
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {addingPhase && !phases.some(p => p.name === addingPhase) && (
                <Fragment>
                  <PhaseHeader
                    phaseName={addingPhase}
                    items={[]}
                    collapsed={false}
                    onToggle={() => {}}
                    onRename={() => {}}
                    onAddTask={setAddingPhase}
                  />
                  <NewTaskRow
                    phase={addingPhase}
                    allTasks={tasks}
                    teamMembers={teamMembers}
                    onSave={handleAddTask}
                    onCancel={() => { setAddingPhase(null); setNewPhaseName('') }}
                  />
                </Fragment>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setAddingNewPhase(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-500 hover:border-forest-500 hover:text-forest-600"
        >
          <Plus size={14} />
          Add phase
        </button>
        {projectMilestones.length > 0 && (
          <div className="text-xs text-gray-400">
            {projectMilestones.length} dated project milestone{projectMilestones.length !== 1 ? 's' : ''} also appear on the Gantt.
          </div>
        )}
      </div>
    </div>
  )
}

const GANTT_LEFT = 240
const ROW_H = 34

function GanttView({ project, tasks, milestones }) {
  const [zoom, setZoom] = useState('weeks')
  const dayPx = zoom === 'days' ? 22 : zoom === 'weeks' ? 9 : 4
  const datedTasks = tasks.filter(t => t.startDate || t.endDate)
  const milestoneRows = milestones.filter(m => m.date)
  const today = sod(new Date())

  const allDates = [
    project.startDate,
    project.targetCompletion,
    ...datedTasks.flatMap(t => [t.startDate, t.endDate]),
    ...milestoneRows.map(m => m.date),
    today,
  ].map(parseDate).filter(Boolean)

  const timeline = useMemo(() => {
    if (allDates.length === 0) {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 2, 0)
      return { start, end }
    }
    const min = new Date(Math.min(...allDates.map(d => d.getTime())))
    const max = new Date(Math.max(...allDates.map(d => d.getTime())))
    return {
      start: new Date(min.getFullYear(), min.getMonth(), 1),
      end: new Date(max.getFullYear(), max.getMonth() + 2, 0),
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, milestones, project.startDate, project.targetCompletion])

  const totalDays = Math.max(1, diffDays(timeline.start, timeline.end) + 1)
  const totalW = totalDays * dayPx
  const xFor = value => Math.max(0, (diffDays(timeline.start, value) || 0) * dayPx)
  const todayX = xFor(today)
  const todayInView = todayX >= 0 && todayX <= totalW

  const monthSegments = useMemo(() => {
    const segments = []
    let cursor = new Date(timeline.start.getFullYear(), timeline.start.getMonth(), 1)
    while (cursor <= timeline.end) {
      const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
      segments.push({
        key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
        label: cursor.toLocaleDateString('en-NZ', { month: 'short', year: '2-digit' }),
        x: xFor(cursor),
        w: (diffDays(cursor, end) + 1) * dayPx,
      })
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    }
    return segments
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline.start.getTime(), timeline.end.getTime(), dayPx])

  const weekTicks = useMemo(() => {
    if (zoom === 'months') return []
    const ticks = []
    let cursor = new Date(timeline.start)
    while (cursor.getDay() !== 1) cursor = addDays(cursor, 1)
    while (cursor <= timeline.end) {
      ticks.push(xFor(cursor))
      cursor = addDays(cursor, 7)
    }
    return ticks
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline.start.getTime(), timeline.end.getTime(), zoom, dayPx])

  const phases = useMemo(() => {
    const map = new Map()
    datedTasks
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
      .forEach(task => {
        const phase = task.phase || '(No phase)'
        if (!map.has(phase)) map.set(phase, [])
        map.get(phase).push(task)
      })
    return Array.from(map.entries())
  }, [datedTasks])

  if (datedTasks.length === 0 && milestoneRows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center text-sm text-gray-400">
        Add planned dates in the Table view to see the Gantt.
      </div>
    )
  }

  const GridLines = () => (
    <>
      {weekTicks.map((x, i) => <div key={`w-${i}`} className="absolute top-0 h-full border-l border-gray-100" style={{ left: x }} />)}
      {monthSegments.map(s => <div key={s.key} className="absolute top-0 h-full border-l border-gray-200/80" style={{ left: s.x }} />)}
      {todayInView && <div className="absolute top-0 z-10 h-full border-l-2 border-ocean-500/50" style={{ left: todayX }} />}
    </>
  )

  const renderTaskBar = task => {
    const displayStatus = getDisplayStatus(task)
    const cfg = STATUS_MAP[displayStatus] || STATUS_MAP['not-started']
    const start = parseDate(task.startDate || task.endDate)
    const end = parseDate(task.endDate || task.startDate)
    if (!start || !end) return null
    const x = xFor(start)
    const w = Math.max(task.isMilestone ? 0 : dayPx * 2, (diffDays(start, end) + 1) * dayPx)

    if (task.isMilestone) {
      return (
        <div
          className={`${cfg.bar} absolute top-1/2 h-3.5 w-3.5 rounded-sm`}
          style={{ left: xFor(end), transform: 'translate(-50%, -50%) rotate(45deg)' }}
          title={`${task.name}: ${fmtFull(end)}`}
        />
      )
    }

    return (
      <div
        className={`${cfg.bar} absolute top-1/2 overflow-hidden rounded opacity-85 hover:opacity-100`}
        style={{ left: x, width: w, height: 16, transform: 'translateY(-50%)' }}
        title={`${task.name}\n${fmtFull(start)} to ${fmtFull(end)}\n${cfg.label}`}
      >
        {progressFor(task) > 0 && progressFor(task) < 100 && (
          <div className="h-full bg-white/30" style={{ width: `${progressFor(task)}%` }} />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
          {[
            ['bg-gray-300', 'Not started'],
            ['bg-ocean-500', 'In progress'],
            ['bg-green-500', 'Complete'],
            ['bg-red-500', 'Delayed'],
            ['bg-amber-400', 'On hold'],
          ].map(([bg, label]) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-5 rounded ${bg}`} />
              {label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rotate-45 rounded-sm bg-amber-400" />
            Milestone
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
          {[
            ['days', 'Days'],
            ['weeks', 'Weeks'],
            ['months', 'Months'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setZoom(key)}
              className={`rounded-md px-3 py-1 text-xs font-medium ${zoom === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        <div className="overflow-x-auto">
          <div style={{ minWidth: GANTT_LEFT + totalW, width: GANTT_LEFT + totalW }}>
            <div className="flex border-b border-gray-200" style={{ height: 38 }}>
              <div className="sticky left-0 z-20 flex shrink-0 items-center border-r border-gray-100 bg-gray-50 px-4" style={{ width: GANTT_LEFT }}>
                <span className="text-xs font-medium text-gray-500">Task</span>
              </div>
              <div className="relative shrink-0 bg-gray-50" style={{ width: totalW }}>
                {monthSegments.map(segment => (
                  <div key={segment.key} className="absolute top-0 flex h-full items-center border-r border-gray-200 px-2" style={{ left: segment.x, width: segment.w }}>
                    <span className="whitespace-nowrap text-xs font-semibold text-gray-500">{segment.label}</span>
                  </div>
                ))}
                {todayInView && <div className="absolute top-2 z-20 text-[10px] font-bold text-ocean-700" style={{ left: todayX + 5 }}>Today</div>}
              </div>
            </div>

            {phases.map(([phaseName, phaseTasks]) => (
              <div key={phaseName}>
                <div className="flex border-b border-gray-100 bg-gray-50" style={{ height: 28 }}>
                  <div className="sticky left-0 z-10 flex shrink-0 items-center border-r border-gray-100 bg-gray-50 px-4" style={{ width: GANTT_LEFT }}>
                    <span className="truncate text-[11px] font-bold uppercase text-gray-500">{phaseName}</span>
                  </div>
                  <div className="relative shrink-0" style={{ width: totalW }}><GridLines /></div>
                </div>
                {phaseTasks.map(task => {
                  const displayStatus = getDisplayStatus(task)
                  return (
                    <div key={task.id} className="flex border-b border-gray-50 hover:bg-gray-50/60" style={{ height: ROW_H }}>
                      <div className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-gray-100 bg-white px-4" style={{ width: GANTT_LEFT }}>
                        {task.isMilestone ? <Diamond size={11} className="shrink-0 fill-amber-400 text-amber-500" /> : <StatusDot status={displayStatus} />}
                        <span className={`truncate text-xs ${task.status === 'complete' ? 'text-gray-400 line-through' : 'text-gray-700'}`} title={task.name}>{task.name}</span>
                      </div>
                      <div className="relative shrink-0" style={{ width: totalW }}>
                        <GridLines />
                        {renderTaskBar(task)}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}

            {milestoneRows.length > 0 && (
              <div>
                <div className="flex border-b border-gray-100 bg-amber-50" style={{ height: 28 }}>
                  <div className="sticky left-0 z-10 flex shrink-0 items-center border-r border-amber-100 bg-amber-50 px-4" style={{ width: GANTT_LEFT }}>
                    <span className="text-[11px] font-bold uppercase text-amber-700">Project milestones</span>
                  </div>
                  <div className="relative shrink-0" style={{ width: totalW }}><GridLines /></div>
                </div>
                {milestoneRows.map(ms => (
                  <div key={ms.id} className="flex border-b border-gray-50" style={{ height: ROW_H }}>
                    <div className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-gray-100 bg-white px-4" style={{ width: GANTT_LEFT }}>
                      <Diamond size={11} className={`shrink-0 ${ms.complete ? 'fill-green-500 text-green-500' : 'fill-amber-500 text-amber-500'}`} />
                      <span className={`truncate text-xs ${ms.complete ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{ms.label}</span>
                    </div>
                    <div className="relative shrink-0" style={{ width: totalW }}>
                      <GridLines />
                      <div
                        className={`${ms.complete ? 'bg-green-500' : 'bg-amber-500'} absolute top-1/2 h-3.5 w-3.5 rounded-sm`}
                        style={{ left: xFor(ms.date), transform: 'translate(-50%, -50%) rotate(45deg)' }}
                        title={`${ms.label}: ${fmtFull(ms.date)}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(project.startDate || project.targetCompletion) && (
              <div className="flex border-t border-gray-100 bg-gray-50" style={{ height: 28 }}>
                <div className="sticky left-0 z-10 flex shrink-0 items-center border-r border-gray-100 bg-gray-50 px-4" style={{ width: GANTT_LEFT }}>
                  <span className="text-[11px] font-medium text-gray-500">Project span</span>
                </div>
                <div className="relative shrink-0" style={{ width: totalW }}>
                  {project.startDate && <div className="absolute top-0 h-full border-l-2 border-forest-600/50" style={{ left: xFor(project.startDate) }} />}
                  {project.targetCompletion && <div className="absolute top-0 h-full border-l-2 border-forest-600/50" style={{ left: xFor(project.targetCompletion) }} />}
                  {project.startDate && project.targetCompletion && (
                    <div
                      className="absolute top-1/2 h-1 -translate-y-1/2 rounded bg-forest-600/20"
                      style={{ left: xFor(project.startDate), width: Math.max(0, xFor(project.targetCompletion) - xFor(project.startDate)) }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MilestonesView({ project, tasks, milestones }) {
  const { updateScheduleTask, updateMilestone, addMilestone, deleteMilestone } = useStore()
  const [showAdd, setShowAdd] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [form, setForm] = useState({ label: '', date: '', stageId: '' })

  const programmeMilestones = tasks.filter(t => t.isMilestone)
  const sortedMilestones = useMemo(() => milestones.slice().sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return parseDate(a.date) - parseDate(b.date)
  }), [milestones])

  const addProjectMilestone = async () => {
    if (!form.label.trim()) return
    await addMilestone({ projectId: project.id, label: form.label.trim(), date: form.date, stageId: form.stageId })
    setForm({ label: '', date: '', stageId: '' })
    setShowAdd(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-gray-500">
          {programmeMilestones.length} programme milestone{programmeMilestones.length !== 1 ? 's' : ''} and {milestones.length} project milestone{milestones.length !== 1 ? 's' : ''}
        </div>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 rounded-lg bg-forest-600 px-3 py-2 text-sm font-medium text-white hover:bg-forest-700">
          <Plus size={14} />
          Add milestone
        </button>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 text-sm font-semibold text-gray-800">New project milestone</div>
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <input
              autoFocus
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ocean-500"
              placeholder="Milestone name"
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addProjectMilestone()}
            />
            <input
              type="date"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ocean-500"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />
            <select
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ocean-500"
              value={form.stageId}
              onChange={e => setForm(f => ({ ...f, stageId: e.target.value }))}
            >
              <option value="">No stage</option>
              {Object.entries(STAGE_MAP).map(([id, stage]) => <option key={id} value={id}>{stage.label}</option>)}
            </select>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={addProjectMilestone} disabled={!form.label.trim()} className="rounded-lg bg-forest-600 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 disabled:opacity-40">
              Add
            </button>
            <button onClick={() => { setShowAdd(false); setForm({ label: '', date: '', stageId: '' }) }} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {programmeMilestones.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Programme milestones</div>
          <div className="space-y-2">
            {programmeMilestones.map(task => {
              const displayStatus = getDisplayStatus(task)
              return (
                <div key={task.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3">
                  <Diamond size={15} className={`shrink-0 ${(STATUS_MAP[displayStatus] || STATUS_MAP['not-started']).text}`} />
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-sm font-medium ${task.status === 'complete' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{task.name}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                      <span>{task.phase || 'No phase'}</span>
                      <span>{fmtFull(task.endDate || task.startDate)}</span>
                      <StatusLabel task={task} />
                    </div>
                  </div>
                  <button
                    onClick={() => updateScheduleTask(task.id, { status: task.status === 'complete' ? 'not-started' : 'complete', progress: task.status === 'complete' ? 0 : 100 })}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full border-2 ${task.status === 'complete' ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 text-gray-300 hover:border-green-400 hover:bg-green-50'}`}
                    title="Toggle complete"
                  >
                    {task.status === 'complete' && <Check size={13} />}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Project milestones</div>
        {sortedMilestones.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-10 text-center text-sm text-gray-400">
            No project milestones yet.
          </div>
        ) : (
          <div className="space-y-2">
            {sortedMilestones.map(ms => {
              const stage = ms.stageId ? STAGE_MAP[ms.stageId] : null
              const overdue = ms.date && !ms.complete && parseDate(ms.date) < sod(new Date())
              return (
                <div key={ms.id} className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3 ${overdue ? 'border-red-100' : 'border-gray-100'}`}>
                  <Diamond size={15} className={`shrink-0 ${ms.complete ? 'fill-green-500 text-green-500' : overdue ? 'fill-red-500 text-red-500' : 'fill-amber-500 text-amber-500'}`} />
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-sm font-medium ${ms.complete ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{ms.label}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                      {stage && <span className={`rounded-full px-2 py-0.5 font-medium ${stage.light} ${stage.text}`}>{stage.short}</span>}
                      <span className={overdue ? 'font-medium text-red-600' : ''}>{fmtFull(ms.date)}</span>
                      {ms.date && !ms.complete && <span>{relativeDays(ms.date)}</span>}
                    </div>
                  </div>
                  <input
                    type="date"
                    className="w-36 rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-ocean-500"
                    value={fmtInput(ms.date)}
                    onChange={e => updateMilestone(ms.id, { date: e.target.value })}
                  />
                  {confirmDelete === ms.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => { deleteMilestone(ms.id); setConfirmDelete(null) }} className="rounded px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Delete</button>
                      <button onClick={() => setConfirmDelete(null)} className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-100">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(ms.id)} className="inline-flex h-7 w-7 items-center justify-center rounded text-gray-300 hover:bg-red-50 hover:text-red-500" title="Delete milestone">
                      <Trash2 size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => updateMilestone(ms.id, { complete: !ms.complete })}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full border-2 ${ms.complete ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 text-gray-300 hover:border-green-400 hover:bg-green-50'}`}
                    title="Toggle complete"
                  >
                    {ms.complete && <Check size={13} />}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ScheduleTab({ project }) {
  const { scheduleTasks, milestones } = useStore()
  const [view, setView] = useState('table')

  const tasks = useMemo(() => scheduleTasks.filter(t => t.projectId === project.id), [scheduleTasks, project.id])
  const projectMilestones = useMemo(() => milestones.filter(m => m.projectId === project.id), [milestones, project.id])

  const stats = useMemo(() => {
    const total = tasks.length
    const complete = tasks.filter(t => getDisplayStatus(t) === 'complete').length
    const delayed = tasks.filter(t => getDisplayStatus(t) === 'delayed').length
    const milestonesCount = projectMilestones.length + tasks.filter(t => t.isMilestone).length
    return { total, complete, delayed, milestonesCount }
  }, [tasks, projectMilestones])

  const tabs = [
    { id: 'table', icon: List, label: 'Table' },
    { id: 'gantt', icon: BarChart2, label: 'Gantt' },
    { id: 'milestones', icon: Flag, label: `Milestones${stats.milestonesCount ? ` (${stats.milestonesCount})` : ''}` },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
          {tabs.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${view === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
          <span>{stats.total} programme tasks</span>
          {stats.complete > 0 && <span className="font-medium text-green-700">{stats.complete} complete</span>}
          {stats.delayed > 0 && <span className="font-medium text-red-700">{stats.delayed} delayed</span>}
        </div>
      </div>

      {view === 'table' && <ScheduleTable project={project} tasks={tasks} milestones={projectMilestones} />}
      {view === 'gantt' && <GanttView project={project} tasks={tasks} milestones={projectMilestones} />}
      {view === 'milestones' && <MilestonesView project={project} tasks={tasks} milestones={projectMilestones} />}
    </div>
  )
}
