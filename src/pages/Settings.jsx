import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import useStore from '../store/useStore'

const inputCls = 'w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500'

function MemberRow({ member, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: member.name, role: member.role, email: member.email, phone: member.phone })
  const [confirmDelete, setConfirmDelete] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    if (!form.name.trim()) return
    onSave(form)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="p-4 bg-forest-50 rounded-xl border border-gray-200 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Name *</label>
            <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
            <input className={inputCls} value={form.role} onChange={e => set('role', e.target.value)} placeholder="e.g. Project Manager" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <input className={inputCls} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
            <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSave} className="inline-flex items-center gap-1.5 text-sm bg-forest-600 text-white px-3 py-1.5 rounded-lg hover:bg-forest-700 transition-colors">
            <Check size={13} /> Save
          </button>
          <button onClick={() => { setEditing(false); setForm({ name: member.name, role: member.role, email: member.email, phone: member.phone }) }} className="text-sm text-gray-500 hover:text-gray-700 px-2">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4 py-3 px-4 rounded-xl hover:bg-gray-50 group transition-colors">
      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-1 sm:gap-4">
        <div className="font-medium text-sm text-gray-800">{member.name}</div>
        <div className="text-sm text-gray-500">{member.role || '—'}</div>
        <div className="text-sm text-gray-400 truncate">{member.email || '—'}</div>
        <div className="text-sm text-gray-400">{member.phone || '—'}</div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => setEditing(true)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
          <Pencil size={13} />
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button onClick={() => { onDelete(); setConfirmDelete(false) }} className="text-xs text-red-600 font-medium px-2 py-1 hover:text-red-800">Delete</button>
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400 px-1">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

function AddMemberForm({ onAdd, onCancel }) {
  const [form, setForm] = useState({ name: '', role: '', email: '', phone: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="p-4 bg-forest-50 rounded-xl border border-gray-200 space-y-3 mt-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Name *</label>
          <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} autoFocus placeholder="Full name" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
          <input className={inputCls} value={form.role} onChange={e => set('role', e.target.value)} placeholder="e.g. Site Manager" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
          <input className={inputCls} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
          <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          disabled={!form.name.trim()}
          onClick={() => { onAdd(form) }}
          className="inline-flex items-center gap-1.5 text-sm bg-forest-600 text-white px-3 py-1.5 rounded-lg hover:bg-forest-700 disabled:opacity-50 transition-colors"
        >
          <Check size={13} /> Add member
        </button>
        <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700 px-2">Cancel</button>
      </div>
    </div>
  )
}

export default function Settings() {
  const { teamMembers, addTeamMember, updateTeamMember, deleteTeamMember } = useStore()
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-lg font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage your team and app preferences</p>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
      <div className="p-6 max-w-3xl mx-auto">

      {/* Team Members */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800 text-sm">Team members</h2>
            <p className="text-xs text-gray-400 mt-0.5">Used for task assignment across all projects</p>
          </div>
          {!showAdd && (
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 text-sm text-ocean-600 hover:text-ocean-700 font-medium"
            >
              <Plus size={14} />
              Add member
            </button>
          )}
        </div>

        <div className="px-3 py-3">
          {/* Column headers */}
          {teamMembers.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 px-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              <span>Name</span>
              <span className="hidden sm:block">Role</span>
              <span className="hidden sm:block">Email</span>
              <span className="hidden sm:block">Phone</span>
            </div>
          )}

          {teamMembers.length === 0 && !showAdd ? (
            <div className="py-8 text-center text-sm text-gray-400">
              No team members yet. Add your first team member.
            </div>
          ) : (
            <div className="space-y-1">
              {teamMembers.map(m => (
                <MemberRow
                  key={m.id}
                  member={m}
                  onSave={data => updateTeamMember(m.id, data)}
                  onDelete={() => deleteTeamMember(m.id)}
                />
              ))}
            </div>
          )}

          {showAdd && (
            <AddMemberForm
              onAdd={data => { addTeamMember(data); setShowAdd(false) }}
              onCancel={() => setShowAdd(false)}
            />
          )}
        </div>
      </div>

      {/* App info */}
      <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 text-sm mb-3">App info</h2>
        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex justify-between"><span>Version</span><span className="text-gray-400">0.1.0</span></div>
          <div className="flex justify-between"><span>Organisation</span><span className="text-gray-400">Archispace</span></div>
          <div className="flex justify-between"><span>Live URL</span>
            <a href="https://devman-liart.vercel.app" target="_blank" rel="noopener noreferrer" className="text-ocean-600 hover:underline text-xs">devman-liart.vercel.app</a>
          </div>
        </div>
      </div>
    </div>
    </div>
    </div>
  )
}
