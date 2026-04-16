import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, AlertTriangle, Pencil, X, Plus, Trash2, ExternalLink as LinkIcon } from 'lucide-react'
import useStore from '../store/useStore'
import StatusPill from '../components/StatusPill'
import ProgressBar from '../components/ProgressBar'
import StageTracker from '../components/StageTracker'
import ChecklistItemModal from '../modals/ChecklistItemModal'
import { STAGE_MAP, STAGES } from '../data/stages'
import ChecklistView from './ChecklistView'

const TABS = ['Overview', 'Checklist', 'Tasks', 'Documents']

const inputCls = 'w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent'

// ── Edit Project Modal ────────────────────────────────────────────────────────

function EditProjectModal({ project, onClose }) {
  const { updateProject, logActivity } = useStore()
  const [form, setForm] = useState({
    name: project.name,
    address: project.address,
    clientEntity: project.clientEntity,
    owner: project.owner,
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

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
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
  other: 'bg-gray-100 text-gray-600',
}
const CAT_LABELS = { contract: 'Contract', consent: 'Consent', drawing: 'Drawing', report: 'Report', invoice: 'Invoice', photo: 'Photo', other: 'Other' }
const CATEGORIES = ['contract', 'consent', 'drawing', 'report', 'invoice', 'photo', 'other']

function DocForm({ doc, projectId, onClose, onSave }) {
  const [form, setForm] = useState({
    name: doc?.name || '',
    url: doc?.url || '',
    category: doc?.category || 'other',
    notes: doc?.notes || '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    if (!form.name.trim()) return
    onSave({ ...form, name: form.name.trim(), url: form.url.trim(), notes: form.notes.trim() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
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
  const { documents, addDocument, updateDocument, deleteDocument } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [editDoc, setEditDoc] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const projectDocs = documents.filter(d => d.projectId === project.id)

  const handleAdd = async (data) => {
    await addDocument({ ...data, projectId: project.id, addedBy: 'Tim' })
    setShowForm(false)
  }

  const handleEdit = async (data) => {
    await updateDocument(editDoc.id, data)
    setEditDoc(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{projectDocs.length} document{projectDocs.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 bg-forest-600 hover:bg-forest-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={14} />
          Add document
        </button>
      </div>

      {projectDocs.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">No documents yet. Add links to consents, contracts, drawings and more.</div>
      ) : (
        <div className="space-y-2">
          {projectDocs.map(doc => (
            <div key={doc.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 group hover:border-gray-200 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {doc.url ? (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer"
                      className="font-medium text-gray-800 hover:text-ocean-600 flex items-center gap-1.5 text-sm transition-colors"
                      onClick={e => e.stopPropagation()}
                    >
                      {doc.name}
                      <LinkIcon size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ) : (
                    <span className="font-medium text-gray-800 text-sm">{doc.name}</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAT_COLORS[doc.category] || CAT_COLORS.other}`}>
                    {CAT_LABELS[doc.category] || doc.category}
                  </span>
                </div>
                {doc.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{doc.notes}</p>}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => setEditDoc(doc)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                  <Pencil size={13} />
                </button>
                {confirmDelete === doc.id ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => { deleteDocument(doc.id); setConfirmDelete(null) }} className="text-xs text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50">Delete</button>
                    <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-400 px-1 py-1 rounded hover:bg-gray-100">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(doc.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <DocForm projectId={project.id} onClose={() => setShowForm(false)} onSave={handleAdd} />}
      {editDoc && <DocForm doc={editDoc} projectId={project.id} onClose={() => setEditDoc(null)} onSave={handleEdit} />}
    </div>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ project }) {
  const { checklistItems, activityLog } = useStore()
  const items = checklistItems.filter(i => i.projectId === project.id)

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

  const recent = activityLog.filter(a => a.projectId === project.id).slice(0, 8)

  const fmtTime = ts => {
    const d = new Date(ts)
    return d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }) +
      ' at ' + d.toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Left column */}
      <div className="xl:col-span-2 space-y-4">
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

      {/* Right column — activity */}
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
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ProjectWorkspace() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { projects, checklistItems, updateProject } = useStore()
  const [activeTab, setActiveTab] = useState('Overview')
  const [editingStage, setEditingStage] = useState(false)
  const [editingStatus, setEditingStatus] = useState(false)
  const [showEditProject, setShowEditProject] = useState(false)

  const project = projects.find(p => p.id === projectId)
  const projectItems = project ? checklistItems.filter(i => i.projectId === project.id) : []
  const done = projectItems.filter(i => i.done).length
  const pct = projectItems.length ? Math.round((done / projectItems.length) * 100) : 0
  const stage = project ? STAGE_MAP[project.currentStage] : null

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24">
        <p className="text-gray-400 mb-4">Project not found.</p>
        <Link to="/projects" className="text-ocean-600 text-sm hover:underline">Back to projects</Link>
      </div>
    )
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
          <StageTracker currentStage={project.currentStage} />
        </div>

        {/* Stage edit */}
        <div className="mt-3 max-w-7xl mx-auto flex items-center gap-2">
          <span className="text-xs text-gray-400">Stage:</span>
          {editingStage ? (
            <select
              className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ocean-500"
              value={project.currentStage}
              autoFocus
              onChange={e => {
                updateProject(project.id, { currentStage: e.target.value })
                setEditingStage(false)
              }}
              onBlur={() => setEditingStage(false)}
            >
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          ) : (
            <button
              onClick={() => setEditingStage(true)}
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${stage?.light || 'bg-gray-100'} ${stage?.text || 'text-gray-600'} hover:opacity-80 transition-opacity`}
            >
              {stage?.label || project.currentStage}
            </button>
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
          {activeTab === 'Checklist' && <ChecklistView projectId={project.id} />}
          {activeTab === 'Tasks' && <TasksTab project={project} />}
          {activeTab === 'Documents' && <DocumentsTab project={project} />}
        </div>
      </div>

      {showEditProject && (
        <EditProjectModal project={project} onClose={() => setShowEditProject(false)} />
      )}
    </div>
  )
}
