import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Check, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react'
import useStore from '../store/useStore'

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }
const STATUS_LABELS = {
  open: 'Open',
  'in-progress': 'In progress',
  waiting: 'Waiting',
  done: 'Done',
}

const inputCls = 'w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500'

function priorityColor(priority) {
  return {
    critical: 'text-red-600 font-semibold',
    high: 'text-orange-500 font-medium',
    medium: 'text-gray-500',
    low: 'text-gray-400',
  }[priority] || 'text-gray-500'
}

function fmtDate(date) {
  return date ? new Date(date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }) : ''
}

function TaskModal({ task, projects, teamMembers, currentUser, contacts, companies, projectContacts, onClose }) {
  const { addTask, updateTask, deleteTask } = useStore()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    projectId: task?.projectId || '',
    assignee: task?.assignee || currentUser || '',
    contactRef: task?.projectContactId ? `project:${task.projectContactId}` : task?.contactId ? `contact:${task.contactId}` : task?.companyId ? `company:${task.companyId}` : '',
    companyId: task?.companyId || '',
    contactId: task?.contactId || '',
    projectContactId: task?.projectContactId || '',
    dueDate: task?.dueDate || '',
    priority: task?.priority || 'medium',
    status: task?.status || 'open',
  })

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const contactOptions = useMemo(() => {
    const projectScoped = projectContacts
      .filter(item => !form.projectId || item.projectId === form.projectId)
      .map(item => {
        const contact = contacts.find(person => person.id === item.contactId)
        const company = companies.find(entry => entry.id === item.companyId)
        return {
          value: `project:${item.id}`,
          label: [contact?.name, company?.name, item.projectRole].filter(Boolean).join(' - ') || 'Project contact',
          companyId: item.companyId || '',
          contactId: item.contactId || '',
          projectContactId: item.id,
        }
      })
    const directContacts = contacts.map(contact => {
      const company = companies.find(entry => entry.id === contact.companyId)
      return {
        value: `contact:${contact.id}`,
        label: [contact.name, company?.name].filter(Boolean).join(' - '),
        companyId: contact.companyId || '',
        contactId: contact.id,
        projectContactId: '',
      }
    })
    const companyOnly = companies
      .filter(company => !contacts.some(contact => contact.companyId === company.id))
      .map(company => ({
        value: `company:${company.id}`,
        label: company.name,
        companyId: company.id,
        contactId: '',
        projectContactId: '',
      }))
    const seen = new Set()
    return [...projectScoped, ...directContacts, ...companyOnly].filter(option => {
      if (!option.label || seen.has(option.value)) return false
      seen.add(option.value)
      return true
    })
  }, [companies, contacts, form.projectId, projectContacts])

  const setContactRef = value => {
    const option = contactOptions.find(item => item.value === value)
    setForm(f => ({
      ...f,
      contactRef: value,
      companyId: option?.companyId || '',
      contactId: option?.contactId || '',
      projectContactId: option?.projectContactId || '',
    }))
  }

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    const { contactRef, ...rest } = form
    const payload = { ...rest, title: form.title.trim(), description: form.description.trim() }
    if (task) await updateTask(task.id, payload)
    else await addTask(payload)
    setSaving(false)
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
          <h2 className="font-semibold text-gray-900">{task ? 'Edit task' : 'New task'}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Task *</label>
            <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Project</label>
              <select className={inputCls} value={form.projectId} onChange={e => set('projectId', e.target.value)}>
                <option value="">General</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Assignee</label>
              <select className={inputCls} value={form.assignee} onChange={e => set('assignee', e.target.value)}>
                <option value="">Unassigned</option>
                {teamMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Related contact / contractor</label>
            <select className={inputCls} value={form.contactRef} onChange={e => setContactRef(e.target.value)}>
              <option value="">None</option>
              {contactOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Due date</label>
              <input type="date" className={inputCls} value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Priority</label>
              <select className={inputCls} value={form.priority} onChange={e => set('priority', e.target.value)}>
                {['low', 'medium', 'high', 'critical'].map(p => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
              <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
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
                <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400 px-1">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700">
                <Trash2 size={12} /> Delete
              </button>
            )
          ) : <span />}
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.title.trim()} className="px-4 py-2 text-sm font-medium bg-forest-600 text-white rounded-lg hover:bg-forest-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Tasks() {
  const { projects, tasks, teamMembers, currentUser, updateTask, contacts, companies, projectContacts } = useStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const [modalTask, setModalTask] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState(null)

  const filterProject = searchParams.get('project') || ''
  const filterOwner = searchParams.get('owner') || ''
  const filterStatus = searchParams.get('status') || 'open'

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const in7 = useMemo(() => new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), [today])

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }

  const enriched = useMemo(() => tasks.map(task => ({
    ...task,
    project: projects.find(p => p.id === task.projectId),
    contact: contacts.find(contact => contact.id === task.contactId),
    company: companies.find(company => company.id === task.companyId),
    projectContact: projectContacts.find(item => item.id === task.projectContactId),
    isDone: task.status === 'done',
    isOverdue: task.dueDate && task.status !== 'done' && new Date(task.dueDate) < today,
    isDueSoon: task.dueDate && task.status !== 'done' && new Date(task.dueDate) >= today && new Date(task.dueDate) <= in7,
  })), [tasks, projects, contacts, companies, projectContacts, today, in7])

  const filtered = useMemo(() => enriched.filter(task => {
    if (filterProject && task.projectId !== filterProject) return false
    if (filterOwner && task.assignee !== filterOwner) return false
    if (filterStatus === 'mine') return task.assignee === currentUser && !task.isDone
    if (filterStatus === 'open') return !task.isDone
    if (filterStatus === 'overdue') return task.isOverdue
    if (filterStatus === 'due-soon') return task.isDueSoon
    if (filterStatus === 'done') return task.isDone
    return true
  }).sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1
    const pa = PRIORITY_ORDER[a.priority] ?? 2
    const pb = PRIORITY_ORDER[b.priority] ?? 2
    if (pa !== pb) return pa - pb
    if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate)
    if (a.dueDate) return -1
    if (b.dueDate) return 1
    return 0
  }), [enriched, filterProject, filterOwner, filterStatus, currentUser])

  const assignees = useMemo(() => {
    const names = new Set([...teamMembers.map(m => m.name), ...tasks.map(t => t.assignee)].filter(Boolean))
    return [...names].sort()
  }, [teamMembers, tasks])

  const counts = useMemo(() => ({
    mine: enriched.filter(t => currentUser && t.assignee === currentUser && !t.isDone).length,
    open: enriched.filter(t => !t.isDone).length,
    overdue: enriched.filter(t => t.isOverdue).length,
    dueSoon: enriched.filter(t => t.isDueSoon).length,
    done: enriched.filter(t => t.isDone).length,
  }), [enriched, currentUser])

  const handleAIPrioritise = async () => {
    setAiLoading(true)
    setAiSuggestion(null)
    const context = filtered.slice(0, 20).map(t => {
      return `${t.title} | project: ${t.project?.name || 'General'} | assignee: ${t.assignee || 'Unassigned'} | due: ${t.dueDate || 'none'} | priority: ${t.priority} | status: ${t.status}`
    }).join('\n')

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: `You are a practical project manager for Archispace. Today is ${new Date().toLocaleDateString('en-NZ')}. Be concise.`,
          messages: [{ role: 'user', content: `Prioritise these tasks into the top 5 actions for today. Explain why each matters.\n\n${context || 'No tasks.'}` }],
        }),
      })
      const data = await res.json()
      setAiSuggestion(data.content?.[0]?.text || 'No response received.')
    } catch {
      setAiSuggestion('Could not reach AI. Check your connection.')
    }
    setAiLoading(false)
  }

  const toggleDone = (task) => updateTask(task.id, { status: task.status === 'done' ? 'open' : 'done' })

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Tasks</h1>
            <p className="text-sm text-gray-400 mt-0.5">Assigned work separate from the project checklist</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleAIPrioritise} disabled={aiLoading} className="inline-flex items-center gap-2 bg-ocean-600 hover:bg-ocean-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              <Sparkles size={14} />
              {aiLoading ? 'Thinking...' : 'AI Prioritise'}
            </button>
            <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 bg-forest-600 hover:bg-forest-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              <Plus size={14} /> New task
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {aiSuggestion && (
            <div className="mb-5 bg-ocean-50 border border-ocean-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-ocean-600" />
                <span className="text-sm font-semibold text-ocean-700">AI priority suggestion</span>
                <button onClick={() => setAiSuggestion(null)} className="ml-auto text-ocean-400 hover:text-ocean-600 text-xs">Dismiss</button>
              </div>
              <p className="text-sm text-ocean-700 whitespace-pre-wrap leading-relaxed">{aiSuggestion}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3 items-center mb-4">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {[
                { key: 'mine', label: `Mine (${counts.mine})`, hidden: !currentUser },
                { key: 'open', label: `Open (${counts.open})` },
                { key: 'overdue', label: `Overdue (${counts.overdue})`, danger: counts.overdue > 0 },
                { key: 'due-soon', label: `Due this week (${counts.dueSoon})` },
                { key: 'done', label: `Done (${counts.done})` },
                { key: 'all', label: 'All' },
              ].filter(t => !t.hidden).map(tab => (
                <button key={tab.key} onClick={() => setFilter('status', tab.key)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filterStatus === tab.key ? 'bg-white shadow-sm text-gray-800' : tab.danger ? 'text-red-500 hover:text-red-700' : 'text-gray-500 hover:text-gray-700'}`}>
                  {tab.label}
                </button>
              ))}
            </div>
            <select value={filterProject} onChange={e => setFilter('project', e.target.value)} className={inputCls + ' w-48'}>
              <option value="">All projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={filterOwner} onChange={e => setFilter('owner', e.target.value)} className={inputCls + ' w-44'}>
              <option value="">All assignees</option>
              {assignees.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 py-16 text-center">
              <p className="text-sm font-medium text-gray-600">No tasks match this view.</p>
              <button onClick={() => setShowNew(true)} className="mt-4 inline-flex items-center gap-2 text-sm text-ocean-600 hover:text-ocean-700">
                <Plus size={14} /> Add a task
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th className="w-8 px-4 py-3" />
                    <th className="text-left px-4 py-3 font-medium">Task</th>
                    <th className="text-left px-4 py-3 font-medium">Project</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Assignee</th>
                    <th className="text-left px-4 py-3 font-medium hidden xl:table-cell">Contact</th>
                    <th className="text-left px-4 py-3 font-medium">Due</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Priority</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Status</th>
                    <th className="w-10 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(task => (
                    <tr key={task.id} className={`hover:bg-gray-50 transition-colors ${task.isOverdue ? 'bg-red-50/50' : ''}`}>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleDone(task)} className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${task.isDone ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-400'}`}>
                          {task.isDone && <Check size={10} />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`font-medium ${task.isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</div>
                        {task.description && <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{task.description}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {task.project ? <Link to={`/projects/${task.project.id}`} className="text-ocean-600 hover:underline">{task.project.name}</Link> : <span className="text-gray-400">General</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{task.assignee || '-'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 hidden xl:table-cell">{task.contact?.name || task.company?.name || '-'}</td>
                      <td className="px-4 py-3 text-xs">
                        {task.dueDate ? (
                          <span className={task.isOverdue ? 'inline-flex items-center gap-1 text-red-600 font-medium' : task.isDueSoon ? 'text-amber-600' : 'text-gray-500'}>
                            {task.isOverdue && <AlertTriangle size={11} />}
                            {fmtDate(task.dueDate)}
                          </span>
                        ) : <span className="text-gray-300">-</span>}
                      </td>
                      <td className={`px-4 py-3 text-xs hidden sm:table-cell ${priorityColor(task.priority)}`}>{task.priority}</td>
                      <td className="px-4 py-3 text-xs hidden lg:table-cell">{STATUS_LABELS[task.status] || task.status}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setModalTask(task)} className="p-1.5 text-gray-300 hover:text-ocean-600 rounded hover:bg-ocean-50">
                          <Pencil size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showNew && <TaskModal projects={projects} teamMembers={teamMembers} currentUser={currentUser} contacts={contacts} companies={companies} projectContacts={projectContacts} onClose={() => setShowNew(false)} />}
      {modalTask && <TaskModal task={modalTask} projects={projects} teamMembers={teamMembers} currentUser={currentUser} contacts={contacts} companies={companies} projectContacts={projectContacts} onClose={() => setModalTask(null)} />}
    </div>
  )
}
