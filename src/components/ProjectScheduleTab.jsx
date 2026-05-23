import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart2,
  Calendar,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Diamond,
  Download,
  Edit3,
  FileText,
  FileSpreadsheet,
  List,
  Minus,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import Papa from 'papaparse'
import useStore from '../store/useStore'
import { buildScheduleTasksFromTemplateItems } from '../data/scheduleTemplate'
import { STAGES } from '../data/stages'

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

const FALLBACK_PHASE_TONES = [
  { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', dot: 'bg-blue-500' },
  { bg: 'bg-teal-500', light: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-300', dot: 'bg-teal-500' },
  { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300', dot: 'bg-purple-500' },
  { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', dot: 'bg-orange-500' },
  { bg: 'bg-indigo-800', light: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-300', dot: 'bg-indigo-800' },
  { bg: 'bg-emerald-800', light: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-800' },
]

function stageForPhase(phase) {
  const key = String(phase || '').toLowerCase()
  return STAGES.find(stage => {
    const options = [stage.id, stage.label, stage.short].map(value => String(value || '').toLowerCase())
    return options.includes(key) || options.some(option => option && key.includes(option))
  })
}

function phaseTone(phase, index = 0) {
  return stageForPhase(phase) || FALLBACK_PHASE_TONES[index % FALLBACK_PHASE_TONES.length]
}

function getSchedulePhaseRollups(tasks = []) {
  return groupTasks(tasks).map((group, index) => {
    const dated = group.items.filter(task => task.startDate || task.endDate)
    const startDates = dated.map(task => parseDate(task.startDate || task.endDate)).filter(Boolean)
    const endDates = dated.map(task => parseDate(task.endDate || task.startDate)).filter(Boolean)
    const startDate = startDates.length ? new Date(Math.min(...startDates.map(date => date.getTime()))) : null
    const endDate = endDates.length ? new Date(Math.max(...endDates.map(date => date.getTime()))) : null
    const complete = group.items.filter(task => smartStatus(task) === 'complete').length
    const delayed = group.items.filter(task => smartStatus(task) === 'delayed').length
    const blocked = group.items.filter(task => smartStatus(task) === 'blocked').length
    const pct = group.items.length ? Math.round((complete / group.items.length) * 100) : 0
    return {
      phase: group.phase,
      items: group.items,
      startDate: startDate ? formatInput(startDate) : '',
      endDate: endDate ? formatInput(endDate) : '',
      durationDays: startDate && endDate ? diffDays(startDate, endDate) + 1 : null,
      complete,
      delayed,
      blocked,
      pct,
      status: blocked ? 'blocked' : delayed ? 'delayed' : pct === 100 ? 'complete' : 'in-progress',
      tone: phaseTone(group.phase, index),
    }
  })
}

function parseBool(value) {
  return ['true', 'yes', 'y', '1', 'milestone'].includes(String(value || '').trim().toLowerCase())
}

function normaliseDate(value) {
  if (!value) return ''
  const text = String(value).trim()
  const nz = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (nz) return formatInput(new Date(Number(nz[3]), Number(nz[2]) - 1, Number(nz[1])))
  return formatInput(text)
}

function csvRowsToScheduleTasks(projectId, rows, existingCount = 0) {
  return rows
    .map((row, index) => {
      const lower = Object.fromEntries(Object.entries(row || {}).map(([key, value]) => [String(key).trim().toLowerCase(), value]))
      const name = lower.task || lower.name || lower['task name'] || lower.title || ''
      if (!String(name).trim()) return null
      const phase = lower.phase || lower.stage || lower.folder || 'Uncategorised'
      const startDate = normaliseDate(lower.start || lower['start date'] || lower.start_date)
      const endDate = normaliseDate(lower.finish || lower.end || lower['end date'] || lower.finish_date)
      const duration = Number(lower.duration || lower.days || lower['duration days'] || lower.duration_days || 1)
      const assignee = lower.assignee || lower['assigned to'] || lower.contractor || lower.contact || lower['project contact'] || ''
      return {
        projectId,
        name: String(name).trim(),
        phase: String(phase || 'Uncategorised').trim(),
        startDate,
        endDate,
        durationDays: duration > 0 ? duration : durationDays({ startDate, endDate }),
        status: lower.status || 'not-started',
        progress: Number(lower.progress || 0),
        isMilestone: parseBool(lower.milestone || lower.is_milestone || lower['is milestone']),
        assignee,
        internalOwner: lower.owner || lower['internal owner'] || lower['internal lead'] || '',
        notes: lower.notes || '',
        sortOrder: existingCount + index,
      }
    })
    .filter(Boolean)
}

function projectContactLabel(item, contacts, companies) {
  const person = contacts.find(contact => contact.id === item.contactId)
  const company = companies.find(company => company.id === item.companyId)
  return [person?.name, company?.name, item.projectRole || item.discipline].filter(Boolean).join(' / ') || 'Project contact'
}

function exportScheduleCsv(tasks, fileName = 'schedule.csv') {
  const csv = Papa.unparse(tasks.map(task => ({
    phase: task.phase,
    task_name: task.name,
    start_date: task.startDate,
    end_date: task.endDate,
    duration_days: durationDays(task),
    status: smartStatus(task),
    assignee: task.assignee || '',
    internal_owner: task.internalOwner || '',
    milestone: task.isMilestone ? 'yes' : '',
    notes: task.notes || '',
  })))
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

function pdfSafe(value) {
  return String(value || '')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncateText(value, max = 60) {
  const text = String(value || '').trim()
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function fileSafe(value) {
  return String(value || 'schedule')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'schedule'
}

function formatPdfDateTime(value = new Date()) {
  return value.toLocaleString('en-NZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusLabel(task) {
  return STATUS_MAP[smartStatus(task)]?.label || 'Not Started'
}

function buildSchedulePdf({ project, tasks, includeProject = false, title = 'Schedule' }) {
  const page = { width: 842, height: 595 }
  const margin = 34
  const grouped = groupTasks(tasks)
  const complete = tasks.filter(task => smartStatus(task) === 'complete').length
  const delayed = tasks.filter(task => smartStatus(task) === 'delayed').length
  const blocked = tasks.filter(task => smartStatus(task) === 'blocked').length
  const pct = tasks.length ? Math.round((complete / tasks.length) * 100) : 0
  const dates = tasks.flatMap(task => [parseDate(task.startDate), parseDate(task.endDate)]).filter(Boolean).sort((a, b) => a - b)
  const dateRange = dates.length ? `${formatShort(dates[0])} - ${formatShort(dates[dates.length - 1])}` : 'No dates set'
  const columns = includeProject
    ? [
        { key: 'projectName', label: 'Project', width: 102, max: 24 },
        { key: 'name', label: 'Task', width: 270, max: 54 },
        { key: 'startDate', label: 'Start', width: 64, max: 12 },
        { key: 'endDate', label: 'Finish', width: 64, max: 12 },
        { key: 'days', label: 'Days', width: 42, max: 5 },
        { key: 'assignee', label: 'Assignee', width: 130, max: 28 },
        { key: 'status', label: 'Status', width: 78, max: 18 },
      ]
    : [
        { key: 'name', label: 'Task', width: 356, max: 72 },
        { key: 'startDate', label: 'Start', width: 70, max: 12 },
        { key: 'endDate', label: 'Finish', width: 70, max: 12 },
        { key: 'days', label: 'Days', width: 44, max: 5 },
        { key: 'assignee', label: 'Assignee', width: 156, max: 34 },
        { key: 'status', label: 'Status', width: 80, max: 18 },
      ]
  const actualTableWidth = columns.reduce((sum, column) => sum + column.width, 0)
  const pages = []
  let ops = []
  let y = margin

  const rgb = (values = [0, 0, 0]) => values.map(value => Number(value).toFixed(3)).join(' ')
  const rect = (x, yTop, width, height, fill) => {
    ops.push(`q ${rgb(fill)} rg ${x.toFixed(2)} ${(page.height - yTop - height).toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f Q`)
  }
  const stroke = (x1, y1, x2, y2, color = [0.86, 0.88, 0.91], width = 0.5) => {
    ops.push(`q ${rgb(color)} RG ${width} w ${x1.toFixed(2)} ${(page.height - y1).toFixed(2)} m ${x2.toFixed(2)} ${(page.height - y2).toFixed(2)} l S Q`)
  }
  const text = (x, yTop, value, size = 9, color = [0.12, 0.16, 0.23], font = 'F1') => {
    ops.push(`BT /${font} ${size} Tf ${rgb(color)} rg ${x.toFixed(2)} ${(page.height - yTop).toFixed(2)} Td (${pdfSafe(value)}) Tj ET`)
  }
  const addPage = () => {
    pages.push(ops.join('\n'))
    ops = []
    y = margin
    drawHeader(false)
    drawTableHeader()
  }
  const ensureSpace = height => {
    if (y + height > page.height - margin) addPage()
  }
  const drawHeader = (firstPage = true) => {
    text(margin, y, project?.name || title, firstPage ? 18 : 13, [0.06, 0.09, 0.16], 'F2')
    text(page.width - margin - 150, y, `Generated ${formatPdfDateTime()}`, 8, [0.43, 0.47, 0.55])
    y += firstPage ? 18 : 16
    if (firstPage) {
      const details = [
        project?.address ? `Address: ${project.address}` : '',
        project?.status ? `Status: ${project.status}` : '',
        project?.currentStage ? `Primary stage: ${project.currentStage}` : '',
        project?.startDate ? `Start: ${formatShort(project.startDate)}` : '',
        project?.targetCompletion ? `Target: ${formatShort(project.targetCompletion)}` : '',
      ].filter(Boolean)
      details.forEach(item => {
        text(margin, y, item, 8.5, [0.37, 0.41, 0.49])
        y += 12
      })
      if (project?.buildingWorkDescription || project?.description) {
        text(margin, y, `Scope: ${truncateText(project.buildingWorkDescription || project.description, 130)}`, 8.5, [0.37, 0.41, 0.49])
        y += 12
      }
      y += 5
      const metricWidth = 92
      const metrics = [
        ['Tasks', tasks.length],
        ['Complete', complete],
        ['Delayed', delayed],
        ['Blocked', blocked],
        ['Done', `${pct}%`],
        ['Date range', dateRange],
      ]
      metrics.forEach((item, index) => {
        const width = index === metrics.length - 1 ? 186 : metricWidth
        const x = margin + metrics.slice(0, index).reduce((sum, current, currentIndex) => sum + (currentIndex === metrics.length - 1 ? 186 : metricWidth) + 8, 0)
        rect(x, y, width, 34, [0.96, 0.97, 0.96])
        text(x + 8, y + 12, item[0], 7.5, [0.55, 0.59, 0.66], 'F2')
        text(x + 8, y + 26, item[1], 10, [0.06, 0.09, 0.16], 'F2')
      })
      y += 48
    }
    stroke(margin, y - 4, page.width - margin, y - 4, [0.82, 0.85, 0.88], 0.6)
  }
  const drawTableHeader = () => {
    rect(margin, y, actualTableWidth, 22, [0.95, 0.96, 0.97])
    let x = margin
    columns.forEach(column => {
      text(x + 6, y + 14, column.label, 7.5, [0.43, 0.47, 0.55], 'F2')
      x += column.width
    })
    y += 22
  }
  const valueFor = (task, key) => {
    if (key === 'startDate') return formatShort(task.startDate) || '-'
    if (key === 'endDate') return formatShort(task.endDate) || '-'
    if (key === 'days') return durationDays(task) ? `${durationDays(task)}d` : '-'
    if (key === 'status') return statusLabel(task)
    return task[key] || '-'
  }

  drawHeader(true)
  drawTableHeader()

  grouped.forEach(group => {
    ensureSpace(44)
    const completeInGroup = group.items.filter(task => smartStatus(task) === 'complete').length
    const groupPct = group.items.length ? Math.round((completeInGroup / group.items.length) * 100) : 0
    rect(margin, y, actualTableWidth, 20, [0.91, 0.95, 0.91])
    text(margin + 6, y + 13, `${group.phase}  ${completeInGroup}/${group.items.length} complete  ${groupPct}%`, 8.5, [0.20, 0.29, 0.17], 'F2')
    y += 20
    group.items.forEach(task => {
      ensureSpace(18)
      let x = margin
      columns.forEach(column => {
        const raw = valueFor(task, column.key)
        const color = column.key === 'status'
          ? smartStatus(task) === 'complete' ? [0.04, 0.42, 0.23] : smartStatus(task) === 'delayed' || smartStatus(task) === 'blocked' ? [0.72, 0.10, 0.10] : [0.25, 0.29, 0.35]
          : [0.17, 0.21, 0.27]
        text(x + 6, y + 12, truncateText(raw, column.max), 7.8, color, column.key === 'name' ? 'F2' : 'F1')
        x += column.width
      })
      stroke(margin, y + 18, margin + actualTableWidth, y + 18, [0.89, 0.91, 0.93], 0.4)
      y += 18
    })
  })
  if (!tasks.length) text(margin + 6, y + 18, 'No schedule tasks found.', 9, [0.43, 0.47, 0.55])
  pages.push(ops.join('\n'))

  const objects = ['', '', '', '']
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'
  const pageIds = []
  pages.forEach(content => {
    const contentId = objects.length
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
    const pageId = objects.length
    pageIds.push(pageId)
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`)
  })
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`
  const encoder = new TextEncoder()
  const byteLength = value => encoder.encode(value).length
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (let i = 1; i < objects.length; i += 1) {
    offsets[i] = byteLength(pdf)
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`
  }
  const xrefOffset = byteLength(pdf)
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`
  for (let i = 1; i < objects.length; i += 1) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return new Blob([pdf], { type: 'application/pdf' })
}

function exportSchedulePdf({ project, tasks, includeProject = false, title = 'Schedule' }) {
  const blob = buildSchedulePdf({ project, tasks, includeProject, title })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const name = project?.name || title
  link.href = url
  link.download = `${fileSafe(name)}-schedule.pdf`
  link.click()
  URL.revokeObjectURL(url)
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
  const { addScheduleTask, projectContacts, contacts, companies, teamMembers, currentUser } = useStore()
  const [form, setForm] = useState({
    name: '',
    phase: phaseOptions[0] || 'Project Commencement',
    startDate: '',
    endDate: '',
    assignee: '',
    projectContactId: '',
    status: 'not-started',
  })
  const projectContactOptions = projectContacts.filter(item => item.projectId === projectId)
  const teamOptions = [...new Set([currentUser, ...teamMembers.map(member => member.name)].filter(Boolean))]

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const setAssigneeTarget = value => {
    if (!value) {
      setForm(current => ({ ...current, assignee: '', projectContactId: '' }))
      return
    }
    if (value.startsWith('pc:')) {
      const id = value.slice(3)
      const item = projectContactOptions.find(option => option.id === id)
      setForm(current => ({ ...current, projectContactId: id, assignee: item ? projectContactLabel(item, contacts, companies) : '' }))
      return
    }
    setForm(current => ({ ...current, assignee: value.slice(5), projectContactId: '' }))
  }

  const save = async () => {
    if (!form.name.trim()) return
    await addScheduleTask({
      projectId,
      name: form.name.trim(),
      phase: form.phase.trim() || 'Uncategorised',
      startDate: form.startDate,
      endDate: form.endDate,
      durationDays: durationDays(form),
      assignee: form.assignee,
      projectContactId: form.projectContactId,
      status: form.status,
      progress: form.status === 'complete' ? 100 : 0,
    })
    onClose()
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-gray-800">New schedule task</div>
      <div className="grid gap-3 md:grid-cols-[1fr_190px_150px_150px_180px_140px]">
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
        <select className="h-9 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-ocean-400" value={form.projectContactId ? `pc:${form.projectContactId}` : form.assignee ? `team:${form.assignee}` : ''} onChange={e => setAssigneeTarget(e.target.value)}>
          <option value="">Unassigned</option>
          {teamOptions.map(name => <option key={`team:${name}`} value={`team:${name}`}>{name}</option>)}
          {projectContactOptions.map(item => <option key={`pc:${item.id}`} value={`pc:${item.id}`}>{projectContactLabel(item, contacts, companies)}</option>)}
        </select>
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

function TaskEditDrawer({ task, phaseOptions, onClose }) {
  const { updateScheduleTask, deleteScheduleTask, projectContacts, contacts, companies } = useStore()
  const contactLabel = item => projectContactLabel(item, contacts, companies)
  const availableProjectContacts = projectContacts.filter(item => item.projectId === task.projectId)
  const [form, setForm] = useState({
    name: task.name || '',
    phase: task.phase || '',
    assignee: task.assignee || '',
    internalOwner: task.internalOwner || '',
    projectContactId: task.projectContactId || '',
    startDate: formatInput(task.startDate),
    endDate: formatInput(task.endDate),
    status: task.status || 'not-started',
    progress: task.progress ?? 0,
    isMilestone: Boolean(task.isMilestone),
    notes: task.notes || '',
  })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))

  const save = async () => {
    if (!form.name.trim()) return
    await updateScheduleTask(task.id, {
      ...form,
      name: form.name.trim(),
      phase: form.phase.trim() || 'Uncategorised',
      durationDays: durationDays(form),
      progress: Number(form.progress || 0),
    })
    onClose()
  }

  const remove = async () => {
    await deleteScheduleTask(task.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Edit schedule task</h3>
            <p className="text-xs text-gray-400">Dates, owner, milestone and programme notes.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-700"><X size={16} /></button>
        </div>
        <div className="space-y-4 px-5 py-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Task name</label>
            <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-ocean-400" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Stage / phase</label>
            <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-ocean-400" list="drawer-schedule-phases" value={form.phase} onChange={e => set('phase', e.target.value)} />
            <datalist id="drawer-schedule-phases">
              {phaseOptions.map(phase => <option key={phase} value={phase} />)}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Start</label>
              <input type="date" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-ocean-400" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Finish</label>
              <input type="date" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-ocean-400" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Status</label>
              <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-ocean-400" value={form.status} onChange={e => set('status', e.target.value)}>
                {SELECTABLE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Progress %</label>
              <input type="number" min="0" max="100" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-ocean-400" value={form.progress} onChange={e => set('progress', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Assignee</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-ocean-400" value={form.assignee} onChange={e => set('assignee', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Internal owner</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-ocean-400" value={form.internalOwner} onChange={e => set('internalOwner', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Project contact / contractor</label>
            <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-ocean-400" value={form.projectContactId} onChange={e => set('projectContactId', e.target.value)}>
              <option value="">No project contact</option>
              {availableProjectContacts.map(item => <option key={item.id} value={item.id}>{contactLabel(item)}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.isMilestone} onChange={e => set('isMilestone', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-forest-600 focus:ring-forest-500" />
            Show on global milestone calendar
          </label>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Notes</label>
            <textarea className="min-h-[100px] w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-ocean-400" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <div className="sticky bottom-0 flex items-center justify-between border-t border-gray-100 bg-white px-5 py-4">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <button onClick={remove} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700">Delete</button>
              <button onClick={() => setConfirmDelete(false)} className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-50">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
              <Trash2 size={14} /> Delete
            </button>
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-50">Cancel</button>
            <button onClick={save} disabled={!form.name.trim()} className="rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-700 disabled:opacity-50">Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TaskListView({ projectId, projectStartDate, project = null, tasks, showProject = false, exportTitle = 'Schedule' }) {
  const {
    updateScheduleTask,
    deleteScheduleTask,
    updateBatchScheduleTasks,
    deleteBatchScheduleTasks,
    addBatchScheduleTasks,
    addScheduleTemplate,
    scheduleTemplates,
    scheduleTemplateItems,
    projectContacts,
    contacts,
    companies,
    teamMembers,
    currentUser,
  } = useStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stageFilter, setStageFilter] = useState('all')
  const [collapsed, setCollapsed] = useState(new Set())
  const [showNewTask, setShowNewTask] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [bulk, setBulk] = useState({ status: '', phase: '', assignee: '', internalOwner: '', projectContactId: '', shiftDays: '', milestone: '' })
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [csvImport, setCsvImport] = useState(null)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [templateMode, setTemplateMode] = useState('missing')
  const [selectedTemplateIds, setSelectedTemplateIds] = useState([])
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateScope, setTemplateScope] = useState('selected')

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
  const selectedIds = [...selected].filter(id => tasks.some(task => task.id === id))
  const visibleIds = filtered.map(task => task.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selected.has(id))
  const availableTemplates = scheduleTemplates.length
    ? scheduleTemplates
    : [{ id: 'archispace-standard-development-programme', name: 'Archispace Standard Development Programme', isDefault: true }]
  const activeTemplateIds = selectedTemplateIds.length
    ? selectedTemplateIds
    : [availableTemplates.find(t => t.isDefault)?.id || availableTemplates[0]?.id].filter(Boolean)
  const availableProjectContacts = projectContacts.filter(item => item.projectId === projectId)
  const contactLabel = item => projectContactLabel(item, contacts, companies)
  const teamAssignees = useMemo(() => {
    const names = new Set([currentUser, ...teamMembers.map(member => member.name), ...tasks.filter(task => !task.projectContactId).map(task => task.assignee)].filter(Boolean))
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [currentUser, teamMembers, tasks])
  const assigneeValue = task => task.projectContactId ? `pc:${task.projectContactId}` : task.assignee ? `team:${task.assignee}` : ''
  const updateAssignee = async (task, value) => {
    if (!value) {
      await updateScheduleTask(task.id, { assignee: '', projectContactId: '' })
      return
    }
    if (value.startsWith('pc:')) {
      const id = value.slice(3)
      const item = availableProjectContacts.find(option => option.id === id)
      await updateScheduleTask(task.id, { projectContactId: id, assignee: item ? contactLabel(item) : task.assignee || '' })
      return
    }
    await updateScheduleTask(task.id, { projectContactId: '', assignee: value.slice(5) })
  }

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

  const toggleSelected = taskId => {
    setSelected(current => {
      const next = new Set(current)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  const toggleAllVisible = () => {
    setSelected(current => {
      const next = new Set(current)
      if (allVisibleSelected) visibleIds.forEach(id => next.delete(id))
      else visibleIds.forEach(id => next.add(id))
      return next
    })
  }

  const applyBulk = async () => {
    const payload = {}
    if (bulk.status) {
      payload.status = bulk.status
      if (bulk.status === 'complete') payload.progress = 100
      if (bulk.status === 'not-started') payload.progress = 0
    }
    if (bulk.phase.trim()) payload.phase = bulk.phase.trim()
    if (bulk.assignee.trim()) payload.assignee = bulk.assignee.trim()
    if (bulk.internalOwner.trim()) payload.internalOwner = bulk.internalOwner.trim()
    if (bulk.projectContactId) payload.projectContactId = bulk.projectContactId
    if (bulk.milestone) payload.isMilestone = bulk.milestone === 'yes'
    if (bulk.shiftDays) payload.shiftDays = Number(bulk.shiftDays)
    if (!Object.keys(payload).length) return
    await updateBatchScheduleTasks(selectedIds, payload)
    setBulk({ status: '', phase: '', assignee: '', internalOwner: '', projectContactId: '', shiftDays: '', milestone: '' })
    setSelected(new Set())
  }

  const removeSelected = async () => {
    await deleteBatchScheduleTasks(selectedIds)
    setSelected(new Set())
    setConfirmBulkDelete(false)
  }

  const handleCsvFile = file => {
    if (!file || !projectId) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: result => {
        const rows = result.data || []
        setCsvImport({ rows, tasks: csvRowsToScheduleTasks(projectId, rows, tasks.length) })
      },
    })
  }

  const applyCsvImport = async () => {
    if (!csvImport?.tasks?.length) return
    await addBatchScheduleTasks(csvImport.tasks)
    setCsvImport(null)
  }

  const applyTemplate = async () => {
    if (!projectId) return
    const generated = activeTemplateIds.flatMap(templateId => {
      const selectedTemplateItems = scheduleTemplateItems.filter(item => item.templateId === templateId)
      if (!selectedTemplateItems.length && templateId !== 'archispace-standard-development-programme') return []
      return buildScheduleTasksFromTemplateItems(projectId, projectStartDate || tasks[0]?.startDate || new Date(), selectedTemplateItems)
    })
    const existingKeys = new Set(tasks.map(task => `${String(task.phase || '').toLowerCase()}::${String(task.name || '').toLowerCase()}`))
    const generatedKeys = new Set()
    const uniqueGenerated = generated.filter(task => {
      const key = `${String(task.phase || '').toLowerCase()}::${String(task.name || '').toLowerCase()}`
      if (generatedKeys.has(key)) return false
      generatedKeys.add(key)
      return true
    })
    const toAdd = templateMode === 'replace'
      ? uniqueGenerated
      : uniqueGenerated.filter(task => !existingKeys.has(`${String(task.phase || '').toLowerCase()}::${String(task.name || '').toLowerCase()}`))
    if (templateMode === 'replace') {
      const ok = window.confirm('Replace the current project schedule with the selected template set? This deletes existing schedule rows for this project.')
      if (!ok) return
      await deleteBatchScheduleTasks(tasks.map(task => task.id))
    }
    if (toAdd.length) await addBatchScheduleTasks(toAdd)
    setTemplateOpen(false)
  }

  const toggleTemplateSelection = templateId => {
    setSelectedTemplateIds(current => {
      const next = new Set(current)
      if (next.has(templateId)) next.delete(templateId)
      else next.add(templateId)
      return [...next]
    })
  }

  const sourceTasksForTemplate = () => {
    if (templateScope === 'selected' && selectedIds.length) return tasks.filter(task => selectedIds.includes(task.id))
    if (templateScope === 'visible') return filtered
    return tasks
  }

  const saveTemplate = async () => {
    const sourceTasks = sourceTasksForTemplate()
    if (!sourceTasks.length) return
    const name = templateName.trim() || `${project?.name || 'Project'} schedule template`
    const result = await addScheduleTemplate({
      name,
      description: `${sourceTasks.length} rows saved from ${project?.name || 'project schedule'}.`,
      tasks: sourceTasks,
    })
    if (result?.template?.id) setSelectedTemplateIds([result.template.id])
    setTemplateName('')
    setTemplateScope('selected')
    setSaveTemplateOpen(false)
    setSelected(new Set())
  }

  const tableCols = showProject
    ? 'grid-cols-[42px_minmax(280px,1fr)_140px_132px_132px_70px_170px_150px_48px]'
    : 'grid-cols-[42px_minmax(300px,1fr)_132px_132px_70px_170px_150px_48px]'

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
          <>
            <button onClick={() => setTemplateOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <FileSpreadsheet size={14} /> Template
            </button>
            <button onClick={() => setSaveTemplateOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Save size={14} /> Save template
            </button>
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Upload size={14} /> Import CSV
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => handleCsvFile(e.target.files?.[0])} />
            </label>
            <button onClick={() => exportScheduleCsv(tasks, `${fileSafe(project?.name || exportTitle)}-schedule.csv`)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Download size={14} /> CSV
            </button>
            <button onClick={() => exportSchedulePdf({ project, tasks: filtered, includeProject: showProject, title: exportTitle })} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <FileText size={14} /> PDF
            </button>
            <button onClick={() => setShowNewTask(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-forest-600 px-3 text-sm font-medium text-white hover:bg-forest-700">
              <Plus size={14} /> Add Task
            </button>
          </>
        )}
        <button onClick={() => setCollapsed(new Set())} className="h-8 rounded-md px-2 text-xs text-gray-600 hover:bg-gray-50">Expand All</button>
        <button onClick={() => setCollapsed(new Set(grouped.map(g => g.phase)))} className="h-8 rounded-md px-2 text-xs text-gray-600 hover:bg-gray-50">Collapse All</button>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-forest-100 bg-forest-50/60 p-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest-800"><CheckSquare size={14} /> {selectedIds.length} selected</span>
          <select className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs outline-none focus:border-ocean-400" value={bulk.status} onChange={e => setBulk(current => ({ ...current, status: e.target.value }))}>
            <option value="">Status</option>
            {SELECTABLE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <input className="h-8 w-36 rounded-md border border-gray-200 bg-white px-2 text-xs outline-none focus:border-ocean-400" placeholder="Stage / phase" list="bulk-schedule-phases" value={bulk.phase} onChange={e => setBulk(current => ({ ...current, phase: e.target.value }))} />
          <datalist id="bulk-schedule-phases">{phases.map(phase => <option key={phase} value={phase} />)}</datalist>
          <input className="h-8 w-32 rounded-md border border-gray-200 bg-white px-2 text-xs outline-none focus:border-ocean-400" placeholder="Assignee" value={bulk.assignee} onChange={e => setBulk(current => ({ ...current, assignee: e.target.value }))} />
          <input className="h-8 w-32 rounded-md border border-gray-200 bg-white px-2 text-xs outline-none focus:border-ocean-400" placeholder="Owner" value={bulk.internalOwner} onChange={e => setBulk(current => ({ ...current, internalOwner: e.target.value }))} />
          <select className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs outline-none focus:border-ocean-400" value={bulk.projectContactId} onChange={e => setBulk(current => ({ ...current, projectContactId: e.target.value }))}>
            <option value="">Project contact</option>
            {availableProjectContacts.map(item => <option key={item.id} value={item.id}>{contactLabel(item)}</option>)}
          </select>
          <input type="number" className="h-8 w-24 rounded-md border border-gray-200 bg-white px-2 text-xs outline-none focus:border-ocean-400" placeholder="Shift days" value={bulk.shiftDays} onChange={e => setBulk(current => ({ ...current, shiftDays: e.target.value }))} />
          <select className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs outline-none focus:border-ocean-400" value={bulk.milestone} onChange={e => setBulk(current => ({ ...current, milestone: e.target.value }))}>
            <option value="">Milestone</option>
            <option value="yes">Mark milestone</option>
            <option value="no">Unmark milestone</option>
          </select>
          <button onClick={applyBulk} className="h-8 rounded-md bg-forest-600 px-3 text-xs font-semibold text-white hover:bg-forest-700">Apply</button>
          {confirmBulkDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={removeSelected} className="h-8 rounded-md bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700">Delete</button>
              <button onClick={() => setConfirmBulkDelete(false)} className="h-8 rounded-md px-2 text-xs text-gray-500 hover:bg-white">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setConfirmBulkDelete(true)} className="h-8 rounded-md px-3 text-xs font-semibold text-red-600 hover:bg-red-50">Delete selected</button>
          )}
        </div>
      )}

      {templateOpen && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-800">Apply schedule template</div>
              <div className="text-xs text-gray-400">Default is add missing tasks only using stage plus task name.</div>
            </div>
            <button onClick={() => setTemplateOpen(false)} className="rounded-md p-1 text-gray-400 hover:bg-gray-50"><X size={15} /></button>
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
            <div className="max-h-44 overflow-auto rounded-lg border border-gray-200 bg-gray-50/60 p-2">
              {availableTemplates.map(template => {
                const checked = activeTemplateIds.includes(template.id)
                return (
                  <label key={template.id} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-sm hover:bg-white">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTemplateSelection(template.id)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-forest-600 focus:ring-forest-500"
                    />
                    <span>
                      <span className="block font-medium text-gray-800">{template.name}</span>
                      {template.description && <span className="mt-0.5 block text-xs text-gray-400">{template.description}</span>}
                    </span>
                  </label>
                )
              })}
            </div>
            <select className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-ocean-400" value={templateMode} onChange={e => setTemplateMode(e.target.value)}>
              <option value="missing">Add missing tasks only</option>
              <option value="replace">Replace current schedule</option>
            </select>
            <button onClick={applyTemplate} disabled={!activeTemplateIds.length} className="h-9 rounded-lg bg-forest-600 px-4 text-sm font-semibold text-white hover:bg-forest-700 disabled:opacity-50">Apply</button>
          </div>
        </div>
      )}

      {saveTemplateOpen && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-800">Save schedule template</div>
              <div className="text-xs text-gray-400">Save selected rows, filtered rows, or the full schedule for reuse on another project.</div>
            </div>
            <button onClick={() => setSaveTemplateOpen(false)} className="rounded-md p-1 text-gray-400 hover:bg-gray-50"><X size={15} /></button>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <input
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-ocean-400"
              placeholder="Template name, e.g. Preconstruction approvals"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
            />
            <select className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-ocean-400" value={templateScope} onChange={e => setTemplateScope(e.target.value)}>
              <option value="selected">Selected rows ({selectedIds.length || 'none'})</option>
              <option value="visible">Current filtered view ({filtered.length})</option>
              <option value="all">Whole project schedule ({tasks.length})</option>
            </select>
            <button onClick={saveTemplate} disabled={!sourceTasksForTemplate().length} className="h-9 rounded-lg bg-forest-600 px-4 text-sm font-semibold text-white hover:bg-forest-700 disabled:opacity-50">Save</button>
          </div>
        </div>
      )}

      {csvImport && (
        <div className="rounded-xl border border-ocean-100 bg-ocean-50/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-800">CSV import preview</div>
              <div className="text-xs text-gray-500">{csvImport.tasks.length} usable task rows found. Useful headers: phase/stage, task/name, start, finish, duration, assignee, contractor, milestone, owner, notes.</div>
            </div>
            <button onClick={() => setCsvImport(null)} className="rounded-md p-1 text-gray-400 hover:bg-white"><X size={15} /></button>
          </div>
          <div className="mb-3 max-h-48 overflow-auto rounded-lg border border-ocean-100 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr><th className="px-3 py-2 text-left">Phase</th><th className="px-3 py-2 text-left">Task</th><th className="px-3 py-2 text-left">Assignee</th><th className="px-3 py-2 text-left">Start</th><th className="px-3 py-2 text-left">Finish</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {csvImport.tasks.slice(0, 8).map((task, index) => (
                  <tr key={`${task.name}-${index}`}>
                    <td className="px-3 py-2">{task.phase}</td>
                    <td className="px-3 py-2">{task.name}</td>
                    <td className="px-3 py-2">{task.assignee || '-'}</td>
                    <td className="px-3 py-2">{task.startDate || '-'}</td>
                    <td className="px-3 py-2">{task.endDate || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={applyCsvImport} disabled={!csvImport.tasks.length} className="rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-700 disabled:opacity-50">Import schedule rows</button>
        </div>
      )}

      {showNewTask && projectId && <TaskForm projectId={projectId} phaseOptions={phases} onClose={() => setShowNewTask(false)} />}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className={`grid ${tableCols} border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500`}>
          <div className="px-3 py-3">
            <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} className="h-4 w-4 rounded border-gray-300 text-forest-600 focus:ring-forest-500" />
          </div>
          <div className="px-5 py-3">Task</div>
          {showProject && <div className="px-3 py-3">Project</div>}
          <div className="px-3 py-3">Start</div>
          <div className="px-3 py-3">Finish</div>
          <div className="px-3 py-3">Days</div>
          <div className="px-3 py-3">Assignee</div>
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
                    <div className="px-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(task.id)} onChange={() => toggleSelected(task.id)} className="h-4 w-4 rounded border-gray-300 text-forest-600 focus:ring-forest-500" />
                    </div>
                    <div className="min-w-0 px-5 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        {task.isMilestone && <Diamond size={12} className="shrink-0 fill-forest-600 text-forest-600" />}
                        <button
                          onClick={() => setEditTask(task)}
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
                    <div className="px-2">
                      <select
                        className="h-7 w-full truncate rounded-md border border-transparent bg-gray-50 px-2 text-xs text-gray-700 outline-none hover:border-gray-200 focus:border-ocean-400 focus:bg-white"
                        value={assigneeValue(task)}
                        onChange={event => updateAssignee(task, event.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {teamAssignees.map(name => <option key={`team:${name}`} value={`team:${name}`}>{name}</option>)}
                        {availableProjectContacts.map(item => <option key={`pc:${item.id}`} value={`pc:${item.id}`}>{contactLabel(item)}</option>)}
                      </select>
                    </div>
                    <div className="px-2"><StatusSelect task={task} onChange={updateStatus} /></div>
                    <div className="px-2 text-right">
                      {confirmDelete === task.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { deleteScheduleTask(task.id); setConfirmDelete(null) }} className="rounded px-1.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Yes</button>
                          <button onClick={() => setConfirmDelete(null)} className="rounded px-1.5 py-1 text-xs text-gray-400 hover:bg-gray-50">No</button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100">
                          <button onClick={() => setEditTask(task)} className="rounded px-1.5 py-1 text-gray-400 hover:bg-gray-50 hover:text-gray-700"><Edit3 size={13} /></button>
                          <button onClick={() => setConfirmDelete(task.id)} className="rounded px-1.5 py-1 text-gray-300 hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
      {editTask && <TaskEditDrawer task={editTask} phaseOptions={phases} onClose={() => setEditTask(null)} />}
    </div>
  )
}

function GanttView({ projectId, projectStartDate, project = null, tasks, exportTitle = 'Schedule' }) {
  const {
    updateScheduleTask,
    deleteScheduleTask,
    deleteBatchScheduleTasks,
    addBatchScheduleTasks,
    addScheduleTemplate,
    scheduleTemplates,
    scheduleTemplateItems,
    projectContacts,
    contacts,
    companies,
    teamMembers,
    currentUser,
  } = useStore()
  const SCALE_OPTIONS = {
    days: { label: 'Days', baseColW: 28 },
    weeks: { label: 'Weeks', baseColW: 15 },
    months: { label: 'Months', baseColW: 7 },
  }
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stageFilter, setStageFilter] = useState('all')
  const [scale, setScale] = useState('weeks')
  const [zoom, setZoom] = useState(48)
  const [collapsed, setCollapsed] = useState(new Set())
  const [selected, setSelected] = useState(new Set())
  const [showNewTask, setShowNewTask] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [csvImport, setCsvImport] = useState(null)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [templateMode, setTemplateMode] = useState('missing')
  const [selectedTemplateIds, setSelectedTemplateIds] = useState([])
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateScope, setTemplateScope] = useState('selected')
  const scrollRef = useRef(null)

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

  const datedTasks = filtered.filter(t => t.startDate || t.endDate)
  const rollups = useMemo(() => getSchedulePhaseRollups(datedTasks).filter(group => group.startDate || group.endDate), [datedTasks])
  const allDates = datedTasks.flatMap(t => [parseDate(t.startDate), parseDate(t.endDate)]).filter(Boolean)
  const minDate = allDates.length ? addDays(new Date(Math.min(...allDates.map(d => d.getTime()))), -10) : addDays(new Date(), -14)
  const maxDate = allDates.length ? addDays(new Date(Math.max(...allDates.map(d => d.getTime()))), 21) : addDays(new Date(), 60)
  const totalDays = Math.max(30, diffDays(minDate, maxDate) + 1)
  const zoomFactor = 0.72 + (zoom / 100) * 1.35
  const colW = Math.max(5, Math.round(SCALE_OPTIONS[scale].baseColW * zoomFactor))
  const leftW = 980
  const timelineWidth = Math.max(900, totalDays * colW)
  const stageRowH = 46
  const taskRowH = 42
  const headerH = 58
  const todayOffset = diffDays(minDate, today())
  const selectedIds = [...selected].filter(id => filtered.some(task => task.id === id))
  const visibleIds = filtered.map(task => task.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selected.has(id))
  const availableTemplates = scheduleTemplates.length
    ? scheduleTemplates
    : [{ id: 'archispace-standard-development-programme', name: 'Archispace Standard Development Programme', isDefault: true }]
  const activeTemplateIds = selectedTemplateIds.length
    ? selectedTemplateIds
    : [availableTemplates.find(t => t.isDefault)?.id || availableTemplates[0]?.id].filter(Boolean)
  const availableProjectContacts = projectContacts.filter(item => item.projectId === projectId)
  const contactLabel = item => projectContactLabel(item, contacts, companies)
  const teamAssignees = useMemo(() => {
    const names = new Set([currentUser, ...teamMembers.map(member => member.name), ...tasks.filter(task => !task.projectContactId).map(task => task.assignee)].filter(Boolean))
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [currentUser, teamMembers, tasks])
  const assigneeValue = task => task.projectContactId ? `pc:${task.projectContactId}` : task.assignee ? `team:${task.assignee}` : ''

  const rows = useMemo(() => {
    const result = []
    rollups.forEach(rollup => {
      result.push({ type: 'phase', rollup })
      if (!collapsed.has(rollup.phase)) {
        rollup.items
          .filter(task => task.startDate || task.endDate)
          .forEach(task => result.push({ type: 'task', task, rollup }))
      }
    })
    return result
  }, [rollups, collapsed])

  const dates = useMemo(() => {
    const list = []
    for (let i = 0; i <= totalDays; i += 1) list.push(addDays(minDate, i))
    return list
  }, [minDate.getTime(), totalDays])

  const gridMarks = useMemo(() => dates.map((date, index) => {
    const firstOfMonth = date.getDate() === 1
    const monday = date.getDay() === 1
    if (scale === 'days') return { date, index, strong: firstOfMonth || monday }
    if (scale === 'weeks' && (monday || firstOfMonth)) return { date, index, strong: firstOfMonth }
    if (scale === 'months' && firstOfMonth) return { date, index, strong: true }
    return null
  }).filter(Boolean), [dates, scale])

  const dateLabels = useMemo(() => dates.map((date, index) => {
    const firstOfMonth = date.getDate() === 1
    const monday = date.getDay() === 1
    if (scale === 'days') {
      return { index, major: firstOfMonth, label: String(date.getDate()).padStart(2, '0') }
    }
    if (scale === 'weeks' && (monday || firstOfMonth)) {
      return { index, major: firstOfMonth, label: firstOfMonth ? `${formatMonth(date)} ${date.getDate()}` : String(date.getDate()).padStart(2, '0') }
    }
    if (scale === 'months' && firstOfMonth) {
      return { index, major: true, label: date.toLocaleDateString('en-NZ', { month: 'short', year: '2-digit' }) }
    }
    return null
  }).filter(Boolean), [dates, scale])

  const monthLabels = useMemo(() => {
    const labels = []
    let currentKey = ''
    dates.forEach((date, index) => {
      const key = `${date.getFullYear()}-${date.getMonth()}`
      if (key === currentKey) return
      currentKey = key
      const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1)
      const endIndex = Math.min(totalDays, diffDays(minDate, nextMonth))
      labels.push({
        key,
        left: index * colW,
        width: Math.max(colW, (endIndex - index) * colW),
        label: date.toLocaleDateString('en-NZ', { month: 'short', year: 'numeric' }),
      })
    })
    return labels
  }, [dates, minDate.getTime(), totalDays, colW])

  useEffect(() => {
    if (scrollRef.current && todayOffset > 0) {
      scrollRef.current.scrollLeft = Math.max(0, leftW + todayOffset * colW - scrollRef.current.clientWidth / 3)
    }
  }, [todayOffset, colW])

  const togglePhase = phase => {
    setCollapsed(current => {
      const next = new Set(current)
      if (next.has(phase)) next.delete(phase)
      else next.add(phase)
      return next
    })
  }

  const scrollToToday = () => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTo({ left: Math.max(0, leftW + todayOffset * colW - scrollRef.current.clientWidth / 3), behavior: 'smooth' })
  }

  const barForRange = (startValue, endValue, minimumWidth = colW) => {
    const start = parseDate(startValue || endValue)
    const end = parseDate(endValue || startValue)
    if (!start || !end) return null
    return {
      left: Math.max(0, diffDays(minDate, start) * colW),
      width: Math.max(minimumWidth, (diffDays(start, end) + 1) * colW),
      endLeft: Math.max(0, diffDays(minDate, end) * colW),
    }
  }

  const updateAssignee = async (task, value) => {
    if (!value) {
      await updateScheduleTask(task.id, { assignee: '', projectContactId: '' })
      return
    }
    if (value.startsWith('pc:')) {
      const id = value.slice(3)
      const item = availableProjectContacts.find(option => option.id === id)
      await updateScheduleTask(task.id, { projectContactId: id, assignee: item ? contactLabel(item) : task.assignee || '' })
      return
    }
    await updateScheduleTask(task.id, { projectContactId: '', assignee: value.slice(5) })
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

  const toggleSelected = taskId => {
    setSelected(current => {
      const next = new Set(current)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  const toggleAllVisible = () => {
    setSelected(current => {
      const next = new Set(current)
      if (allVisibleSelected) visibleIds.forEach(id => next.delete(id))
      else visibleIds.forEach(id => next.add(id))
      return next
    })
  }

  const handleCsvFile = file => {
    if (!file || !projectId) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: result => {
        const rows = result.data || []
        setCsvImport({ rows, tasks: csvRowsToScheduleTasks(projectId, rows, tasks.length) })
      },
    })
  }

  const applyCsvImport = async () => {
    if (!csvImport?.tasks?.length) return
    await addBatchScheduleTasks(csvImport.tasks)
    setCsvImport(null)
  }

  const applyTemplate = async () => {
    if (!projectId) return
    const generated = activeTemplateIds.flatMap(templateId => {
      const selectedTemplateItems = scheduleTemplateItems.filter(item => item.templateId === templateId)
      if (!selectedTemplateItems.length && templateId !== 'archispace-standard-development-programme') return []
      return buildScheduleTasksFromTemplateItems(projectId, projectStartDate || tasks[0]?.startDate || new Date(), selectedTemplateItems)
    })
    const existingKeys = new Set(tasks.map(task => `${String(task.phase || '').toLowerCase()}::${String(task.name || '').toLowerCase()}`))
    const generatedKeys = new Set()
    const uniqueGenerated = generated.filter(task => {
      const key = `${String(task.phase || '').toLowerCase()}::${String(task.name || '').toLowerCase()}`
      if (generatedKeys.has(key)) return false
      generatedKeys.add(key)
      return true
    })
    const toAdd = templateMode === 'replace'
      ? uniqueGenerated
      : uniqueGenerated.filter(task => !existingKeys.has(`${String(task.phase || '').toLowerCase()}::${String(task.name || '').toLowerCase()}`))
    if (templateMode === 'replace') {
      const ok = window.confirm('Replace the current project schedule with the selected template set? This deletes existing schedule rows for this project.')
      if (!ok) return
      await deleteBatchScheduleTasks(tasks.map(task => task.id))
    }
    if (toAdd.length) await addBatchScheduleTasks(toAdd)
    setTemplateOpen(false)
  }

  const toggleTemplateSelection = templateId => {
    setSelectedTemplateIds(current => {
      const next = new Set(current)
      if (next.has(templateId)) next.delete(templateId)
      else next.add(templateId)
      return [...next]
    })
  }

  const sourceTasksForTemplate = () => {
    if (templateScope === 'selected' && selectedIds.length) return tasks.filter(task => selectedIds.includes(task.id))
    if (templateScope === 'visible') return filtered
    return tasks
  }

  const saveTemplate = async () => {
    const sourceTasks = sourceTasksForTemplate()
    if (!sourceTasks.length) return
    const name = templateName.trim() || `${project?.name || 'Project'} schedule template`
    const result = await addScheduleTemplate({
      name,
      description: `${sourceTasks.length} rows saved from ${project?.name || 'project schedule'} Gantt.`,
      tasks: sourceTasks,
    })
    if (result?.template?.id) setSelectedTemplateIds([result.template.id])
    setTemplateName('')
    setTemplateScope('selected')
    setSaveTemplateOpen(false)
    setSelected(new Set())
  }

  const renderTimelineGrid = () => (
    <>
      {scale === 'days' && dates.map((date, dayIndex) => (date.getDay() === 0 || date.getDay() === 6) ? (
        <div key={`weekend-${dayIndex}`} className="absolute top-0 bottom-0 bg-gray-50/90" style={{ left: dayIndex * colW, width: colW }} />
      ) : null)}
      {gridMarks.map(mark => (
        <div
          key={`grid-${mark.index}`}
          className={`absolute top-0 bottom-0 border-l ${mark.strong ? 'border-gray-300' : 'border-gray-200/70'}`}
          style={{ left: mark.index * colW }}
        />
      ))}
      {todayOffset >= 0 && todayOffset <= totalDays && <div className="absolute top-0 bottom-0 z-10 w-px bg-red-400" style={{ left: todayOffset * colW }} />}
    </>
  )

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
          <>
            <button onClick={() => setTemplateOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <FileSpreadsheet size={14} /> Template
            </button>
            <button onClick={() => setSaveTemplateOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Save size={14} /> Save template
            </button>
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Upload size={14} /> Import CSV
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => handleCsvFile(e.target.files?.[0])} />
            </label>
            <button onClick={() => exportScheduleCsv(filtered, `${fileSafe(project?.name || exportTitle)}-gantt.csv`)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Download size={14} /> CSV
            </button>
            <button onClick={() => exportSchedulePdf({ project, tasks: filtered, includeProject: Boolean(project), title: `${exportTitle} - Gantt` })} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <FileText size={14} /> PDF
            </button>
            <button onClick={() => setShowNewTask(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-forest-600 px-3 text-sm font-medium text-white hover:bg-forest-700">
              <Plus size={14} /> Add Task
            </button>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
        <div className="flex overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          {Object.entries(SCALE_OPTIONS).map(([key, option]) => (
            <button
              key={key}
              onClick={() => setScale(key)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${scale === key ? 'bg-forest-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button onClick={scrollToToday} className="inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
          <CalendarDays size={13} /> Today
        </button>
        <button onClick={() => setCollapsed(new Set())} className="h-8 rounded-md px-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50">Expand stages</button>
        <button onClick={() => setCollapsed(new Set(rollups.map(group => group.phase)))} className="h-8 rounded-md px-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50">Collapse stages</button>
        <div className="flex-1" />
        <div className="flex min-w-[260px] items-center gap-2 text-xs text-gray-500">
          <button onClick={() => setZoom(value => Math.max(0, value - 10))} className="rounded-md border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-50" title="Zoom out">
            <Minus size={13} />
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="w-full accent-forest-600"
            aria-label="Gantt zoom"
          />
          <button onClick={() => setZoom(value => Math.min(100, value + 10))} className="rounded-md border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-50" title="Zoom in">
            <Plus size={13} />
          </button>
        </div>
      </div>

      {templateOpen && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-800">Apply schedule template</div>
              <div className="text-xs text-gray-400">Add missing rows by default, or replace this project schedule after confirmation.</div>
            </div>
            <button onClick={() => setTemplateOpen(false)} className="rounded-md p-1 text-gray-400 hover:bg-gray-50"><X size={15} /></button>
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
            <div className="max-h-44 overflow-auto rounded-lg border border-gray-200 bg-gray-50/60 p-2">
              {availableTemplates.map(template => {
                const checked = activeTemplateIds.includes(template.id)
                return (
                  <label key={template.id} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-sm hover:bg-white">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTemplateSelection(template.id)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-forest-600 focus:ring-forest-500"
                    />
                    <span>
                      <span className="block font-medium text-gray-800">{template.name}</span>
                      {template.description && <span className="mt-0.5 block text-xs text-gray-400">{template.description}</span>}
                    </span>
                  </label>
                )
              })}
            </div>
            <select className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-ocean-400" value={templateMode} onChange={e => setTemplateMode(e.target.value)}>
              <option value="missing">Add missing tasks only</option>
              <option value="replace">Replace current schedule</option>
            </select>
            <button onClick={applyTemplate} disabled={!activeTemplateIds.length} className="h-9 rounded-lg bg-forest-600 px-4 text-sm font-semibold text-white hover:bg-forest-700 disabled:opacity-50">Apply</button>
          </div>
        </div>
      )}

      {saveTemplateOpen && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-800">Save schedule template</div>
              <div className="text-xs text-gray-400">Save selected rows, filtered rows, or the full schedule from this Gantt view.</div>
            </div>
            <button onClick={() => setSaveTemplateOpen(false)} className="rounded-md p-1 text-gray-400 hover:bg-gray-50"><X size={15} /></button>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <input
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-ocean-400"
              placeholder="Template name, e.g. Construction stage programme"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
            />
            <select className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-ocean-400" value={templateScope} onChange={e => setTemplateScope(e.target.value)}>
              <option value="selected">Selected rows ({selectedIds.length || 'none'})</option>
              <option value="visible">Current filtered view ({filtered.length})</option>
              <option value="all">Whole project schedule ({tasks.length})</option>
            </select>
            <button onClick={saveTemplate} disabled={!sourceTasksForTemplate().length} className="h-9 rounded-lg bg-forest-600 px-4 text-sm font-semibold text-white hover:bg-forest-700 disabled:opacity-50">Save</button>
          </div>
        </div>
      )}

      {csvImport && (
        <div className="rounded-xl border border-ocean-100 bg-ocean-50/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-800">CSV import preview</div>
              <div className="text-xs text-gray-500">{csvImport.tasks.length} usable task rows found. Useful headers: phase/stage, task/name, start, finish, duration, assignee, contractor, milestone, owner, notes.</div>
            </div>
            <button onClick={() => setCsvImport(null)} className="rounded-md p-1 text-gray-400 hover:bg-white"><X size={15} /></button>
          </div>
          <div className="mb-3 max-h-48 overflow-auto rounded-lg border border-ocean-100 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr><th className="px-3 py-2 text-left">Phase</th><th className="px-3 py-2 text-left">Task</th><th className="px-3 py-2 text-left">Assignee</th><th className="px-3 py-2 text-left">Start</th><th className="px-3 py-2 text-left">Finish</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {csvImport.tasks.slice(0, 8).map((task, index) => (
                  <tr key={`${task.name}-${index}`}>
                    <td className="px-3 py-2">{task.phase}</td>
                    <td className="px-3 py-2">{task.name}</td>
                    <td className="px-3 py-2">{task.assignee || '-'}</td>
                    <td className="px-3 py-2">{task.startDate || '-'}</td>
                    <td className="px-3 py-2">{task.endDate || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={applyCsvImport} disabled={!csvImport.tasks.length} className="rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-700 disabled:opacity-50">Import schedule rows</button>
        </div>
      )}

      {showNewTask && projectId && <TaskForm projectId={projectId} phaseOptions={phases} onClose={() => setShowNewTask(false)} />}

      {!datedTasks.length ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">No tasks with dates in this filtered view.</div>
      ) : (
        <div
          ref={scrollRef}
          className="overflow-auto rounded-lg border border-gray-200 bg-white"
          style={{ maxHeight: 'calc(100vh - 360px)', minHeight: 520 }}
        >
          <div className="flex" style={{ width: leftW + timelineWidth }}>
            <div className="sticky left-0 z-30 shrink-0 border-r border-gray-200 bg-white shadow-[6px_0_12px_rgba(15,23,42,0.04)]" style={{ width: leftW }}>
              <div className="grid h-[58px] grid-cols-[42px_minmax(270px,1fr)_126px_126px_64px_170px_150px_42px] items-center border-b border-gray-200 bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <div className="px-3">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} className="h-4 w-4 rounded border-gray-300 text-forest-600 focus:ring-forest-500" />
                </div>
                <div className="px-4">Task</div>
                <div className="px-2">Start</div>
                <div className="px-2">Finish</div>
                <div className="px-2">Days</div>
                <div className="px-2">Assignee</div>
                <div className="px-2">Status</div>
                <div />
              </div>

              {rows.map((row, index) => {
                if (row.type === 'phase') {
                  const { rollup } = row
                  const isCollapsed = collapsed.has(rollup.phase)
                  return (
                    <button
                      key={`${rollup.phase}-${index}`}
                      onClick={() => togglePhase(rollup.phase)}
                      className={`grid w-full grid-cols-[42px_minmax(270px,1fr)_126px_126px_64px_170px_150px_42px] items-center border-b border-gray-200 text-left ${rollup.tone.light} hover:bg-white`}
                      style={{ height: stageRowH }}
                    >
                      <div />
                      <div className="flex min-w-0 items-center gap-2 px-4">
                        {isCollapsed ? <ChevronRight size={14} className="shrink-0 text-gray-500" /> : <ChevronDown size={14} className="shrink-0 text-gray-500" />}
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${rollup.tone.dot}`} />
                        <span className={`truncate text-xs font-bold uppercase tracking-wide ${rollup.tone.text}`}>{rollup.phase}</span>
                        <span className="shrink-0 text-xs text-gray-500">{rollup.complete}/{rollup.count}</span>
                        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/70">
                          <span className={`block h-full rounded-full ${rollup.tone.bg}`} style={{ width: `${rollup.pct}%` }} />
                        </span>
                      </div>
                      <div className="px-2 text-[11px] font-medium text-gray-600">{formatShort(rollup.startDate)}</div>
                      <div className="px-2 text-[11px] font-medium text-gray-600">{formatShort(rollup.endDate)}</div>
                      <div className="px-2 text-[11px] text-gray-500">{rollup.durationDays ? `${rollup.durationDays}d` : '-'}</div>
                      <div className="px-2 text-[11px] text-gray-500">{rollup.pct}% done</div>
                      <div className="px-2">{rollup.delayed > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">{rollup.delayed} delayed</span>}</div>
                      <div />
                    </button>
                  )
                }

                const task = row.task
                const status = smartStatus(task)
                const cfg = STATUS_MAP[status] || STATUS_MAP['not-started']
                const days = durationDays(task)
                return (
                  <div
                    key={task.id}
                    className={`group grid grid-cols-[42px_minmax(270px,1fr)_126px_126px_64px_170px_150px_42px] items-center border-b border-gray-100 ${cfg.row} hover:bg-gray-50`}
                    style={{ height: taskRowH }}
                  >
                    <div className="px-3">
                      <input type="checkbox" checked={selected.has(task.id)} onChange={() => toggleSelected(task.id)} className="h-4 w-4 rounded border-gray-300 text-forest-600 focus:ring-forest-500" />
                    </div>
                    <div className="flex min-w-0 items-center gap-2 px-4">
                      {task.isMilestone && <Diamond size={12} className="shrink-0 fill-forest-600 text-forest-600" />}
                      <button
                        onClick={() => setEditTask(task)}
                        className={`truncate text-left text-sm ${status === 'complete' ? 'text-gray-500 line-through' : 'text-gray-800'}`}
                        title={task.name}
                      >
                        {task.name}
                      </button>
                    </div>
                    <div className="px-1"><DateCell value={task.startDate} onCommit={value => updateDate(task, 'startDate', value)} /></div>
                    <div className="px-1"><DateCell value={task.endDate} onCommit={value => updateDate(task, 'endDate', value)} /></div>
                    <div className="px-2 text-sm text-gray-500">{days ? `${days}d` : '-'}</div>
                    <div className="px-2">
                      <select
                        className="h-7 w-full truncate rounded-md border border-transparent bg-gray-50 px-2 text-xs text-gray-700 outline-none hover:border-gray-200 focus:border-ocean-400 focus:bg-white"
                        value={assigneeValue(task)}
                        onChange={event => updateAssignee(task, event.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {teamAssignees.map(name => <option key={`team:${name}`} value={`team:${name}`}>{name}</option>)}
                        {availableProjectContacts.map(item => <option key={`pc:${item.id}`} value={`pc:${item.id}`}>{contactLabel(item)}</option>)}
                      </select>
                    </div>
                    <div className="px-2"><StatusSelect task={task} onChange={updateStatus} /></div>
                    <div className="px-2 text-right">
                      {confirmDelete === task.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { deleteScheduleTask(task.id); setConfirmDelete(null) }} className="rounded px-1.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Yes</button>
                          <button onClick={() => setConfirmDelete(null)} className="rounded px-1.5 py-1 text-xs text-gray-400 hover:bg-gray-50">No</button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100">
                          <button onClick={() => setEditTask(task)} className="rounded px-1.5 py-1 text-gray-400 hover:bg-gray-50 hover:text-gray-700"><Edit3 size={13} /></button>
                          <button onClick={() => setConfirmDelete(task.id)} className="rounded px-1.5 py-1 text-gray-300 hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="shrink-0 bg-white" style={{ width: timelineWidth }}>
              <div className="sticky top-0 z-20 border-b border-gray-200 bg-gray-50" style={{ height: headerH }}>
                <div className="relative h-7 border-b border-gray-200">
                  {monthLabels.map(item => (
                    <div key={item.key} className="absolute top-0 flex h-7 items-center border-r border-gray-200 px-2 text-[11px] font-semibold text-gray-700" style={{ left: item.left, width: item.width }}>
                      {item.label}
                    </div>
                  ))}
                </div>
                <div className="relative h-7">
                  {dateLabels.map(item => (
                    <div key={`${item.index}-${item.label}`} className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] ${item.major ? 'font-semibold text-gray-800' : 'text-gray-500'}`} style={{ left: item.index * colW + 4 }}>
                      {item.label}
                    </div>
                  ))}
                  {gridMarks.map(mark => (
                    <div key={`header-grid-${mark.index}`} className={`absolute top-0 bottom-0 border-l ${mark.strong ? 'border-gray-300' : 'border-gray-200/80'}`} style={{ left: mark.index * colW }} />
                  ))}
                </div>
              </div>

              {rows.map((row, index) => {
                const height = row.type === 'phase' ? stageRowH : taskRowH
                const range = row.type === 'phase'
                  ? barForRange(row.rollup.startDate, row.rollup.endDate, colW * 2)
                  : barForRange(row.task.startDate || row.task.endDate, row.task.endDate || row.task.startDate, colW)
                const status = row.type === 'phase' ? row.rollup.status : smartStatus(row.task)
                const cfg = STATUS_MAP[status] || STATUS_MAP['not-started']
                return (
                  <div key={`${row.type}-${row.type === 'phase' ? row.rollup.phase : row.task.id}-${index}`} className={`relative border-b ${row.type === 'phase' ? 'border-gray-200 bg-gray-50/40' : 'border-gray-100 hover:bg-gray-50/50'}`} style={{ height }}>
                    {renderTimelineGrid()}
                    {range && row.type === 'phase' && (
                      <div className="absolute top-1/2 z-20 -translate-y-1/2" style={{ left: range.left }}>
                        <div className={`h-5 rounded ${row.rollup.tone.bg} opacity-85`} style={{ width: range.width }} title={`${row.rollup.phase}: ${formatShort(row.rollup.startDate)} - ${formatShort(row.rollup.endDate)}`} />
                      </div>
                    )}
                    {range && row.type === 'task' && row.task.isMilestone && (
                      <div className="absolute top-1/2 z-20 flex -translate-y-1/2 items-center gap-2" style={{ left: range.endLeft }}>
                        <span className={`h-3 w-3 -translate-x-1/2 rotate-45 ${cfg.bar}`} />
                        <span className="max-w-[160px] truncate text-[11px] font-medium text-gray-700">{row.task.name}</span>
                      </div>
                    )}
                    {range && row.type === 'task' && !row.task.isMilestone && (
                      <div className="absolute top-1/2 z-20 flex -translate-y-1/2 items-center" style={{ left: range.left }}>
                        <div className={`h-3.5 rounded ${cfg.bar} opacity-80`} style={{ width: range.width }} title={`${row.task.name}: ${formatShort(row.task.startDate)} - ${formatShort(row.task.endDate)}`} />
                        <span className="ml-2 max-w-[190px] truncate text-[11px] text-gray-500">{row.task.name}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {editTask && <TaskEditDrawer task={editTask} phaseOptions={phases} onClose={() => setEditTask(null)} />}
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

export { CalendarView as ScheduleCalendarView, GanttView as ScheduleGanttView, TaskListView as ScheduleTaskListView, getSchedulePhaseRollups, smartStatus as getScheduleSmartStatus }

export default function ScheduleTab({ project }) {
  const { scheduleTasks } = useStore()
  const [view, setView] = useState('gantt')
  const tasks = useMemo(() => scheduleTasks.filter(t => t.projectId === project.id), [scheduleTasks, project.id])

  const tabs = [
    { key: 'list', label: 'Task List', Icon: List },
    { key: 'gantt', label: 'Task Gantt', Icon: BarChart2 },
    { key: 'calendar', label: 'Task Calendar', Icon: Calendar },
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

      {view === 'list' && <TaskListView projectId={project.id} projectStartDate={project.startDate} project={project} tasks={tasks} exportTitle={`${project.name} schedule`} />}
      {view === 'gantt' && <GanttView projectId={project.id} projectStartDate={project.startDate} project={project} tasks={tasks} exportTitle={`${project.name} schedule`} />}
      {view === 'calendar' && <CalendarView tasks={tasks} />}
    </div>
  )
}
