import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Diamond, Plus, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import useStore from '../store/useStore'
import { STAGES, STAGE_MAP } from '../data/stages'

const DAY_MS = 86_400_000
const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100'

function parseDate(value) {
  if (!value) return null
  const parts = String(value).split('-').map(Number)
  if (parts.length === 3 && parts.every(Boolean)) return new Date(parts[0], parts[1] - 1, parts[2])
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS)
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function EventModal({ projects, onClose }) {
  const { addCalendarEvent, currentUser } = useStore()
  const [form, setForm] = useState({
    title: '',
    projectId: '',
    stageId: '',
    eventDate: formatDate(startOfToday()),
    eventType: 'event',
    notes: '',
  })

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))

  const save = async () => {
    if (!form.title.trim() || !form.eventDate) return
    await addCalendarEvent({
      ...form,
      title: form.title.trim(),
      notes: form.notes.trim(),
      createdBy: currentUser,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={event => event.target === event.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">New calendar event</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Title *</label>
            <input className={inputCls} value={form.title} onChange={event => set('title', event.target.value)} autoFocus />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Date *</label>
              <input type="date" className={inputCls} value={form.eventDate} onChange={event => set('eventDate', event.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Type</label>
              <select className={inputCls} value={form.eventType} onChange={event => set('eventType', event.target.value)}>
                <option value="event">Event</option>
                <option value="meeting">Meeting</option>
                <option value="deadline">Deadline</option>
                <option value="inspection">Inspection</option>
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Project</label>
              <select className={inputCls} value={form.projectId} onChange={event => set('projectId', event.target.value)}>
                <option value="">General</option>
                {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Stage</label>
              <select className={inputCls} value={form.stageId} onChange={event => set('stageId', event.target.value)}>
                <option value="">No stage</option>
                {STAGES.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Notes</label>
            <textarea className={`${inputCls} resize-none`} rows={3} value={form.notes} onChange={event => set('notes', event.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={!form.title.trim() || !form.eventDate} className="rounded-lg bg-forest-600 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 disabled:opacity-50">Add event</button>
        </div>
      </div>
    </div>
  )
}

export default function Calendar() {
  const { projects, milestones, scheduleTasks, calendarEvents, deleteCalendarEvent } = useStore()
  const [month, setMonth] = useState(() => startOfToday())
  const [filterProject, setFilterProject] = useState('')
  const [filterStage, setFilterStage] = useState('')
  const [filterType, setFilterType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [showNew, setShowNew] = useState(false)

  const events = useMemo(() => {
    const projectName = id => projects.find(project => project.id === id)?.name || 'General'
    const items = [
      ...milestones.filter(item => item.date).map(item => ({
        id: `milestone-${item.id}`,
        rawId: item.id,
        source: 'milestone',
        type: 'Project milestone',
        title: item.label,
        date: item.date,
        projectId: item.projectId,
        projectName: projectName(item.projectId),
        stageId: item.stageId,
        href: `/projects/${item.projectId}`,
      })),
      ...scheduleTasks.filter(item => item.isMilestone && (item.endDate || item.startDate)).map(item => ({
        id: `schedule-${item.id}`,
        rawId: item.id,
        source: 'schedule',
        type: 'Schedule milestone',
        title: item.name,
        date: item.endDate || item.startDate,
        projectId: item.projectId,
        projectName: projectName(item.projectId),
        stageId: '',
        phase: item.phase,
        href: `/projects/${item.projectId}`,
      })),
      ...calendarEvents.filter(item => item.eventDate).map(item => ({
        id: `event-${item.id}`,
        rawId: item.id,
        source: 'manual',
        type: item.eventType || 'Event',
        title: item.title,
        date: item.eventDate,
        projectId: item.projectId,
        projectName: projectName(item.projectId),
        stageId: item.stageId,
        notes: item.notes,
        href: item.projectId ? `/projects/${item.projectId}` : '',
      })),
    ]

    return items
      .filter(item => !filterProject || item.projectId === filterProject)
      .filter(item => !filterStage || item.stageId === filterStage || item.phase === STAGE_MAP[filterStage]?.label)
      .filter(item => !filterType || item.source === filterType)
      .filter(item => !fromDate || item.date >= fromDate)
      .filter(item => !toDate || item.date <= toDate)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
  }, [projects, milestones, scheduleTasks, calendarEvents, filterProject, filterStage, filterType, fromDate, toDate])

  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1)
  const firstDay = (monthStart.getDay() + 6) % 7
  const calendarStart = addDays(monthStart, -firstDay)
  const days = Array.from({ length: 42 }, (_, index) => addDays(calendarStart, index))
  const today = startOfToday()
  const eventsByDate = useMemo(() => {
    const map = new Map()
    events.forEach(item => {
      if (!map.has(item.date)) map.set(item.date, [])
      map.get(item.date).push(item)
    })
    return map
  }, [events])

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-gray-100 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Calendar</h1>
            <p className="mt-0.5 text-sm text-gray-400">{events.length} milestone/event item{events.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 rounded-lg bg-forest-600 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700">
            <Plus size={15} /> Add event
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-6">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <select value={filterProject} onChange={event => setFilterProject(event.target.value)} className={inputCls + ' w-52'}>
              <option value="">All projects</option>
              {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <select value={filterStage} onChange={event => setFilterStage(event.target.value)} className={inputCls + ' w-52'}>
              <option value="">All stages</option>
              {STAGES.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
            </select>
            <select value={filterType} onChange={event => setFilterType(event.target.value)} className={inputCls + ' w-44'}>
              <option value="">All event types</option>
              <option value="milestone">Project milestones</option>
              <option value="schedule">Schedule milestones</option>
              <option value="manual">Manual events</option>
            </select>
            <input type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} className={inputCls + ' w-40'} />
            <input type="date" value={toDate} onChange={event => setToDate(event.target.value)} className={inputCls + ' w-40'} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
                <button onClick={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))} className="rounded p-1.5 text-gray-500 hover:bg-white"><ChevronLeft size={16} /></button>
                <div className="text-sm font-semibold text-gray-800">{month.toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' })}</div>
                <button onClick={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))} className="rounded p-1.5 text-gray-500 hover:bg-white"><ChevronRight size={16} /></button>
              </div>
              <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/70">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <div key={day} className="py-2 text-center text-xs font-medium text-gray-500">{day}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {days.map(day => {
                  const key = formatDate(day)
                  const dayEvents = eventsByDate.get(key) || []
                  const isCurrentMonth = day.getMonth() === month.getMonth()
                  const isToday = key === formatDate(today)
                  return (
                    <div key={key} className={`min-h-[116px] border-b border-r border-gray-100 p-2 ${isCurrentMonth ? 'bg-white' : 'bg-gray-50/60'}`}>
                      <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? 'bg-forest-600 font-bold text-white' : isCurrentMonth ? 'text-gray-700' : 'text-gray-300'}`}>{day.getDate()}</div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 4).map(item => (
                          <Link key={item.id} to={item.href || '#'} className="flex items-center gap-1 rounded bg-forest-50 px-1.5 py-1 text-[10px] text-forest-800 hover:bg-forest-100" title={`${item.projectName}: ${item.title}`}>
                            {item.source === 'schedule' ? <Diamond size={9} className="shrink-0 fill-forest-700" /> : <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-forest-700" />}
                            <span className="truncate">{item.title}</span>
                          </Link>
                        ))}
                        {dayEvents.length > 4 && <div className="px-1 text-[10px] text-gray-400">+{dayEvents.length - 4} more</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                <CalendarDays size={15} className="text-forest-700" />
                <h2 className="text-sm font-semibold text-gray-900">Upcoming</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {events.slice(0, 18).map(item => (
                  <div key={item.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={item.href || '#'} className="min-w-0 text-sm font-medium text-gray-900 hover:text-ocean-600">{item.title}</Link>
                      {item.source === 'manual' && <button onClick={() => deleteCalendarEvent(item.rawId)} className="text-xs text-gray-300 hover:text-red-600">Delete</button>}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">{parseDate(item.date)?.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })} · {item.projectName} · {item.type}</div>
                  </div>
                ))}
                {events.length === 0 && <div className="px-4 py-10 text-center text-sm text-gray-400">No milestones or events match this view.</div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showNew && <EventModal projects={projects} onClose={() => setShowNew(false)} />}
    </div>
  )
}
