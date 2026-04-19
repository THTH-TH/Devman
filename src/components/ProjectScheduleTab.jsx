import { useState, useMemo, Fragment } from 'react'
import { List, BarChart2, Flag, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import useStore from '../store/useStore'
import { STAGES, STAGE_MAP } from '../data/stages'

// ── Date helpers ───────────────────────────────────────────────────────────────
const DAY_MS = 86_400_000

function sod(d) {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

function diffDays(a, b) {
  return Math.round((sod(b) - sod(a)) / DAY_MS)
}

function addDays(d, n) {
  return new Date(d.getTime() + n * DAY_MS)
}

function fmtShort(d) {
  return new Date(d).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
}

function fmtInput(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtDisplay(dateStr) {
  if (!dateStr) return '—'
  return fmtShort(dateStr)
}

function relativeDays(dateStr) {
  if (!dateStr) return null
  const diff = diffDays(new Date(), new Date(dateStr))
  if (diff === 0) return 'Today'
  if (diff > 0) return `in ${diff}d`
  return `${Math.abs(diff)}d ago`
}

// ── Shared components ──────────────────────────────────────────────────────────

function InlineDate({ value, onChange, placeholder = 'Set date' }) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return (
      <input
        type="date"
        autoFocus
        className="text-xs border border-gray-200 rounded px-1.5 py-0.5 w-32 focus:outline-none focus:ring-1 focus:ring-ocean-500"
        defaultValue={fmtInput(value)}
        onChange={e => { onChange(e.target.value || ''); setEditing(false) }}
        onBlur={() => setEditing(false)}
      />
    )
  }
  return (
    <button onClick={() => setEditing(true)} className="text-xs hover:underline text-left">
      {value
        ? <span className="text-gray-700">{fmtDisplay(value)}</span>
        : <span className="text-gray-300 hover:text-gray-400">{placeholder}</span>
      }
    </button>
  )
}

const STATUS_STYLE = {
  complete: 'bg-green-100 text-green-700',
  'in-progress': 'bg-ocean-50 text-ocean-700',
  'not-started': 'bg-gray-100 text-gray-500',
  blocked: 'bg-red-100 text-red-700',
  'on-hold': 'bg-amber-100 text-amber-700',
}
const STATUS_LABEL = {
  complete: 'Done', 'in-progress': 'In progress', 'not-started': 'Not started',
  blocked: 'Blocked', 'on-hold': 'On hold',
}
function StatusBadge({ status }) {
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[status] || STATUS_STYLE['not-started']}`}>
      {STATUS_LABEL[status] || status}
    </span>
  )
}

// ── List View ──────────────────────────────────────────────────────────────────

function ListView({ project, items, milestones }) {
  const { updateChecklistItem, updateMilestone } = useStore()
  const [collapsed, setCollapsed] = useState({})
  const toggle = id => setCollapsed(c => ({ ...c, [id]: !c[id] }))

  const grouped = useMemo(() => {
    return STAGES
      .map(stage => ({
        stage,
        tasks: items.filter(i => i.stageId === stage.id),
        ms: milestones.filter(m => m.stageId === stage.id),
      }))
      .filter(g => g.tasks.length > 0 || g.ms.length > 0)
  }, [items, milestones])

  // Tasks with no stage
  const unstagedTasks = items.filter(i => !i.stageId || !STAGE_MAP[i.stageId])
  const unstagedMs = milestones.filter(m => !m.stageId || !STAGE_MAP[m.stageId])

  if (grouped.length === 0 && unstagedTasks.length === 0 && unstagedMs.length === 0) {
    return (
      <div className="text-center py-16 text-sm text-gray-400">
        No tasks yet — add checklist items to see them here.
      </div>
    )
  }

  const renderTask = (task) => {
    const isOverdue = task.dueDate && !task.done && new Date(task.dueDate) < new Date()
    return (
      <tr key={task.id} className="border-b border-gray-50 hover:bg-gray-50/60">
        <td className="px-4 py-2.5 pl-8">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${task.done ? 'bg-green-400' : isOverdue ? 'bg-red-400' : 'bg-gray-200'}`} />
            <span className={`text-sm truncate ${task.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.label}</span>
            {task.isBlocker && (
              <span className="shrink-0 text-[10px] text-red-500 font-medium bg-red-50 px-1.5 py-0.5 rounded-full">Blocker</span>
            )}
          </div>
        </td>
        <td className="px-4 py-2.5 text-xs text-gray-400 hidden lg:table-cell">{task.owner || '—'}</td>
        <td className="px-4 py-2.5">
          <InlineDate value={task.startDate} onChange={v => updateChecklistItem(task.id, { startDate: v })} />
        </td>
        <td className="px-4 py-2.5">
          <InlineDate value={task.dueDate} onChange={v => updateChecklistItem(task.id, { dueDate: v })} />
          {isOverdue && (
            <div className="text-[10px] text-red-500 font-medium">{relativeDays(task.dueDate)}</div>
          )}
        </td>
        <td className="px-4 py-2.5 hidden sm:table-cell">
          <StatusBadge status={task.done ? 'complete' : task.status} />
        </td>
      </tr>
    )
  }

  const renderMilestone = (m) => {
    const isPast = m.date && !m.complete && new Date(m.date) < new Date()
    return (
      <tr key={m.id} className="border-b border-gray-50 bg-amber-50/20 hover:bg-amber-50/40">
        <td className="px-4 py-2.5 pl-8">
          <div className="flex items-center gap-2">
            <span className={`text-sm ${m.complete ? 'text-green-500' : 'text-amber-500'}`}>◆</span>
            <span className={`text-sm ${m.complete ? 'line-through text-gray-400' : 'text-gray-700'}`}>{m.label}</span>
            <span className="shrink-0 text-[10px] text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full font-medium">Milestone</span>
          </div>
        </td>
        <td className="px-4 py-2.5 hidden lg:table-cell" />
        <td className="px-4 py-2.5 text-xs text-gray-300 hidden sm:table-cell">—</td>
        <td className="px-4 py-2.5">
          <InlineDate value={m.date} onChange={v => updateMilestone(m.id, { date: v })} />
          {m.date && !m.complete && (
            <div className={`text-[10px] font-medium ${isPast ? 'text-red-500' : 'text-gray-400'}`}>
              {relativeDays(m.date)}
            </div>
          )}
        </td>
        <td className="px-4 py-2.5 hidden sm:table-cell">
          <button
            onClick={() => updateMilestone(m.id, { complete: !m.complete })}
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
              m.complete
                ? 'bg-green-100 border-green-200 text-green-700'
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-600'
            }`}
          >
            {m.complete ? '✓ Done' : 'Mark done'}
          </button>
        </td>
      </tr>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Task / Milestone</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide w-28 hidden lg:table-cell">Owner</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide w-28">Start</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide w-28">Due / Date</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide w-28 hidden sm:table-cell">Status</th>
          </tr>
        </thead>
        <tbody>
          {grouped.map(({ stage, tasks, ms }) => (
            <Fragment key={stage.id}>
              <tr
                className={`${stage.light} border-t border-gray-100 cursor-pointer select-none`}
                onClick={() => toggle(stage.id)}
              >
                <td colSpan={5} className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {collapsed[stage.id]
                      ? <ChevronRight size={12} className={stage.text} />
                      : <ChevronDown size={12} className={stage.text} />}
                    <span className={`text-xs font-semibold ${stage.text}`}>{stage.label}</span>
                    <span className={`text-xs opacity-50 ${stage.text}`}>
                      {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                      {ms.length > 0 ? `, ${ms.length} milestone${ms.length !== 1 ? 's' : ''}` : ''}
                    </span>
                  </div>
                </td>
              </tr>
              {!collapsed[stage.id] && (
                <>
                  {tasks.map(renderTask)}
                  {ms.map(renderMilestone)}
                </>
              )}
            </Fragment>
          ))}
          {/* Unstaged items */}
          {(unstagedTasks.length > 0 || unstagedMs.length > 0) && (
            <Fragment key="unstaged">
              <tr className="bg-gray-50 border-t border-gray-100">
                <td colSpan={5} className="px-4 py-2">
                  <span className="text-xs font-semibold text-gray-500">No stage</span>
                </td>
              </tr>
              {unstagedTasks.map(renderTask)}
              {unstagedMs.map(renderMilestone)}
            </Fragment>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ── Gantt View ─────────────────────────────────────────────────────────────────
const GANTT_LEFT = 210
const ROW_H = 34

function GanttView({ project, items, milestones }) {
  const [zoom, setZoom] = useState('weeks')
  const DAY_PX = zoom === 'weeks' ? 22 : 7
  const today = sod(new Date())

  // All dates to establish the timeline span
  const allDates = [
    project.startDate && sod(new Date(project.startDate)),
    project.targetCompletion && sod(new Date(project.targetCompletion)),
    ...items.filter(i => i.startDate).map(i => sod(new Date(i.startDate))),
    ...items.filter(i => i.dueDate).map(i => sod(new Date(i.dueDate))),
    ...milestones.filter(m => m.date).map(m => sod(new Date(m.date))),
    today,
  ].filter(Boolean)

  const raw = {
    min: new Date(Math.min(...allDates.map(d => d.getTime()))),
    max: new Date(Math.max(...allDates.map(d => d.getTime()))),
  }

  // Extend to month boundaries + padding
  const spanStart = new Date(raw.min.getFullYear(), raw.min.getMonth(), 1)
  const spanEnd = new Date(raw.max.getFullYear(), raw.max.getMonth() + 2, 0)
  const totalDays = diffDays(spanStart, spanEnd) + 1
  const totalW = totalDays * DAY_PX

  const xFor = (d) => Math.max(0, diffDays(spanStart, sod(d)) * DAY_PX)

  // Month header segments
  const monthSegs = useMemo(() => {
    const segs = []
    let cur = new Date(spanStart.getFullYear(), spanStart.getMonth(), 1)
    while (cur <= spanEnd) {
      const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0)
      segs.push({
        key: `${cur.getFullYear()}-${cur.getMonth()}`,
        label: cur.toLocaleDateString('en-NZ', { month: 'short', year: '2-digit' }),
        x: xFor(cur),
        w: (diffDays(cur, monthEnd) + 1) * DAY_PX,
      })
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
    }
    return segs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spanStart.getTime(), spanEnd.getTime(), DAY_PX])

  // Week tick positions (every Monday, weeks zoom only)
  const weekTicks = useMemo(() => {
    if (zoom !== 'weeks') return []
    const ticks = []
    let d = new Date(spanStart)
    while (d.getDay() !== 1) d = addDays(d, 1) // advance to Monday
    while (d <= spanEnd) { ticks.push(xFor(d)); d = addDays(d, 7) }
    return ticks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spanStart.getTime(), spanEnd.getTime(), zoom, DAY_PX])

  const todayX = xFor(today)
  const todayInView = todayX >= 0 && todayX <= totalW

  // Grouped tasks by stage (only stages with tasks)
  const grouped = useMemo(() => {
    return STAGES
      .map(stage => ({ stage, tasks: items.filter(i => i.stageId === stage.id) }))
      .filter(g => g.tasks.length > 0)
  }, [items])

  const msWithDate = milestones.filter(m => m.date)

  if (items.length === 0 && milestones.length === 0) {
    return (
      <div className="text-center py-16 text-sm text-gray-400">
        No tasks yet — add checklist items to see the Gantt chart.
      </div>
    )
  }

  // Shared grid lines rendered inside each right-panel row
  const GridLines = () => (
    <>
      {weekTicks.map((x, i) => (
        <div key={i} style={{ position: 'absolute', left: x, top: 0, bottom: 0, width: 1 }} className="bg-gray-100" />
      ))}
      {monthSegs.map(seg => (
        <div key={seg.key} style={{ position: 'absolute', left: seg.x, top: 0, bottom: 0, width: 1 }} className="bg-gray-200/70" />
      ))}
      {todayInView && (
        <div style={{ position: 'absolute', left: todayX, top: 0, bottom: 0, width: 2 }} className="bg-ocean-500/30" />
      )}
    </>
  )

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-8 h-2.5 rounded bg-green-300" /> Done
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-8 h-2.5 rounded bg-red-300" /> Overdue
          </span>
          <span className="flex items-center gap-1.5 text-amber-500 font-bold">◆<span className="text-gray-400 font-normal">Milestone</span>
          </span>
          {todayInView && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-0.5 h-4 bg-ocean-500/60" /> Today
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {[['weeks', 'Weeks'], ['months', 'Months']].map(([z, label]) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${zoom === z ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: GANTT_LEFT + totalW, width: GANTT_LEFT + totalW }}>

            {/* Month header */}
            <div className="flex border-b border-gray-200" style={{ height: 36 }}>
              <div
                style={{ width: GANTT_LEFT, minWidth: GANTT_LEFT }}
                className="shrink-0 border-r border-gray-100 flex items-center px-4 bg-gray-50 sticky left-0 z-20"
              >
                <span className="text-xs font-medium text-gray-400">Task</span>
              </div>
              <div style={{ width: totalW, position: 'relative', flexShrink: 0 }}>
                {monthSegs.map(seg => (
                  <div
                    key={seg.key}
                    style={{ position: 'absolute', left: seg.x, width: seg.w, top: 0, bottom: 0 }}
                    className="flex items-center border-r border-gray-200 px-2 bg-gray-50"
                  >
                    <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">{seg.label}</span>
                  </div>
                ))}
                {/* Today line + label */}
                {todayInView && (
                  <>
                    <div style={{ position: 'absolute', left: todayX, top: 0, bottom: 0, width: 2 }} className="bg-ocean-500/50 z-10" />
                    <div style={{ position: 'absolute', left: todayX + 4, top: 8 }} className="text-[9px] text-ocean-600 font-bold whitespace-nowrap z-10">
                      Today
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Stage + task rows */}
            {grouped.map(({ stage, tasks }) => (
              <div key={stage.id}>
                {/* Stage header */}
                <div className={`flex border-b border-gray-100 ${stage.light}`} style={{ height: 26 }}>
                  <div
                    style={{ width: GANTT_LEFT, minWidth: GANTT_LEFT }}
                    className={`shrink-0 border-r border-gray-100 flex items-center px-4 sticky left-0 z-10 ${stage.light}`}
                  >
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${stage.text}`}>{stage.label}</span>
                  </div>
                  <div style={{ width: totalW, position: 'relative', flexShrink: 0 }}>
                    <GridLines />
                  </div>
                </div>

                {/* Task rows */}
                {tasks.map(task => {
                  const isOverdue = task.dueDate && !task.done && new Date(task.dueDate) < new Date()
                  const hasBar = task.startDate && task.dueDate
                  const hasDueOnly = !task.startDate && task.dueDate

                  let barX = null, barW = null
                  if (hasBar) {
                    barX = xFor(new Date(task.startDate))
                    barW = Math.max(DAY_PX * 1.5, diffDays(new Date(task.startDate), new Date(task.dueDate)) * DAY_PX)
                  } else if (hasDueOnly) {
                    barX = xFor(new Date(task.dueDate)) - DAY_PX
                    barW = DAY_PX * 1.5
                  }

                  const barColor = task.done
                    ? 'bg-green-300'
                    : isOverdue
                      ? 'bg-red-300'
                      : stage.bg

                  return (
                    <div key={task.id} className="flex border-b border-gray-50 hover:bg-gray-50/50 group" style={{ height: ROW_H }}>
                      <div
                        style={{ width: GANTT_LEFT, minWidth: GANTT_LEFT }}
                        className="shrink-0 border-r border-gray-100 flex items-center px-4 gap-2 bg-white sticky left-0 z-10"
                      >
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${task.done ? 'bg-green-400' : isOverdue ? 'bg-red-400' : 'bg-gray-300'}`} />
                        <span
                          className={`text-xs truncate ${task.done ? 'line-through text-gray-400' : 'text-gray-700'}`}
                          title={task.label}
                        >
                          {task.label}
                        </span>
                      </div>
                      <div style={{ width: totalW, position: 'relative', flexShrink: 0 }}>
                        <GridLines />
                        {barX !== null && (
                          <div
                            style={{
                              position: 'absolute',
                              left: barX,
                              width: barW,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              height: 18,
                              borderRadius: 4,
                            }}
                            className={`${barColor} cursor-default`}
                            title={`${task.label}${task.startDate ? ' · Start: ' + fmtDisplay(task.startDate) : ''}${task.dueDate ? ' · Due: ' + fmtDisplay(task.dueDate) : ''}`}
                          />
                        )}
                        {/* No-date indicator */}
                        {barX === null && (
                          <div style={{ position: 'absolute', left: todayX + 6, top: '50%', transform: 'translateY(-50%)' }}
                            className="text-[9px] text-gray-300 whitespace-nowrap">
                            no dates set
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}

            {/* Milestones row */}
            {msWithDate.length > 0 && (
              <>
                <div className="flex border-b border-gray-100 bg-amber-50/50" style={{ height: 26 }}>
                  <div
                    style={{ width: GANTT_LEFT, minWidth: GANTT_LEFT }}
                    className="shrink-0 border-r border-gray-100 flex items-center px-4 bg-amber-50/50 sticky left-0 z-10"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Milestones</span>
                  </div>
                  <div style={{ width: totalW, position: 'relative', flexShrink: 0 }}>
                    <GridLines />
                  </div>
                </div>
                {msWithDate.map(ms => {
                  const msX = xFor(new Date(ms.date))
                  return (
                    <div key={ms.id} className="flex border-b border-gray-50" style={{ height: ROW_H }}>
                      <div
                        style={{ width: GANTT_LEFT, minWidth: GANTT_LEFT }}
                        className="shrink-0 border-r border-gray-100 flex items-center px-4 gap-1.5 bg-white sticky left-0 z-10"
                      >
                        <span className={`text-xs ${ms.complete ? 'text-green-500' : 'text-amber-500'}`}>◆</span>
                        <span className={`text-xs truncate ${ms.complete ? 'line-through text-gray-400' : 'text-gray-700'}`}>{ms.label}</span>
                      </div>
                      <div style={{ width: totalW, position: 'relative', flexShrink: 0 }}>
                        <GridLines />
                        {/* Milestone diamond */}
                        <div
                          style={{
                            position: 'absolute',
                            left: msX,
                            top: '50%',
                            transform: 'translate(-50%, -50%) rotate(45deg)',
                            width: 14,
                            height: 14,
                            borderRadius: 2,
                          }}
                          className={ms.complete ? 'bg-green-400' : 'bg-amber-500'}
                          title={`${ms.label}: ${fmtDisplay(ms.date)}`}
                        />
                        {/* Date label */}
                        <div
                          style={{ position: 'absolute', left: msX + 12, top: '50%', transform: 'translateY(-50%)' }}
                          className="text-[9px] text-amber-600 whitespace-nowrap font-medium"
                        >
                          {fmtDisplay(ms.date)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {/* Project timeline markers */}
            {(project.startDate || project.targetCompletion) && (
              <div className="flex border-t border-gray-100 bg-gray-50" style={{ height: 26 }}>
                <div
                  style={{ width: GANTT_LEFT, minWidth: GANTT_LEFT }}
                  className="shrink-0 border-r border-gray-100 flex items-center px-4 sticky left-0 z-10 bg-gray-50"
                >
                  <span className="text-[10px] text-gray-400 font-medium">Project span</span>
                </div>
                <div style={{ width: totalW, position: 'relative', flexShrink: 0, height: 26 }}>
                  {project.startDate && (
                    <div
                      style={{ position: 'absolute', left: xFor(new Date(project.startDate)), top: 0, bottom: 0, width: 2 }}
                      className="bg-forest-600/40"
                      title={`Project start: ${fmtDisplay(project.startDate)}`}
                    />
                  )}
                  {project.targetCompletion && (
                    <div
                      style={{ position: 'absolute', left: xFor(new Date(project.targetCompletion)), top: 0, bottom: 0, width: 2 }}
                      className="bg-forest-600/40"
                      title={`Target completion: ${fmtDisplay(project.targetCompletion)}`}
                    />
                  )}
                  {project.startDate && project.targetCompletion && (
                    <div
                      style={{
                        position: 'absolute',
                        left: xFor(new Date(project.startDate)),
                        width: Math.max(0, xFor(new Date(project.targetCompletion)) - xFor(new Date(project.startDate))),
                        top: '50%',
                        transform: 'translateY(-50%)',
                        height: 4,
                      }}
                      className="bg-forest-600/20 rounded"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 text-[10px] text-gray-400">
        {project.startDate && `Start: ${fmtDisplay(project.startDate)}`}
        {project.startDate && project.targetCompletion && ' · '}
        {project.targetCompletion && `Target: ${fmtDisplay(project.targetCompletion)}`}
      </div>
    </div>
  )
}

// ── Milestones View ────────────────────────────────────────────────────────────

function MilestonesView({ project, milestones }) {
  const { updateMilestone, addMilestone, deleteMilestone } = useStore()
  const [showAdd, setShowAdd] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newStage, setNewStage] = useState('')
  const [newDate, setNewDate] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const today = new Date()

  const sorted = useMemo(() => {
    return [...milestones].sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return new Date(a.date) - new Date(b.date)
    })
  }, [milestones])

  const handleAdd = async () => {
    if (!newLabel.trim()) return
    await addMilestone({
      projectId: project.id,
      stageId: newStage || '',
      label: newLabel.trim(),
      date: newDate,
    })
    setNewLabel('')
    setNewDate('')
    setNewStage('')
    setShowAdd(false)
  }

  if (milestones.length === 0 && !showAdd) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-3 text-amber-300">◆</div>
        <p className="text-sm font-medium text-gray-600 mb-1">No milestones yet</p>
        <p className="text-xs text-gray-400 mb-5 max-w-xs mx-auto">
          Track key project dates — consents, handovers, funding deadlines, construction starts.
        </p>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 bg-forest-600 hover:bg-forest-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={14} />
          Add milestone
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">
            {milestones.filter(m => m.complete).length} / {milestones.length} complete
          </p>
          {milestones.filter(m => m.date && !m.complete && new Date(m.date) < today).length > 0 && (
            <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
              {milestones.filter(m => m.date && !m.complete && new Date(m.date) < today).length} overdue
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 bg-forest-600 hover:bg-forest-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={14} />
          Add milestone
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-4">New milestone</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Name *</label>
              <input
                autoFocus
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                placeholder="e.g. Resource Consent obtained"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Target date</label>
              <input
                type="date"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Stage (optional)</label>
            <select
              className="w-full sm:w-64 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
              value={newStage}
              onChange={e => setNewStage(e.target.value)}
            >
              <option value="">— no stage —</option>
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newLabel.trim()}
              className="px-4 py-2 text-sm font-medium bg-forest-600 text-white rounded-lg hover:bg-forest-700 disabled:opacity-50 transition-colors"
            >
              Add milestone
            </button>
            <button onClick={() => { setShowAdd(false); setNewLabel(''); setNewDate(''); setNewStage('') }}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Milestone cards */}
      <div className="space-y-2">
        {sorted.map(ms => {
          const stage = ms.stageId ? STAGE_MAP[ms.stageId] : null
          const msDate = ms.date ? new Date(ms.date) : null
          const isPast = msDate && !ms.complete && msDate < today
          const isToday = msDate && diffDays(today, msDate) === 0
          const daysRel = ms.date ? relativeDays(ms.date) : null

          return (
            <div
              key={ms.id}
              className={`flex items-center gap-4 bg-white rounded-xl border px-5 py-4 group transition-colors ${
                ms.complete ? 'border-green-100 bg-green-50/20' : isPast ? 'border-red-100' : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              {/* Icon */}
              <div className={`text-xl shrink-0 ${ms.complete ? 'text-green-500' : isPast ? 'text-red-400' : 'text-amber-500'}`}>◆</div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${ms.complete ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {ms.label}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {stage && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${stage.light} ${stage.text}`}>
                      {stage.short}
                    </span>
                  )}
                  {daysRel && !ms.complete && (
                    <span className={`text-[10px] font-medium ${isPast ? 'text-red-500' : isToday ? 'text-ocean-600 font-bold' : 'text-gray-400'}`}>
                      {daysRel}
                    </span>
                  )}
                  {ms.complete && (
                    <span className="text-[10px] text-green-600 font-medium">✓ Completed</span>
                  )}
                </div>
              </div>

              {/* Date */}
              <div className="shrink-0 text-right">
                <InlineDate value={ms.date} onChange={v => updateMilestone(ms.id, { date: v })} placeholder="Set date" />
              </div>

              {/* Delete (hover) */}
              {confirmDelete === ms.id ? (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => { deleteMilestone(ms.id); setConfirmDelete(null) }} className="text-xs text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50">Delete</button>
                  <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-400 px-1">Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(ms.id)}
                  className="shrink-0 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1 text-xs"
                  title="Delete milestone"
                >
                  ×
                </button>
              )}

              {/* Complete toggle */}
              <button
                onClick={() => updateMilestone(ms.id, { complete: !ms.complete })}
                className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                  ms.complete
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
                }`}
                title={ms.complete ? 'Mark incomplete' : 'Mark complete'}
              >
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
  const { checklistItems, milestones } = useStore()
  const [view, setView] = useState('list')

  const items = checklistItems.filter(i => i.projectId === project.id)
  const ms = milestones.filter(m => m.projectId === project.id)

  const doneMs = ms.filter(m => m.complete).length
  const upcomingMs = ms.filter(m => m.date && !m.complete && new Date(m.date) >= new Date()).length
  const overdueMs = ms.filter(m => m.date && !m.complete && new Date(m.date) < new Date()).length

  return (
    <div>
      {/* View switcher + summary */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {[
            { id: 'list', icon: List, label: 'List' },
            { id: 'gantt', icon: BarChart2, label: 'Gantt' },
            { id: 'milestones', icon: Flag, label: `Milestones${ms.length > 0 ? ` (${ms.length})` : ''}` },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Quick stats */}
        {ms.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {doneMs > 0 && <span className="text-green-600 font-medium">{doneMs} done</span>}
            {upcomingMs > 0 && <span>{upcomingMs} upcoming</span>}
            {overdueMs > 0 && <span className="text-red-500 font-medium">{overdueMs} overdue</span>}
          </div>
        )}
      </div>

      {view === 'list' && <ListView project={project} items={items} milestones={ms} />}
      {view === 'gantt' && <GanttView project={project} items={items} milestones={ms} />}
      {view === 'milestones' && <MilestonesView project={project} milestones={ms} />}
    </div>
  )
}
