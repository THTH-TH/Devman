import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  ExternalLink,
  AlertTriangle,
  Pencil,
  X,
  Plus,
  Trash2,
  ExternalLink as LinkIcon,
  AlertOctagon,
  Building2,
  FileText,
  FolderOpen,
  MapPin,
} from 'lucide-react'
import useStore from '../store/useStore'
import { supabase } from '../lib/supabase'
import StatusPill from '../components/StatusPill'
import ProgressBar from '../components/ProgressBar'
import StageTracker from '../components/StageTracker'
import ChecklistItemModal from '../modals/ChecklistItemModal'
import { STAGE_MAP, STAGES } from '../data/stages'
import ChecklistView from './ChecklistView'
import ScheduleTab from '../components/ProjectScheduleTab'
import ProjectDirectoryTab from '../components/ProjectDirectoryTab'
import ProjectDailyLogTab from '../components/ProjectDailyLogTab'
import PropertyIntelligenceTab from '../components/PropertyIntelligenceTab'
import AiDraftActionsPanel from '../components/AiDraftActionsPanel'
import ShareDocumentsModal from '../components/ShareDocumentsModal'
import DocumentHub from '../components/DocumentHub'

const TABS = ['Overview', 'Property', 'Schedule', 'Checklist', 'Tasks', 'Documents', 'Directory', 'Daily Log']

const inputCls = 'w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent'

// ── Edit Project Modal ────────────────────────────────────────────────────────

function EditProjectModal({ project, onClose, onDelete }) {
  const { updateProject, logActivity } = useStore()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [form, setForm] = useState({
    name: project.name,
    address: project.address,
    clientEntity: project.clientEntity,
    owner: project.owner,
    bcNumber: project.bcNumber || '',
    legalDescription: project.legalDescription || '',
    ownerContactPerson: project.ownerContactPerson || '',
    ownerMailingAddress: project.ownerMailingAddress || '',
    ownerPhone: project.ownerPhone || '',
    ownerEmail: project.ownerEmail || '',
    buildingWorkDescription: project.buildingWorkDescription || '',
    driveFolderUrl: project.driveFolderUrl || '',
    startDate: project.startDate,
    targetCompletion: project.targetCompletion,
    status: project.status,
    description: project.description,
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    await updateProject(project.id, {
      name: form.name.trim(),
      address: form.address.trim(),
      clientEntity: form.clientEntity.trim(),
      owner: form.owner.trim(),
      bcNumber: form.bcNumber.trim(),
      legalDescription: form.legalDescription.trim(),
      ownerContactPerson: form.ownerContactPerson.trim(),
      ownerMailingAddress: form.ownerMailingAddress.trim(),
      ownerPhone: form.ownerPhone.trim(),
      ownerEmail: form.ownerEmail.trim(),
      buildingWorkDescription: form.buildingWorkDescription.trim(),
      driveFolderUrl: form.driveFolderUrl.trim(),
      startDate: form.startDate,
      targetCompletion: form.targetCompletion,
      status: form.status,
      description: form.description.trim(),
    })
    logActivity(project.id, 'Project updated', `Details updated for ${form.name.trim()}`)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-900">Edit project</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Project name *</label>
            <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Address</label>
            <input className={inputCls} value={form.address} onChange={e => set('address', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Client / Entity</label>
              <input className={inputCls} value={form.clientEntity} onChange={e => set('clientEntity', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Owner</label>
              <input className={inputCls} value={form.owner} onChange={e => set('owner', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">BC / Consent number</label>
              <input className={inputCls} value={form.bcNumber} onChange={e => set('bcNumber', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Legal description</label>
              <input className={inputCls} value={form.legalDescription} onChange={e => set('legalDescription', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Owner contact</label>
              <input className={inputCls} value={form.ownerContactPerson} onChange={e => set('ownerContactPerson', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Owner email</label>
              <input className={inputCls} value={form.ownerEmail} onChange={e => set('ownerEmail', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Owner phone</label>
              <input className={inputCls} value={form.ownerPhone} onChange={e => set('ownerPhone', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Owner mailing address</label>
              <input className={inputCls} value={form.ownerMailingAddress} onChange={e => set('ownerMailingAddress', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Start date</label>
              <input type="date" className={inputCls} value={form.startDate} onChange={e => set('startDate', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Target completion</label>
              <input type="date" className={inputCls} value={form.targetCompletion} onChange={e => set('targetCompletion', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
            <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
              {['Active', 'On Hold', 'Blocked', 'Complete'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Google Drive project folder</label>
            <input className={inputCls} value={form.driveFolderUrl} onChange={e => set('driveFolderUrl', e.target.value)} placeholder="https://drive.google.com/drive/folders/..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Building work</label>
            <textarea
              className={inputCls + ' resize-none'}
              rows={2}
              value={form.buildingWorkDescription}
              onChange={e => set('buildingWorkDescription', e.target.value)}
              placeholder="Short description of the consent or building work"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Description / notes</label>
            <textarea
              className={inputCls + ' resize-none'}
              rows={3}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Brief notes about this project…"
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <div>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 font-medium">Delete this project?</span>
                <button onClick={onDelete} className="text-xs text-red-600 font-semibold hover:text-red-800 border border-red-200 px-2 py-1 rounded-lg hover:bg-red-50">Yes, delete</button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-500 px-2 py-1">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors">
                <Trash2 size={12} />
                Delete project
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="px-4 py-2 text-sm font-medium bg-forest-600 text-white rounded-lg hover:bg-forest-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tasks Tab ─────────────────────────────────────────────────────────────────

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

function TasksTab({ project }) {
  const { checklistItems, toggleChecklistItem } = useStore()
  const [editItem, setEditItem] = useState(null)
  const [filterStatus, setFilterStatus] = useState('active')

  const items = useMemo(() => {
    const now = new Date()
    return checklistItems
      .filter(i => i.projectId === project.id)
      .filter(i => {
        if (filterStatus === 'active') return !i.done
        if (filterStatus === 'done') return i.done
        if (filterStatus === 'overdue') return i.dueDate && !i.done && new Date(i.dueDate) < now
        if (filterStatus === 'blocked') return i.isBlocker && !i.done
        return true
      })
      .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2))
  }, [checklistItems, project.id, filterStatus])

  const tabs = ['active', 'overdue', 'blocked', 'done', 'all']
  const counts = useMemo(() => {
    const now = new Date()
    const all = checklistItems.filter(i => i.projectId === project.id)
    return {
      active: all.filter(i => !i.done).length,
      overdue: all.filter(i => i.dueDate && !i.done && new Date(i.dueDate) < now).length,
      blocked: all.filter(i => i.isBlocker && !i.done).length,
      done: all.filter(i => i.done).length,
      all: all.length,
    }
  }, [checklistItems, project.id])

  const priorityColor = p => ({ critical: 'text-red-600', high: 'text-orange-500', medium: 'text-gray-400', low: 'text-gray-300' }[p] || 'text-gray-400')

  return (
    <div>
      {/* Status tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setFilterStatus(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${filterStatus === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t} {counts[t] > 0 && <span className="ml-1 opacity-60">{counts[t]}</span>}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">No tasks in this view.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="text-left px-4 py-2.5 font-medium w-8"></th>
                <th className="text-left px-4 py-2.5 font-medium">Task</th>
                <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Stage</th>
                <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Owner</th>
                <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Due</th>
                <th className="text-left px-4 py-2.5 font-medium">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(item => {
                const stage = STAGE_MAP[item.stageId]
                const isOverdue = item.dueDate && !item.done && new Date(item.dueDate) < new Date()
                return (
                  <tr key={item.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setEditItem(item)}>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() => toggleChecklistItem(item.id)}
                        className="w-4 h-4 rounded border-gray-300 text-ocean-600 focus:ring-ocean-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className={`font-medium ${item.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{item.label}</div>
                      {item.isBlocker && <span className="text-xs text-red-500 font-medium">Blocker</span>}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {stage && <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stage.light} ${stage.text}`}>{stage.short}</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{item.owner || '—'}</td>
                    <td className={`px-4 py-3 text-xs hidden md:table-cell ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                      {item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }) : '—'}
                    </td>
                    <td className={`px-4 py-3 text-xs font-medium capitalize ${priorityColor(item.priority)}`}>{item.priority}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {editItem && <ChecklistItemModal item={editItem} onClose={() => setEditItem(null)} />}
    </div>
  )
}

// ── Documents Tab ─────────────────────────────────────────────────────────────

const CAT_COLORS = {
  contract: 'bg-ocean-50 text-ocean-700',
  consent: 'bg-purple-50 text-purple-700',
  drawing: 'bg-teal-50 text-teal-700',
  report: 'bg-amber-50 text-amber-700',
  invoice: 'bg-green-50 text-green-700',
  photo: 'bg-pink-50 text-pink-700',
  email: 'bg-sky-50 text-sky-700',
  other: 'bg-gray-100 text-gray-600',
}
const CAT_LABELS = { contract: 'Contract', consent: 'Consent', drawing: 'Drawing', report: 'Report', invoice: 'Invoice', photo: 'Photo', email: 'Email', other: 'Other' }
const CATEGORIES = ['contract', 'consent', 'drawing', 'report', 'invoice', 'photo', 'email', 'other']

const ASSIGNED_TASK_STATUS_LABELS = { open: 'Open', 'in-progress': 'In progress', waiting: 'Waiting', done: 'Done' }
const ASSIGNED_TASK_PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

function AssignedTaskForm({ project, task, onClose }) {
  const { addTask, updateTask, deleteTask, teamMembers, currentUser } = useStore()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    assignee: task?.assignee || currentUser || '',
    dueDate: task?.dueDate || '',
    priority: task?.priority || 'medium',
    status: task?.status || 'open',
  })

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const handleSave = async () => {
    if (!form.title.trim()) return
    const payload = { ...form, projectId: project.id, title: form.title.trim(), description: form.description.trim() }
    if (task) await updateTask(task.id, payload)
    else await addTask(payload)
    onClose()
  }

  const handleDelete = async () => {
    await deleteTask(task.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{task ? 'Edit task' : 'New task'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Task *</label>
            <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Assignee</label>
              <select className={inputCls} value={form.assignee} onChange={e => set('assignee', e.target.value)}>
                <option value="">Unassigned</option>
                {teamMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Due</label>
              <input type="date" className={inputCls} value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Priority</label>
              <select className={inputCls} value={form.priority} onChange={e => set('priority', e.target.value)}>
                {['low', 'medium', 'high', 'critical'].map(p => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
            <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
              {Object.entries(ASSIGNED_TASK_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
            <textarea className={`${inputCls} resize-none`} rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          {task ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <button onClick={handleDelete} className="text-xs text-red-600 font-semibold border border-red-200 px-2 py-1 rounded-lg hover:bg-red-50">Delete</button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700">
                <Trash2 size={12} /> Delete
              </button>
            )
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            <button onClick={handleSave} disabled={!form.title.trim()} className="px-4 py-2 text-sm font-medium bg-forest-600 text-white rounded-lg hover:bg-forest-700 disabled:opacity-50">Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AssignedTasksTab({ project }) {
  const { tasks, updateTask, updateBatchTasks, deleteBatchTasks } = useStore()
  const [filterStatus, setFilterStatus] = useState('active')
  const [showNew, setShowNew] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [bulk, setBulk] = useState({ assignee: '', status: '', priority: '', dueDate: '' })
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)

  const projectTasks = useMemo(() => tasks.filter(t => t.projectId === project.id), [tasks, project.id])
  const counts = useMemo(() => {
    const now = new Date()
    return {
      active: projectTasks.filter(t => t.status !== 'done').length,
      overdue: projectTasks.filter(t => t.dueDate && t.status !== 'done' && new Date(t.dueDate) < now).length,
      done: projectTasks.filter(t => t.status === 'done').length,
      all: projectTasks.length,
    }
  }, [projectTasks])

  const items = useMemo(() => {
    const now = new Date()
    return projectTasks
      .filter(t => {
        if (filterStatus === 'active') return t.status !== 'done'
        if (filterStatus === 'overdue') return t.dueDate && t.status !== 'done' && new Date(t.dueDate) < now
        if (filterStatus === 'done') return t.status === 'done'
        return true
      })
      .sort((a, b) => (ASSIGNED_TASK_PRIORITY_ORDER[a.priority] ?? 2) - (ASSIGNED_TASK_PRIORITY_ORDER[b.priority] ?? 2))
  }, [projectTasks, filterStatus])

  const toggleDone = task => updateTask(task.id, { status: task.status === 'done' ? 'open' : 'done' })
  const priorityColor = p => ({ critical: 'text-red-600', high: 'text-orange-500', medium: 'text-gray-400', low: 'text-gray-300' }[p] || 'text-gray-400')
  const selectedIds = [...selected].filter(id => projectTasks.some(task => task.id === id))
  const visibleIds = items.map(task => task.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selected.has(id))

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
    if (bulk.assignee.trim()) payload.assignee = bulk.assignee.trim()
    if (bulk.status) payload.status = bulk.status
    if (bulk.priority) payload.priority = bulk.priority
    if (bulk.dueDate) payload.dueDate = bulk.dueDate
    if (!Object.keys(payload).length) return
    await updateBatchTasks(selectedIds, payload)
    setBulk({ assignee: '', status: '', priority: '', dueDate: '' })
    setSelected(new Set())
  }

  const removeSelected = async () => {
    await deleteBatchTasks(selectedIds)
    setSelected(new Set())
    setConfirmBulkDelete(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {['active', 'overdue', 'done', 'all'].map(tab => (
            <button key={tab} onClick={() => setFilterStatus(tab)} className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${filterStatus === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab} {counts[tab] > 0 && <span className="ml-1 opacity-60">{counts[tab]}</span>}
            </button>
          ))}
        </div>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 bg-forest-600 hover:bg-forest-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
          <Plus size={14} /> New task
        </button>
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-forest-100 bg-forest-50/50 p-3">
          <span className="text-xs font-semibold text-forest-800">{selectedIds.length} selected</span>
          <input
            className="h-8 w-40 rounded-md border border-gray-200 bg-white px-2 text-xs outline-none focus:border-ocean-400"
            placeholder="Assignee"
            value={bulk.assignee}
            onChange={e => setBulk(current => ({ ...current, assignee: e.target.value }))}
          />
          <select className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs outline-none focus:border-ocean-400" value={bulk.status} onChange={e => setBulk(current => ({ ...current, status: e.target.value }))}>
            <option value="">Status</option>
            {Object.entries(ASSIGNED_TASK_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs outline-none focus:border-ocean-400" value={bulk.priority} onChange={e => setBulk(current => ({ ...current, priority: e.target.value }))}>
            <option value="">Priority</option>
            {['critical', 'high', 'medium', 'low'].map(value => <option key={value} value={value}>{value}</option>)}
          </select>
          <input type="date" className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs outline-none focus:border-ocean-400" value={bulk.dueDate} onChange={e => setBulk(current => ({ ...current, dueDate: e.target.value }))} />
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

      {items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <p className="text-sm font-medium text-gray-600 mb-1">No assigned tasks in this view</p>
          <p className="text-xs text-gray-400">Use Checklist for stage gates. Use Tasks for day-to-day assigned work.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="w-8 px-4 py-2.5">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} className="w-4 h-4 rounded border-gray-300 text-ocean-600 focus:ring-ocean-500" />
                </th>
                <th className="w-8 px-2 py-2.5" />
                <th className="text-left px-4 py-2.5 font-medium">Task</th>
                <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Assignee</th>
                <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Due</th>
                <th className="text-left px-4 py-2.5 font-medium">Priority</th>
                <th className="text-left px-4 py-2.5 font-medium hidden lg:table-cell">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(task => {
                const isDone = task.status === 'done'
                const isOverdue = task.dueDate && !isDone && new Date(task.dueDate) < new Date()
                return (
                  <tr key={task.id} className={`hover:bg-gray-50 cursor-pointer ${isOverdue ? 'bg-red-50/50' : ''}`} onClick={() => setEditTask(task)}>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(task.id)} onChange={() => toggleSelected(task.id)} className="w-4 h-4 rounded border-gray-300 text-ocean-600 focus:ring-ocean-500" />
                    </td>
                    <td className="px-2 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isDone} onChange={() => toggleDone(task)} className="w-4 h-4 rounded border-gray-300 text-ocean-600 focus:ring-ocean-500" />
                    </td>
                    <td className="px-4 py-3">
                      <div className={`font-medium ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</div>
                      {task.description && <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{task.description}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{task.assignee || '-'}</td>
                    <td className={`px-4 py-3 text-xs hidden md:table-cell ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }) : '-'}
                    </td>
                    <td className={`px-4 py-3 text-xs font-medium capitalize ${priorityColor(task.priority)}`}>{task.priority}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">{ASSIGNED_TASK_STATUS_LABELS[task.status] || task.status}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showNew && <AssignedTaskForm project={project} onClose={() => setShowNew(false)} />}
      {editTask && <AssignedTaskForm project={project} task={editTask} onClose={() => setEditTask(null)} />}
    </div>
  )
}

function DocForm({ doc, projectId, onClose, onSave }) {
  const [form, setForm] = useState({
    name: doc?.name || '',
    url: doc?.url || '',
    stageId: doc?.stageId || 'feasibility',
    category: doc?.category || 'other',
    revision: doc?.revision || '',
    drawingNumber: doc?.drawingNumber || '',
    discipline: doc?.discipline || '',
    issuedFor: doc?.issuedFor || '',
    documentStatus: doc?.documentStatus || 'current',
    notes: doc?.notes || '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    if (!form.name.trim()) return
    const url = form.url.trim()
    onSave({
      ...form,
      name: form.name.trim(),
      url,
      notes: form.notes.trim(),
      stageId: form.stageId,
      revision: form.revision.trim(),
      drawingNumber: form.drawingNumber.trim(),
      discipline: form.discipline.trim(),
      issuedFor: form.issuedFor.trim(),
      documentStatus: form.documentStatus,
      source: url.includes('drive.google.com') ? 'google_drive' : 'manual_link',
      driveUrl: url.includes('drive.google.com') ? url : '',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">{doc ? 'Edit document' : 'Add document'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={15} /></button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Name *</label>
            <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Resource Consent" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">URL / link</label>
            <input className={inputCls} value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Category</label>
            <select className={inputCls} value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Stage folder</label>
            <select className={inputCls} value={form.stageId} onChange={e => set('stageId', e.target.value)}>
              {STAGES.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Drawing number</label>
              <input className={inputCls} value={form.drawingNumber} onChange={e => set('drawingNumber', e.target.value)} placeholder="A-101" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Revision</label>
              <input className={inputCls} value={form.revision} onChange={e => set('revision', e.target.value)} placeholder="P1 / Rev A" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Discipline</label>
              <input className={inputCls} value={form.discipline} onChange={e => set('discipline', e.target.value)} placeholder="Architectural / Civil / Structural" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Issued for</label>
              <input className={inputCls} value={form.issuedFor} onChange={e => set('issuedFor', e.target.value)} placeholder="Consent / Pricing / Construction" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Document status</label>
            <select className={inputCls} value={form.documentStatus} onChange={e => set('documentStatus', e.target.value)}>
              {['current', 'draft', 'superseded', 'issued', 'approved', 'for review'].map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
            <input className={inputCls} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes…" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button onClick={handleSave} disabled={!form.name.trim()} className="px-4 py-2 text-sm font-medium bg-forest-600 text-white rounded-lg hover:bg-forest-700 disabled:opacity-50 transition-colors">
            {doc ? 'Save' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DocumentsTab({ project }) {
  const {
    projects,
    documents,
    profile,
    currentUser,
    addDocument,
    updateDocument,
    deleteDocument,
    updateBatchDocuments,
    deleteBatchDocuments,
    updateProject,
  } = useStore()
  const [editingDriveFolder, setEditingDriveFolder] = useState(false)
  const [driveFolderUrl, setDriveFolderUrl] = useState(project.driveFolderUrl || '')

  const saveDriveFolder = async () => {
    await updateProject(project.id, { driveFolderUrl: driveFolderUrl.trim() })
    setEditingDriveFolder(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-forest-50 text-forest-700">
            <FolderOpen size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900">Project Drive folder</div>
            {project.driveFolderUrl ? (
              <a href={project.driveFolderUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-ocean-600 hover:underline">
                {project.driveFolderUrl}
              </a>
            ) : (
              <div className="text-xs text-gray-400">No Drive folder linked.</div>
            )}
          </div>
        </div>
        {editingDriveFolder ? (
          <div className="flex flex-col gap-2 sm:flex-row lg:w-[520px]">
            <input
              className={inputCls}
              value={driveFolderUrl}
              onChange={event => setDriveFolderUrl(event.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
            />
            <button onClick={saveDriveFolder} className="rounded-lg bg-forest-600 px-3 py-2 text-sm font-medium text-white hover:bg-forest-700">Save</button>
            <button onClick={() => { setDriveFolderUrl(project.driveFolderUrl || ''); setEditingDriveFolder(false) }} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        ) : (
          <div className="flex shrink-0 gap-2">
            {project.driveFolderUrl && (
              <a href={project.driveFolderUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50">
                Open Drive
                <ExternalLink size={12} />
              </a>
            )}
            <button onClick={() => setEditingDriveFolder(true)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50">
              {project.driveFolderUrl ? 'Edit folder' : 'Link folder'}
            </button>
          </div>
        )}
      </div>

      <DocumentHub
        projects={projects}
        documents={documents}
        profile={profile}
        currentUser={currentUser}
        addDocument={addDocument}
        updateDocument={updateDocument}
        deleteDocument={deleteDocument}
        updateBatchDocuments={updateBatchDocuments}
        deleteBatchDocuments={deleteBatchDocuments}
        fixedProjectId={project.id}
        defaultProjectId={project.id}
        title={`${project.name} documents`}
        showMainRegisterLink
      />
    </div>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ project }) {
  const { checklistItems, activityLog, documents, projectContacts, companies, contacts, dailyLogs, milestones, scheduleTasks, propertyProfiles } = useStore()
  const items = checklistItems.filter(i => i.projectId === project.id)
  const activeStageIds = project.activeStageIds?.length ? project.activeStageIds : [project.currentStage]
  const activeStages = STAGES.filter(stage => activeStageIds.includes(stage.id))
  const projectDocs = documents.filter(doc => doc.projectId === project.id).slice(0, 5)
  const projectDirectory = projectContacts.filter(item => item.projectId === project.id)
  const propertyProfile = propertyProfiles.find(item => item.projectId === project.id)
  const recentLogs = dailyLogs
    .filter(log => log.projectId === project.id)
    .slice()
    .sort((a, b) => String(b.logDate || b.createdAt || '').localeCompare(String(a.logDate || a.createdAt || '')))
    .slice(0, 3)

  const stageStats = useMemo(() => {
    return STAGES.map(stage => {
      const stageItems = items.filter(i => i.stageId === stage.id)
      const done = stageItems.filter(i => i.done).length
      const pct = stageItems.length ? Math.round((done / stageItems.length) * 100) : 0
      return { ...stage, total: stageItems.length, done, pct }
    }).filter(s => s.total > 0)
  }, [items])

  const blockers = items.filter(i => i.isBlocker && !i.done)
  const requiredIncomplete = items.filter(i => i.requiredToProgress && !i.done &&
    i.stageId === project.currentStage)
  const total = items.length
  const done = items.filter(i => i.done).length
  const overdue = items.filter(i => i.dueDate && !i.done && new Date(i.dueDate) < new Date())
  const delayedSchedule = scheduleTasks.filter(t => t.projectId === project.id && t.status === 'delayed')
  const upcomingMilestones = [
    ...milestones
      .filter(m => m.projectId === project.id && m.date)
      .map(m => ({ id: `milestone-${m.id}`, label: m.label, date: m.date, stageId: m.stageId, type: 'Milestone' })),
    ...scheduleTasks
      .filter(t => t.projectId === project.id && t.isMilestone && (t.endDate || t.startDate))
      .map(t => ({ id: `schedule-${t.id}`, label: t.name, date: t.endDate || t.startDate, stageId: STAGES.find(s => s.label === t.phase || s.short === t.phase)?.id, type: 'Schedule' })),
  ]
    .filter(item => new Date(item.date) >= new Date(new Date().toDateString()))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5)
  const attentionItems = [
    ...blockers.map(item => ({ id: `blocker-${item.id}`, tone: 'red', label: item.label, meta: 'Checklist blocker' })),
    ...overdue.map(item => ({ id: `overdue-${item.id}`, tone: 'red', label: item.label, meta: 'Overdue checklist item' })),
    ...delayedSchedule.map(item => ({ id: `schedule-${item.id}`, tone: 'red', label: item.name, meta: 'Delayed schedule item' })),
    ...requiredIncomplete.map(item => ({ id: `required-${item.id}`, tone: 'amber', label: item.label, meta: 'Required stage gate' })),
    ...recentLogs.filter(log => log.blockers).map(log => ({ id: `log-${log.id}`, tone: 'amber', label: log.blockers, meta: `Daily log ${log.logDate}` })),
  ].slice(0, 8)

  const recent = activityLog.filter(a => a.projectId === project.id).slice(0, 8)
  const companyName = companyId => companies.find(company => company.id === companyId)?.name || ''
  const contactName = contactId => contacts.find(contact => contact.id === contactId)?.name || ''

  const fmtTime = ts => {
    const d = new Date(ts)
    return d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }) +
      ' at ' + d.toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Left column */}
      <div className="xl:col-span-2 space-y-4">
        <AiDraftActionsPanel project={project} />

        {/* Project info card */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm">
            {project.clientEntity && (
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Client / Entity</div>
                <div className="font-medium text-gray-800">{project.clientEntity}</div>
              </div>
            )}
            {project.owner && (
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Owner</div>
                <div className="font-medium text-gray-800">{project.owner}</div>
              </div>
            )}
            {project.startDate && (
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Start date</div>
                <div className="font-medium text-gray-800">{new Date(project.startDate).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              </div>
            )}
            {project.targetCompletion && (
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Target completion</div>
                <div className="font-medium text-gray-800">{new Date(project.targetCompletion).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              </div>
            )}
          </div>
          {project.description && (
            <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-50">{project.description}</p>
          )}
        </div>

        {propertyProfile && (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">Property intelligence</h3>
                <p className="mt-1 text-xs text-gray-500">{propertyProfile.hazardSummary?.summary || 'Property profile captured.'}</p>
              </div>
              <span className="rounded-full bg-ocean-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-ocean-700">
                {propertyProfile.sourceStatus?.council || 'linked'}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Active stages</h3>
            <div className="flex flex-wrap gap-2">
              {activeStages.map(activeStage => (
                <span
                  key={activeStage.id}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${activeStage.id === project.currentStage ? `${activeStage.bg} text-white` : `${activeStage.light} ${activeStage.text}`}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {activeStage.label}
                  {activeStage.id === project.currentStage && <span className="text-[10px] opacity-80">Primary</span>}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Attention</h3>
            {attentionItems.length === 0 ? (
              <div className="text-xs text-gray-400">No blockers, overdue items or delayed schedule tasks.</div>
            ) : (
              <div className="space-y-2">
                {attentionItems.slice(0, 4).map(item => (
                  <div key={item.id} className={`rounded-lg border px-3 py-2 ${item.tone === 'red' ? 'border-red-100 bg-red-50 text-red-700' : 'border-amber-100 bg-amber-50 text-amber-700'}`}>
                    <div className="text-xs font-semibold line-clamp-1">{item.label}</div>
                    <div className="text-[10px] opacity-70">{item.meta}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {(project.legalDescription || project.bcNumber || project.driveFolderUrl || project.latitude || project.buildingWorkDescription) && (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={15} className="text-forest-600" />
              <h3 className="text-sm font-semibold text-gray-700">Property key</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 text-sm">
              {project.bcNumber && (
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">BC / Consent</div>
                  <div className="font-medium text-gray-800">{project.bcNumber}</div>
                </div>
              )}
              {project.legalDescription && (
                <div className="lg:col-span-2">
                  <div className="text-xs text-gray-400 mb-0.5">Legal description</div>
                  <div className="font-medium text-gray-800">{project.legalDescription}</div>
                </div>
              )}
              {(project.suburb || project.region || project.postalCode) && (
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">Location</div>
                  <div className="font-medium text-gray-800">{[project.suburb, project.region, project.postalCode].filter(Boolean).join(', ')}</div>
                </div>
              )}
              {project.latitude && project.longitude && (
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">Coordinates</div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${project.latitude},${project.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-ocean-600 hover:underline inline-flex items-center gap-1"
                  >
                    {Number(project.latitude).toFixed(6)}, {Number(project.longitude).toFixed(6)}
                    <ExternalLink size={11} />
                  </a>
                </div>
              )}
              {project.driveFolderUrl && (
                <div className="lg:col-span-2">
                  <div className="text-xs text-gray-400 mb-0.5">Google Drive folder</div>
                  <a href={project.driveFolderUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-ocean-600 hover:underline inline-flex items-center gap-1">
                    Open project folder
                    <ExternalLink size={11} />
                  </a>
                </div>
              )}
              {project.buildingWorkDescription && (
                <div className="lg:col-span-4">
                  <div className="text-xs text-gray-400 mb-0.5">Building work</div>
                  <div className="text-gray-700">{project.buildingWorkDescription}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Overall stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total items', value: total },
            { label: 'Completed', value: done, color: 'text-green-600' },
            { label: 'Overdue', value: overdue.length, color: overdue.length ? 'text-red-600' : '' },
            { label: 'Blockers', value: blockers.length, color: blockers.length ? 'text-red-600' : '' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="text-xs text-gray-400 mb-1">{stat.label}</div>
              <div className={`text-2xl font-bold ${stat.color || 'text-gray-800'}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Stage progress */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Stage progress</h3>
          <div className="space-y-3">
            {stageStats.map(stage => (
              <div key={stage.id}>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span className={`font-medium ${stage.text}`}>{stage.label}</span>
                  <span>{stage.done}/{stage.total} &mdash; {stage.pct}%</span>
                </div>
                <ProgressBar value={stage.pct} color={stage.bg} height="h-1.5" />
              </div>
            ))}
          </div>
        </div>

        {/* Blockers */}
        {blockers.length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={15} className="text-red-500" />
              <h3 className="text-sm font-semibold text-red-700">Blockers ({blockers.length})</h3>
            </div>
            <ul className="space-y-1">
              {blockers.map(item => (
                <li key={item.id} className="text-xs text-red-600 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Required incomplete */}
        {requiredIncomplete.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-amber-700 mb-3">
              Required before stage advance ({requiredIncomplete.length})
            </h3>
            <ul className="space-y-1">
              {requiredIncomplete.map(item => (
                <li key={item.id} className="text-xs text-amber-700 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">Upcoming milestones</h3>
          </div>
          {upcomingMilestones.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No upcoming milestones.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {upcomingMilestones.map(item => (
                <div key={item.id} className="px-5 py-3">
                  <div className="text-xs font-semibold text-gray-800 line-clamp-1">{item.label}</div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-gray-400">
                    <span>{item.type}</span>
                    <span>{new Date(item.date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">Project contacts</h3>
          </div>
          {projectDirectory.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No project contacts yet.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {projectDirectory.slice(0, 5).map(item => (
                <div key={item.id} className="px-5 py-3">
                  <div className="text-xs font-semibold text-gray-800">{contactName(item.contactId) || companyName(item.companyId) || 'Unnamed contact'}</div>
                  <div className="text-[10px] text-gray-400">{[item.projectRole, item.discipline, companyName(item.companyId)].filter(Boolean).join(' / ') || 'No role set'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">Recent documents</h3>
          </div>
          {projectDocs.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No documents yet.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {projectDocs.map(doc => (
                <div key={doc.id} className="px-5 py-3">
                  <div className="text-xs font-semibold text-gray-800 line-clamp-1">{doc.name}</div>
                  <div className="text-[10px] text-gray-400">{STAGE_MAP[doc.stageId]?.label || 'General'} / {CAT_LABELS[doc.category] || doc.category}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">Recent daily logs</h3>
          </div>
          {recentLogs.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No daily logs yet.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentLogs.map(log => (
                <div key={log.id} className="px-5 py-3">
                  <div className="text-xs font-semibold text-gray-800">{log.logDate || 'No date'}</div>
                  <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{log.summary || log.workCompleted || log.blockers}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">Activity</h3>
          </div>
          {recent.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No activity yet.</div>
          ) : (
            <div className="divide-y divide-gray-50 overflow-y-auto max-h-96">
              {recent.map(entry => (
                <div key={entry.id} className="px-5 py-3">
                  <div className="text-xs font-medium text-gray-700">{entry.action}</div>
                  <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{entry.detail}</div>
                  <div className="text-[10px] text-gray-300 mt-1">{fmtTime(entry.timestamp)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ProjectWorkspace() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { projects, checklistItems, updateProject, deleteProject } = useStore()
  const [activeTab, setActiveTab] = useState('Overview')
  const [editingStage, setEditingStage] = useState(false)
  const [editingStatus, setEditingStatus] = useState(false)
  const [showEditProject, setShowEditProject] = useState(false)

  const project = projects.find(p => p.id === projectId)
  const projectItems = project ? checklistItems.filter(i => i.projectId === project.id) : []
  const done = projectItems.filter(i => i.done).length
  const pct = projectItems.length ? Math.round((done / projectItems.length) * 100) : 0
  const stage = project ? STAGE_MAP[project.currentStage] : null
  const activeStageIds = project ? (project.activeStageIds?.length ? project.activeStageIds : [project.currentStage]) : []
  const completedStageIds = project ? STAGES
    .filter(s => {
      const stageItems = projectItems.filter(item => item.stageId === s.id)
      return stageItems.length > 0 && stageItems.every(item => item.done)
    })
    .map(s => s.id) : []

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24">
        <p className="text-gray-400 mb-4">Project not found.</p>
        <Link to="/projects" className="text-ocean-600 text-sm hover:underline">Back to projects</Link>
      </div>
    )
  }

  const setPrimaryStage = stageId => {
    const nextActive = activeStageIds.includes(stageId) ? activeStageIds : [...activeStageIds, stageId]
    updateProject(project.id, { currentStage: stageId, activeStageIds: nextActive })
  }

  const toggleActiveStage = stageId => {
    const next = activeStageIds.includes(stageId)
      ? activeStageIds.filter(id => id !== stageId)
      : [...activeStageIds, stageId]
    if (!next.includes(project.currentStage)) next.unshift(project.currentStage)
    updateProject(project.id, { activeStageIds: [...new Set(next)] })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Project header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
        <div className="flex items-start justify-between gap-4 max-w-7xl mx-auto">
          <div className="flex items-start gap-3 min-w-0">
            <button
              onClick={() => navigate('/projects')}
              className="mt-0.5 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">{project.name}</h1>
              <p className="text-sm text-gray-400">{project.address}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* Edit button */}
            <button
              onClick={() => setShowEditProject(true)}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition-colors"
            >
              <Pencil size={12} />
              Edit
            </button>
            {/* Status selector */}
            <div className="relative">
              <button onClick={() => setEditingStatus(v => !v)}>
                <StatusPill status={project.status} />
              </button>
              {editingStatus && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[130px]">
                  {['Active', 'On Hold', 'Blocked', 'Complete'].map(s => (
                    <button
                      key={s}
                      className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
                      onClick={() => {
                        updateProject(project.id, { status: s })
                        setEditingStatus(false)
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Progress */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <ProgressBar value={pct} height="h-1.5" className="w-20" />
              <span className="text-xs">{pct}%</span>
            </div>
            <Link
              to={`/checklist/${project.id}`}
              className="inline-flex items-center gap-1.5 text-xs text-ocean-600 hover:underline"
            >
              <ExternalLink size={12} />
              Checklist
            </Link>
          </div>
        </div>

        {/* Stage tracker */}
        <div className="mt-4 max-w-7xl mx-auto">
          <StageTracker currentStage={project.currentStage} activeStageIds={activeStageIds} completedStageIds={completedStageIds} />
        </div>

        {/* Stage edit */}
        <div className="mt-3 max-w-7xl mx-auto">
          {editingStage ? (
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="mb-3 grid gap-3 md:grid-cols-[220px_1fr_auto] md:items-end">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Primary reporting stage</label>
                  <select
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-ocean-400"
                    value={project.currentStage}
                    onChange={e => setPrimaryStage(e.target.value)}
                  >
                    {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium text-gray-500">Active stages</div>
                  <div className="flex flex-wrap gap-2">
                    {STAGES.map(s => {
                      const active = activeStageIds.includes(s.id)
                      const primary = s.id === project.currentStage
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleActiveStage(s.id)}
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                            primary
                              ? `${s.bg} border-transparent text-white`
                              : active
                                ? `${s.light} ${s.text} border-transparent`
                                : 'border-gray-200 bg-white text-gray-400 hover:text-gray-700'
                          }`}
                        >
                          {s.short}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <button onClick={() => setEditingStage(false)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Done
                </button>
              </div>
              <p className="text-xs text-gray-400">Use the primary stage for reporting, and light up every stage that is active in real work.</p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-400">Primary stage:</span>
              <button
                onClick={() => setEditingStage(true)}
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${stage?.light || 'bg-gray-100'} ${stage?.text || 'text-gray-600'} hover:opacity-80 transition-opacity`}
              >
                {stage?.label || project.currentStage}
              </button>
              <span className="text-xs text-gray-400">Active:</span>
              {activeStageIds.map(id => {
                const activeStage = STAGE_MAP[id]
                return (
                  <span key={id} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${activeStage?.light || 'bg-gray-100'} ${activeStage?.text || 'text-gray-500'}`}>
                    {activeStage?.short || id}
                  </span>
                )
              })}
              <button onClick={() => setEditingStage(true)} className="text-xs font-medium text-ocean-600 hover:underline">
                Edit stages
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-6 shrink-0">
        <div className="flex gap-0 max-w-7xl mx-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-forest-600 text-forest-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {activeTab === 'Overview' && <OverviewTab project={project} />}
          {activeTab === 'Property' && <PropertyIntelligenceTab project={project} />}
          {activeTab === 'Checklist' && <ChecklistView projectId={project.id} />}
          {activeTab === 'Tasks' && <AssignedTasksTab project={project} />}
          {activeTab === 'Schedule' && <ScheduleTab project={project} />}
          {activeTab === 'Documents' && <DocumentsTab project={project} />}
          {activeTab === 'Directory' && <ProjectDirectoryTab project={project} />}
          {activeTab === 'Daily Log' && <ProjectDailyLogTab project={project} />}
        </div>
      </div>

      {showEditProject && (
        <EditProjectModal
          project={project}
          onClose={() => setShowEditProject(false)}
          onDelete={async () => {
            await deleteProject(project.id)
            navigate('/projects')
          }}
        />
      )}
    </div>
  )
}
