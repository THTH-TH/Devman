import { useState, useMemo, useRef, useEffect, Fragment } from 'react'
import { List, BarChart2, Flag, Plus, Trash2, ChevronDown, ChevronRight, Pencil, Check, X } from 'lucide-react'
import useStore from '../store/useStore'
import { STAGE_MAP } from '../data/stages'

// ── Date helpers ───────────────────────────────────────────────────────────────
const DAY_MS = 86_400_000

function sod(d) { const r = new Date(d); r.setHours(0, 0, 0, 0); return r }
function diffDays(a, b) { return Math.round((sod(b) - sod(a)) / DAY_MS) }
function addDays(d, n) { return new Date(d.getTime() + n * DAY_MS) }
function fmtShort(d) { return new Date(d).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }) }
function fmtDisplay(s) { return s ? fmtShort(s) : '—' }
function fmtInput(d) {
  if (!d) return ''
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}
function relativeDays(s) {
  if (!s) return null
  const d = diffDays(new Date(), new Date(s))
  if (d === 0) return 'today'
  return d > 0 ? `in ${d}d` : `${Math.abs(d)}d ago`
}
function calcDuration(start, end) {
  if (!start || !end) return null
  const d = diffDays(new Date(start), new Date(end))
  return d > 0 ? d : null
}
function endFromStartDuration(start, days) {
  if (!start || !days) return ''
  return fmtInput(addDays(new Date(start), Number(days)))
}

// ── Status config ──────────────────────────────────────────────────────────────
const STATUSES = [
  { value: 'not-started', label: 'Not started', dot: 'bg-gray-300', text: 'text-gray-500' },
  { value: 'in-progress', label: 'In progress', dot: 'bg-ocean-500', text: 'text-ocean-600' },
  { value: 'complete',    label: 'Complete',    dot: 'bg-green-500', text: 'text-green-600' },
  { value: 'on-hold',     label: 'On hold',     dot: 'bg-amber-400', text: 'text-amber-600' },
  { value: 'blocked',     label: 'Blocked',     dot: 'bg-red-500',   text: 'text-red-600'   },
]
const STATUS_MAP = Object.fromEntries(STATUSES.map(s => [s.value, s]))

function StatusDot({ status, size = 'w-2 h-2' }) {
  const s = STATUS_MAP[status] || STATUSES[0]
  return <span className={`inline-block rounded-full shrink-0 ${size} ${s.dot}`} />
}

// ── Editable cell ──────────────────────────────────────────────────────────────
function Cell({ value, onChange, type = 'text', options, placeholder = '', className = '', align = 'left' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const inputRef = useRef(null)

  useEffect(() => { if (!editing) setDraft(value ?? '') }, [value, editing])
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus() }, [editing])

  const commit = () => {
    setEditing(false)
    const v = String(draft).trim()
    if (v !== String(value ?? '').trim()) onChange(v)
  }

  const inputCls = 'w-full bg-white border border-ocean-400 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ocean-500 focus:border-ocean-500'

  if (editing) {
    if (type === 'select') {
      return (
        <select
          ref={inputRef}
          autoFocus
          className={`${inputCls} cursor-pointer`}
          value={draft}
          onChange={e => { onChange(e.target.value); setEditing(false) }}
          onBlur={() => setEditing(false)}
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )
    }
    return (
      <input
        ref={inputRef}
        type={type}
        className={inputCls}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') { setEditing(false); setDraft(value ?? '') }
        }}
      />
    )
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className={`cursor-pointer rounded px-1.5 py-0.5 hover:bg-gray-100 text-xs min-h-[22px] ${align === 'right' ? 'text-right' : ''} ${className}`}
      title="Click to edit"
    >
      {value
        ? <span>{value}</span>
        : <span className="text-gray-300">{placeholder}</span>
      }
    </div>
  )
}

// ── New task row ───────────────────────────────────────────────────────────────
function NewTaskRow({ phase, teamMembers, onSave, onCancel }) {
  const [name, setName] = useState('')
  const [assignee, setAssignee] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const nameRef = useRef(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  const handleSave = () => {
    if (!name.trim()) return onCancel()
    const dur = calcDuration(start, end)
    onSave({ name: name.trim(), phase, assignee, startDate: start, endDate: end, durationDays: dur })
  }

  const inputCls = 'w-full bg-white border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ocean-500'

  return (
    <tr className="bg-ocean-50/40 border-b border-ocean-100">
      <td className="px-3 py-2 w-8" />
      <td className="px-2 py-1.5">
        <input
          ref={nameRef}
          className={inputCls}
          placeholder="Task name…"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel() }}
        />
      </td>
      <td className="px-2 py-1.5">
        <select className={inputCls} value={assignee} onChange={e => setAssignee(e.target.value)}>
          <option value="">—</option>
          {teamMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
        </select>
      </td>
      <td className="px-2 py-1.5">
        <input type="date" className={inputCls} value={start} onChange={e => setStart(e.target.value)} />
      </td>
      <td className="px-2 py-1.5">
        <input type="date" className={inputCls} value={end} onChange={e => setEnd(e.target.value)} />
      </td>
      <td className="px-2 py-1.5 text-xs text-gray-400 text-center">
        {calcDuration(start, end) ?? '—'}
      </td>
      <td className="px-2 py-1.5 text-xs text-gray-400 text-center">0%</td>
      <td className="px-2 py-1.5 text-xs text-gray-400">—</td>
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-1">
          <button onClick={handleSave} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Save (Enter)">
            <Check size={13} />
          </button>
          <button onClick={onCancel} className="p-1 text-gray-400 hover:bg-gray-100 rounded" title="Cancel (Esc)">
            <X size={13} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── Schedule Table (main editing view) ─────────────────────────────────────────
function ScheduleTable({ project, tasks, milestones }) {
  const { addScheduleTask, updateScheduleTask, deleteScheduleTask, renamePhase, teamMembers, updateMilestone } = useStore()
  const [collapsed, setCollapsed] = useState({})
  const [addingPhase, setAddingPhase] = useState(null) // phase name where we're adding
  const [editingPhase, setEditingPhase] = useState(null) // { old, draft }
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [newPhaseName, setNewPhaseName] = useState('')
  const [addingNewPhase, setAddingNewPhase] = useState(false)

  // Group tasks by phase, ordered by sort_order
  const phases = useMemo(() => {
    const phaseMap = new Map()
    const sorted = [...tasks].sort((a, b) => a.sortOrder - b.sortOrder)
    sorted.forEach(t => {
      const p = t.phase || '(No phase)'
      if (!phaseMap.has(p)) phaseMap.set(p, [])
      phaseMap.get(p).push(t)
    })
    // Milestones also need to show somewhere
    return Array.from(phaseMap.entries()).map(([name, items]) => ({ name, items }))
  }, [tasks])

  const toggle = p => setCollapsed(c => ({ ...c, [p]: !c[p] }))

  const handleUpdate = (id, field, value, task) => {
    const data = { [field]: value }
    // Smart duration calculation
    if (field === 'startDate') {
      if (task.durationDays) data.endDate = endFromStartDuration(value, task.durationDays)
      else if (task.endDate) data.durationDays = calcDuration(value, task.endDate)
    } else if (field === 'endDate') {
      data.durationDays = calcDuration(task.startDate, value)
    } else if (field === 'durationDays') {
      const days = parseInt(value) || null
      data.durationDays = days
      if (task.startDate && days) data.endDate = endFromStartDuration(task.startDate, days)
    } else if (field === 'progress') {
      data.progress = Math.max(0, Math.min(100, parseInt(value) || 0))
      if (data.progress === 100) data.status = 'complete'
      else if (data.progress > 0 && task.status === 'not-started') data.status = 'in-progress'
    }
    updateScheduleTask(id, data)
  }

  const handleAddTask = async (phaseData) => {
    await addScheduleTask({ ...phaseData, projectId: project.id })
    setAddingPhase(null)
    setAddingNewPhase(false)
    setNewPhaseName('')
  }

  const handleRenamePhase = async () => {
    if (!editingPhase || !editingPhase.draft.trim()) { setEditingPhase(null); return }
    await renamePhase(project.id, editingPhase.old, editingPhase.draft.trim())
    setEditingPhase(null)
  }

  const projectMs = milestones.filter(m => m.projectId === project.id && m.date)

  if (tasks.length === 0 && !addingNewPhase) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
        <div className="text-4xl mb-3">📋</div>
        <p className="text-sm font-medium text-gray-600 mb-1">No schedule yet</p>
        <p className="text-xs text-gray-400 mb-5">Build your project programme — add phases and tasks with dates and assignments.</p>
        <button
          onClick={() => setAddingNewPhase(true)}
          className="inline-flex items-center gap-2 bg-forest-600 hover:bg-forest-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={14} />
          Add first phase
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 700 }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                <th className="w-8 px-3 py-2.5" />
                <th className="text-left px-2 py-2.5 font-medium">Task name</th>
                <th className="text-left px-2 py-2.5 font-medium w-28">Assignee</th>
                <th className="text-left px-2 py-2.5 font-medium w-24">Start</th>
                <th className="text-left px-2 py-2.5 font-medium w-24">Finish</th>
                <th className="text-center px-2 py-2.5 font-medium w-14">Days</th>
                <th className="text-center px-2 py-2.5 font-medium w-14">%</th>
                <th className="text-left px-2 py-2.5 font-medium w-28">Status</th>
                <th className="w-8 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {phases.map(({ name: phaseName, items }) => (
                <Fragment key={phaseName}>
                  {/* Phase header */}
                  <tr className="bg-gray-50 border-t border-b border-gray-200 select-none">
                    <td className="px-3 py-2 cursor-pointer" onClick={() => toggle(phaseName)}>
                      {collapsed[phaseName]
                        ? <ChevronRight size={13} className="text-gray-400" />
                        : <ChevronDown size={13} className="text-gray-400" />}
                    </td>
                    <td colSpan={7} className="px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        {editingPhase?.old === phaseName ? (
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              className="text-xs font-semibold border border-ocean-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-ocean-500"
                              value={editingPhase.draft}
                              onChange={e => setEditingPhase(ep => ({ ...ep, draft: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') handleRenamePhase(); if (e.key === 'Escape') setEditingPhase(null) }}
                              onBlur={handleRenamePhase}
                            />
                          </div>
                        ) : (
                          <>
                            <span
                              className="text-xs font-semibold text-gray-700 cursor-pointer hover:text-gray-900"
                              onClick={() => toggle(phaseName)}
                            >
                              {phaseName}
                            </span>
                            <button
                              onClick={() => setEditingPhase({ old: phaseName, draft: phaseName })}
                              className="text-gray-300 hover:text-gray-500 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Rename phase"
                            >
                              <Pencil size={10} />
                            </button>
                            <span className="text-xs text-gray-400">
                              {items.length} task{items.length !== 1 ? 's' : ''}
                              {items.filter(t => t.status === 'complete').length > 0 && ` · ${items.filter(t => t.status === 'complete').length} done`}
                            </span>
                          </>
                        )}
                        {/* Quick edit phase button (always visible on hover) */}
                        {editingPhase?.old !== phaseName && (
                          <button
                            onClick={() => setEditingPhase({ old: phaseName, draft: phaseName })}
                            className="ml-1 text-gray-300 hover:text-gray-500 p-0.5 rounded"
                            title="Rename phase"
                          >
                            <Pencil size={10} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <button
                        onClick={() => setAddingPhase(phaseName)}
                        className="inline-flex items-center gap-1 text-[10px] text-gray-400 hover:text-forest-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                      >
                        <Plus size={10} /> Add task
                      </button>
                    </td>
                  </tr>

                  {/* Task rows */}
                  {!collapsed[phaseName] && (
                    <>
                      {items.map(task => {
                        const isOverdue = task.endDate && task.status !== 'complete' && new Date(task.endDate) < new Date()
                        const st = STATUS_MAP[task.status] || STATUSES[0]
                        return (
                          <tr key={task.id} className="border-b border-gray-50 hover:bg-gray-50/60 group">
                            <td className="px-3 py-1.5 text-gray-300 group-hover:text-gray-400">
                              <div className="flex items-center justify-center h-full">
                                <span className="text-xs">⠿</span>
                              </div>
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <StatusDot status={task.status} />
                                <Cell
                                  value={task.name}
                                  onChange={v => updateScheduleTask(task.id, { name: v })}
                                  placeholder="Task name"
                                  className={`flex-1 font-medium ${task.status === 'complete' ? 'line-through text-gray-400' : 'text-gray-800'}`}
                                />
                              </div>
                            </td>
                            <td className="px-2 py-1.5">
                              <Cell
                                value={task.assignee}
                                onChange={v => updateScheduleTask(task.id, { assignee: v })}
                                type="select"
                                options={[{ value: '', label: '— Unassigned' }, ...useStore.getState().teamMembers.map(m => ({ value: m.name, label: m.name }))]}
                                placeholder="—"
                                className="text-gray-600"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <Cell
                                value={task.startDate ? fmtDisplay(task.startDate) : ''}
                                onChange={v => {
                                  // Convert display back to date if needed — use date input
                                }}
                                placeholder="—"
                              />
                              {/* Hidden date input trick: overlay a date input */}
                              <div className="relative -mt-5 h-5 overflow-hidden opacity-0 hover:opacity-100 transition-opacity">
                                <input
                                  type="date"
                                  className="absolute inset-0 w-full cursor-pointer text-xs"
                                  value={task.startDate ? fmtInput(task.startDate) : ''}
                                  onChange={e => handleUpdate(task.id, 'startDate', e.target.value, task)}
                                />
                              </div>
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="relative">
                                <div className={`text-xs px-1.5 py-0.5 min-h-[22px] ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-600'}`}>
                                  {task.endDate ? fmtDisplay(task.endDate) : <span className="text-gray-300">—</span>}
                                </div>
                                <input
                                  type="date"
                                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                                  value={task.endDate ? fmtInput(task.endDate) : ''}
                                  onChange={e => handleUpdate(task.id, 'endDate', e.target.value, task)}
                                  title="Click to set finish date"
                                />
                              </div>
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <Cell
                                value={task.durationDays != null ? String(task.durationDays) : calcDuration(task.startDate, task.endDate) != null ? String(calcDuration(task.startDate, task.endDate)) : ''}
                                onChange={v => handleUpdate(task.id, 'durationDays', v, task)}
                                type="number"
                                placeholder="—"
                                className="text-center text-gray-600"
                                align="right"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <Cell
                                value={task.progress > 0 ? `${task.progress}%` : ''}
                                onChange={v => handleUpdate(task.id, 'progress', v.replace('%', ''), task)}
                                type="number"
                                placeholder="—"
                                className="text-center text-gray-600"
                                align="right"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <Cell
                                value={st.label}
                                onChange={v => updateScheduleTask(task.id, { status: v })}
                                type="select"
                                options={STATUSES.map(s => ({ value: s.value, label: s.label }))}
                                className={st.text}
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              {confirmDelete === task.id ? (
                                <div className="flex items-center gap-0.5">
                                  <button onClick={() => { deleteScheduleTask(task.id); setConfirmDelete(null) }} className="text-[10px] text-red-600 px-1 py-0.5 rounded hover:bg-red-50 font-medium">Del</button>
                                  <button onClick={() => setConfirmDelete(null)} className="text-[10px] text-gray-400 px-1 py-0.5">✕</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDelete(task.id)}
                                  className="p-1 text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded hover:bg-red-50"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}

                      {/* Add task inline row */}
                      {addingPhase === phaseName && (
                        <NewTaskRow
                          phase={phaseName}
                          teamMembers={useStore.getState().teamMembers}
                          onSave={handleAddTask}
                          onCancel={() => setAddingPhase(null)}
                        />
                      )}

                      {/* Add task link (if not in add mode) */}
                      {addingPhase !== phaseName && (
                        <tr className="border-b border-gray-50">
                          <td colSpan={9} className="px-10 py-1.5">
                            <button
                              onClick={() => setAddingPhase(phaseName)}
                              className="text-xs text-gray-400 hover:text-forest-600 flex items-center gap-1 transition-colors"
                            >
                              <Plus size={11} /> Add task
                            </button>
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </Fragment>
              ))}

              {/* New phase add row */}
              {addingNewPhase && (
                <tr className="bg-forest-50/40 border-t-2 border-forest-200">
                  <td className="px-3 py-2 w-8" />
                  <td colSpan={8} className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        className="text-xs font-semibold border border-forest-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-forest-600 w-48"
                        placeholder="Phase name (e.g. Foundations)"
                        value={newPhaseName}
                        onChange={e => setNewPhaseName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newPhaseName.trim()) {
                            setAddingPhase(newPhaseName.trim())
                            setAddingNewPhase(false)
                          }
                          if (e.key === 'Escape') { setAddingNewPhase(false); setNewPhaseName('') }
                        }}
                      />
                      <button
                        disabled={!newPhaseName.trim()}
                        onClick={() => { setAddingPhase(newPhaseName.trim()); setAddingNewPhase(false) }}
                        className="text-xs bg-forest-600 text-white px-3 py-1 rounded-lg hover:bg-forest-700 disabled:opacity-40 transition-colors"
                      >
                        Create
                      </button>
                      <button onClick={() => { setAddingNewPhase(false); setNewPhaseName('') }} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Handle addingPhase for new phase (not yet in phases list) */}
              {addingPhase && !phases.find(p => p.name === addingPhase) && (
                <Fragment key={`new-${addingPhase}`}>
                  <tr className="bg-gray-50 border-t border-b border-gray-200">
                    <td className="px-3 py-2 w-8" />
                    <td colSpan={8} className="px-2 py-1.5">
                      <span className="text-xs font-semibold text-gray-700">{addingPhase}</span>
                      <span className="text-xs text-gray-400 ml-2">New phase</span>
                    </td>
                  </tr>
                  <NewTaskRow
                    phase={addingPhase}
                    teamMembers={useStore.getState().teamMembers}
                    onSave={handleAddTask}
                    onCancel={() => { setAddingPhase(null); setNewPhaseName('') }}
                  />
                </Fragment>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Milestones in table */}
      {projectMs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-amber-50/50">
            <span className="text-xs font-semibold text-amber-700">◆ Milestones</span>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {projectMs.map(ms => {
                const stage = ms.stageId ? STAGE_MAP[ms.stageId] : null
                const isPast = !ms.complete && new Date(ms.date) < new Date()
                return (
                  <tr key={ms.id} className="border-b border-gray-50 hover:bg-amber-50/20">
                    <td className="px-4 py-2.5 w-8">
                      <span className={`text-sm ${ms.complete ? 'text-green-500' : isPast ? 'text-red-400' : 'text-amber-500'}`}>◆</span>
                    </td>
                    <td className="px-2 py-2.5">
                      <span className={`text-sm ${ms.complete ? 'line-through text-gray-400' : 'text-gray-800'}`}>{ms.label}</span>
                      {stage && <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${stage.light} ${stage.text}`}>{stage.short}</span>}
                    </td>
                    <td className="px-2 py-2.5 text-xs text-gray-400" colSpan={3}>
                      {fmtDisplay(ms.date)}
                      {!ms.complete && ms.date && <span className={`ml-2 ${isPast ? 'text-red-500' : 'text-gray-400'}`}>{relativeDays(ms.date)}</span>}
                    </td>
                    <td colSpan={3} />
                    <td className="px-2 py-2.5">
                      <button
                        onClick={() => updateMilestone(ms.id, { complete: !ms.complete })}
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors ${ms.complete ? 'bg-green-100 border-green-200 text-green-700' : 'border-gray-200 text-gray-400 hover:border-green-300 hover:text-green-600'}`}
                      >
                        {ms.complete ? '✓ Done' : 'Done?'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add phase button */}
      <button
        onClick={() => setAddingNewPhase(true)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-forest-600 border border-dashed border-gray-300 hover:border-forest-400 px-4 py-2 rounded-lg transition-colors"
      >
        <Plus size={14} /> Add phase
      </button>
    </div>
  )
}

// ── Gantt View ─────────────────────────────────────────────────────────────────
const GANTT_LEFT = 200
const ROW_H = 32

function GanttView({ project, tasks, milestones }) {
  const [zoom, setZoom] = useState('weeks')
  const DAY_PX = zoom === 'weeks' ? 22 : 7
  const today = sod(new Date())

  const allDates = [
    project.startDate && sod(new Date(project.startDate)),
    project.targetCompletion && sod(new Date(project.targetCompletion)),
    ...tasks.filter(t => t.startDate).map(t => sod(new Date(t.startDate))),
    ...tasks.filter(t => t.endDate).map(t => sod(new Date(t.endDate))),
    ...milestones.filter(m => m.date).map(m => sod(new Date(m.date))),
    today,
  ].filter(Boolean)

  const raw = {
    min: new Date(Math.min(...allDates.map(d => d.getTime()))),
    max: new Date(Math.max(...allDates.map(d => d.getTime()))),
  }

  const spanStart = new Date(raw.min.getFullYear(), raw.min.getMonth(), 1)
  const spanEnd   = new Date(raw.max.getFullYear(), raw.max.getMonth() + 2, 0)
  const totalW    = (diffDays(spanStart, spanEnd) + 1) * DAY_PX

  const xFor = d => Math.max(0, diffDays(spanStart, sod(d)) * DAY_PX)

  const monthSegs = useMemo(() => {
    const segs = []; let cur = new Date(spanStart.getFullYear(), spanStart.getMonth(), 1)
    while (cur <= spanEnd) {
      const end = new Date(cur.getFullYear(), cur.getMonth() + 1, 0)
      segs.push({ key: `${cur.getFullYear()}-${cur.getMonth()}`, label: cur.toLocaleDateString('en-NZ', { month: 'short', year: '2-digit' }), x: xFor(cur), w: (diffDays(cur, end) + 1) * DAY_PX })
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
    }
    return segs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spanStart.getTime(), spanEnd.getTime(), DAY_PX])

  const weekTicks = useMemo(() => {
    if (zoom !== 'weeks') return []
    const ticks = []; let d = new Date(spanStart)
    while (d.getDay() !== 1) d = addDays(d, 1)
    while (d <= spanEnd) { ticks.push(xFor(d)); d = addDays(d, 7) }
    return ticks
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spanStart.getTime(), spanEnd.getTime(), zoom, DAY_PX])

  const todayX = xFor(today)
  const todayInView = todayX >= 0 && todayX <= totalW

  const phases = useMemo(() => {
    const map = new Map()
    const sorted = [...tasks].sort((a, b) => a.sortOrder - b.sortOrder)
    sorted.forEach(t => {
      const p = t.phase || '(No phase)'
      if (!map.has(p)) map.set(p, [])
      map.get(p).push(t)
    })
    return Array.from(map.entries())
  }, [tasks])

  const msWithDate = milestones.filter(m => m.date)

  if (tasks.length === 0) {
    return <div className="text-center py-12 text-sm text-gray-400">Add tasks in the Table view to see the Gantt.</div>
  }

  const GridLines = () => (
    <>
      {weekTicks.map((x, i) => <div key={i} style={{ position: 'absolute', left: x, top: 0, bottom: 0, width: 1 }} className="bg-gray-100" />)}
      {monthSegs.map(s => <div key={s.key} style={{ position: 'absolute', left: s.x, top: 0, bottom: 0, width: 1 }} className="bg-gray-200/70" />)}
      {todayInView && <div style={{ position: 'absolute', left: todayX, top: 0, bottom: 0, width: 2 }} className="bg-ocean-500/30" />}
    </>
  )

  const statusBarColor = (status, progress) => {
    if (status === 'complete') return 'bg-green-400'
    if (status === 'blocked') return 'bg-red-400'
    if (status === 'on-hold') return 'bg-amber-300'
    if (progress > 0) return 'bg-ocean-400'
    return 'bg-gray-300'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
          {[['bg-gray-300','Not started'],['bg-ocean-400','In progress'],['bg-green-400','Complete'],['bg-red-400','Blocked'],].map(([bg, label]) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className={`inline-block w-6 h-2 rounded ${bg}`} /> {label}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {[['weeks','Weeks'],['months','Months']].map(([z, l]) => (
            <button key={z} onClick={() => setZoom(z)} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${zoom === z ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: GANTT_LEFT + totalW, width: GANTT_LEFT + totalW }}>

            {/* Header */}
            <div className="flex border-b border-gray-200" style={{ height: 36 }}>
              <div style={{ width: GANTT_LEFT, minWidth: GANTT_LEFT }} className="shrink-0 border-r border-gray-100 flex items-center px-4 bg-gray-50 sticky left-0 z-20">
                <span className="text-xs font-medium text-gray-400">Task</span>
              </div>
              <div style={{ width: totalW, position: 'relative', flexShrink: 0 }}>
                {monthSegs.map(s => (
                  <div key={s.key} style={{ position: 'absolute', left: s.x, width: s.w, top: 0, bottom: 0 }} className="flex items-center border-r border-gray-200 px-2 bg-gray-50">
                    <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">{s.label}</span>
                  </div>
                ))}
                {todayInView && (
                  <>
                    <div style={{ position: 'absolute', left: todayX, top: 0, bottom: 0, width: 2 }} className="bg-ocean-500/60 z-10" />
                    <div style={{ position: 'absolute', left: todayX + 4, top: 8 }} className="text-[9px] text-ocean-600 font-bold z-10">Today</div>
                  </>
                )}
              </div>
            </div>

            {phases.map(([phaseName, phaseTasks]) => (
              <div key={phaseName}>
                <div className="flex border-b border-gray-100 bg-gray-50" style={{ height: 26 }}>
                  <div style={{ width: GANTT_LEFT, minWidth: GANTT_LEFT }} className="shrink-0 border-r border-gray-100 flex items-center px-4 sticky left-0 z-10 bg-gray-50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{phaseName}</span>
                  </div>
                  <div style={{ width: totalW, position: 'relative', flexShrink: 0 }}><GridLines /></div>
                </div>

                {phaseTasks.map(task => {
                  const isOverdue = task.endDate && task.status !== 'complete' && new Date(task.endDate) < new Date()
                  const hasBar = task.startDate && task.endDate
                  const hasDueOnly = !task.startDate && task.endDate
                  let barX = null, barW = null
                  if (hasBar) { barX = xFor(new Date(task.startDate)); barW = Math.max(DAY_PX * 1.5, diffDays(new Date(task.startDate), new Date(task.endDate)) * DAY_PX) }
                  else if (hasDueOnly) { barX = xFor(new Date(task.endDate)) - DAY_PX; barW = DAY_PX * 1.5 }

                  return (
                    <div key={task.id} className="flex border-b border-gray-50 hover:bg-gray-50/50" style={{ height: ROW_H }}>
                      <div style={{ width: GANTT_LEFT, minWidth: GANTT_LEFT }} className="shrink-0 border-r border-gray-100 flex items-center px-4 gap-2 bg-white sticky left-0 z-10">
                        <StatusDot status={task.status} />
                        <span className={`text-xs truncate ${task.status === 'complete' ? 'line-through text-gray-400' : 'text-gray-700'}`} title={task.name}>{task.name}</span>
                      </div>
                      <div style={{ width: totalW, position: 'relative', flexShrink: 0 }}>
                        <GridLines />
                        {barX !== null && (
                          <div style={{ position: 'absolute', left: barX, width: barW, top: '50%', transform: 'translateY(-50%)', height: 18, borderRadius: 4 }}
                            className={`${isOverdue ? 'bg-red-300' : statusBarColor(task.status, task.progress)} relative overflow-hidden`}
                            title={`${task.name}${task.assignee ? ' · ' + task.assignee : ''}${task.startDate ? '\nStart: ' + fmtDisplay(task.startDate) : ''}${task.endDate ? '\nFinish: ' + fmtDisplay(task.endDate) : ''}${task.progress ? '\nProgress: ' + task.progress + '%' : ''}`}
                          >
                            {/* Progress fill */}
                            {task.progress > 0 && task.progress < 100 && (
                              <div style={{ width: `${task.progress}%`, position: 'absolute', left: 0, top: 0, bottom: 0 }} className="bg-ocean-500/60" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}

            {/* Milestones */}
            {msWithDate.length > 0 && (
              <>
                <div className="flex border-b border-gray-100 bg-amber-50/50" style={{ height: 26 }}>
                  <div style={{ width: GANTT_LEFT, minWidth: GANTT_LEFT }} className="shrink-0 border-r border-gray-100 flex items-center px-4 sticky left-0 z-10 bg-amber-50/50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Milestones</span>
                  </div>
                  <div style={{ width: totalW, position: 'relative', flexShrink: 0 }}><GridLines /></div>
                </div>
                {msWithDate.map(ms => (
                  <div key={ms.id} className="flex border-b border-gray-50" style={{ height: ROW_H }}>
                    <div style={{ width: GANTT_LEFT, minWidth: GANTT_LEFT }} className="shrink-0 border-r border-gray-100 flex items-center px-4 gap-1.5 bg-white sticky left-0 z-10">
                      <span className={`text-xs ${ms.complete ? 'text-green-500' : 'text-amber-500'}`}>◆</span>
                      <span className={`text-xs truncate ${ms.complete ? 'line-through text-gray-400' : 'text-gray-700'}`}>{ms.label}</span>
                    </div>
                    <div style={{ width: totalW, position: 'relative', flexShrink: 0 }}>
                      <GridLines />
                      <div style={{ position: 'absolute', left: xFor(new Date(ms.date)), top: '50%', transform: 'translate(-50%,-50%) rotate(45deg)', width: 14, height: 14, borderRadius: 2 }}
                        className={ms.complete ? 'bg-green-400' : 'bg-amber-500'}
                        title={`${ms.label}: ${fmtDisplay(ms.date)}`}
                      />
                      <div style={{ position: 'absolute', left: xFor(new Date(ms.date)) + 12, top: '50%', transform: 'translateY(-50%)' }} className="text-[9px] text-amber-600 whitespace-nowrap font-medium">
                        {fmtDisplay(ms.date)}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Project span */}
            {(project.startDate || project.targetCompletion) && (
              <div className="flex border-t border-gray-100 bg-gray-50" style={{ height: 24 }}>
                <div style={{ width: GANTT_LEFT, minWidth: GANTT_LEFT }} className="shrink-0 border-r border-gray-100 flex items-center px-4 sticky left-0 z-10 bg-gray-50">
                  <span className="text-[10px] text-gray-400 font-medium">Project span</span>
                </div>
                <div style={{ width: totalW, position: 'relative', flexShrink: 0 }}>
                  {project.startDate && <div style={{ position: 'absolute', left: xFor(new Date(project.startDate)), top: 0, bottom: 0, width: 2 }} className="bg-forest-600/40" />}
                  {project.targetCompletion && <div style={{ position: 'absolute', left: xFor(new Date(project.targetCompletion)), top: 0, bottom: 0, width: 2 }} className="bg-forest-600/40" />}
                  {project.startDate && project.targetCompletion && (
                    <div style={{ position: 'absolute', left: xFor(new Date(project.startDate)), width: Math.max(0, xFor(new Date(project.targetCompletion)) - xFor(new Date(project.startDate))), top: '50%', transform: 'translateY(-50%)', height: 4 }} className="bg-forest-600/20 rounded" />
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

// ── Milestones View ────────────────────────────────────────────────────────────
function MilestonesView({ project, milestones }) {
  const { updateMilestone, addMilestone, deleteMilestone } = useStore()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ label: '', date: '', stageId: '' })
  const [confirmDelete, setConfirmDelete] = useState(null)
  const today = new Date()

  const sorted = useMemo(() => [...milestones].sort((a, b) => {
    if (!a.date && !b.date) return 0; if (!a.date) return 1; if (!b.date) return -1
    return new Date(a.date) - new Date(b.date)
  }), [milestones])

  const handleAdd = async () => {
    if (!form.label.trim()) return
    await addMilestone({ projectId: project.id, stageId: form.stageId, label: form.label.trim(), date: form.date })
    setForm({ label: '', date: '', stageId: '' })
    setShowAdd(false)
  }

  if (milestones.length === 0 && !showAdd) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-3 text-amber-300">◆</div>
        <p className="text-sm font-medium text-gray-600 mb-1">No milestones yet</p>
        <p className="text-xs text-gray-400 mb-5 max-w-xs mx-auto">Key dates — consents, funding, construction start, handover.</p>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 bg-forest-600 hover:bg-forest-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={14} /> Add milestone
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">{milestones.filter(m => m.complete).length} / {milestones.length} complete</p>
          {milestones.filter(m => m.date && !m.complete && new Date(m.date) < today).length > 0 && (
            <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
              {milestones.filter(m => m.date && !m.complete && new Date(m.date) < today).length} overdue
            </span>
          )}
        </div>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 bg-forest-600 hover:bg-forest-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
          <Plus size={14} /> Add milestone
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">New milestone</h4>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Name *</label>
              <input autoFocus className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                placeholder="e.g. Resource Consent obtained" value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Target date</label>
              <input type="date" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={!form.label.trim()} className="px-4 py-2 text-sm font-medium bg-forest-600 text-white rounded-lg hover:bg-forest-700 disabled:opacity-50 transition-colors">Add</button>
            <button onClick={() => { setShowAdd(false); setForm({ label: '', date: '', stageId: '' }) }} className="px-4 py-2 text-sm text-gray-500">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {sorted.map(ms => {
          const stage = ms.stageId ? STAGE_MAP[ms.stageId] : null
          const isPast = ms.date && !ms.complete && new Date(ms.date) < today
          const rel = ms.date ? relativeDays(ms.date) : null
          return (
            <div key={ms.id} className={`flex items-center gap-4 bg-white rounded-xl border px-5 py-4 group ${ms.complete ? 'border-green-100 bg-green-50/20' : isPast ? 'border-red-100' : 'border-gray-100 hover:border-gray-200'}`}>
              <div className={`text-xl shrink-0 ${ms.complete ? 'text-green-500' : isPast ? 'text-red-400' : 'text-amber-500'}`}>◆</div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${ms.complete ? 'line-through text-gray-400' : 'text-gray-800'}`}>{ms.label}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  {stage && <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${stage.light} ${stage.text}`}>{stage.short}</span>}
                  {rel && !ms.complete && <span className={`text-[10px] font-medium ${isPast ? 'text-red-500' : 'text-gray-400'}`}>{rel}</span>}
                  {ms.complete && <span className="text-[10px] text-green-600 font-medium">✓ Completed</span>}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="relative">
                  <div className="text-xs text-gray-700 cursor-pointer hover:underline">{ms.date ? fmtDisplay(ms.date) : <span className="text-gray-300">Set date</span>}</div>
                  <input type="date" className="absolute inset-0 opacity-0 cursor-pointer w-full" value={ms.date ? fmtInput(ms.date) : ''} onChange={e => updateMilestone(ms.id, { date: e.target.value })} />
                </div>
              </div>
              {confirmDelete === ms.id ? (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => { deleteMilestone(ms.id); setConfirmDelete(null) }} className="text-xs text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50">Delete</button>
                  <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-400 px-1">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(ms.id)} className="shrink-0 text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1 text-xs">×</button>
              )}
              <button onClick={() => updateMilestone(ms.id, { complete: !ms.complete })}
                className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${ms.complete ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-400 hover:bg-green-50'}`}>
                {ms.complete && <span className="text-xs font-bold leading-none">✓</span>}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function ScheduleTab({ project }) {
  const { scheduleTasks, milestones } = useStore()
  const [view, setView] = useState('table')

  const tasks = useMemo(() => scheduleTasks.filter(t => t.projectId === project.id), [scheduleTasks, project.id])
  const ms    = useMemo(() => milestones.filter(m => m.projectId === project.id), [milestones, project.id])

  const msWithDate = ms.filter(m => m.date)
  const overdueMs = msWithDate.filter(m => !m.complete && new Date(m.date) < new Date()).length
  const doneMs = ms.filter(m => m.complete).length

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {[
            { id: 'table',      icon: List,     label: 'Table' },
            { id: 'gantt',      icon: BarChart2, label: 'Gantt' },
            { id: 'milestones', icon: Flag,      label: `Milestones${ms.length > 0 ? ` (${ms.length})` : ''}` },
          ].map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setView(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>
        {ms.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {doneMs > 0 && <span className="text-green-600 font-medium">{doneMs} done</span>}
            {overdueMs > 0 && <span className="text-red-500 font-medium">{overdueMs} overdue</span>}
          </div>
        )}
      </div>

      {view === 'table'      && <ScheduleTable project={project} tasks={tasks} milestones={ms} />}
      {view === 'gantt'      && <GanttView     project={project} tasks={tasks} milestones={ms} />}
      {view === 'milestones' && <MilestonesView project={project} milestones={ms} />}
    </div>
  )
}
