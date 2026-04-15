import { useState, useMemo } from 'react'
import { Plus, ExternalLink, Trash2, Pencil, X, Search } from 'lucide-react'
import useStore from '../store/useStore'

const CATEGORIES = ['contract', 'consent', 'drawing', 'report', 'invoice', 'photo', 'other']
const CAT_LABELS = { contract: 'Contract', consent: 'Consent', drawing: 'Drawing', report: 'Report', invoice: 'Invoice', photo: 'Photo', other: 'Other' }
const CAT_COLORS = {
  contract: 'bg-blue-50 text-blue-700',
  consent: 'bg-purple-50 text-purple-700',
  drawing: 'bg-teal-50 text-teal-700',
  report: 'bg-amber-50 text-amber-700',
  invoice: 'bg-green-50 text-green-700',
  photo: 'bg-pink-50 text-pink-700',
  other: 'bg-gray-100 text-gray-600',
}

const inputCls = 'w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'

function DocModal({ doc, projects, onClose, onSave }) {
  const [form, setForm] = useState({
    name: doc?.name || '',
    url: doc?.url || '',
    projectId: doc?.projectId || '',
    category: doc?.category || 'other',
    notes: doc?.notes || '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const valid = form.name.trim() && form.url.trim()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">{doc ? 'Edit document' : 'Add document'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Document name *</label>
            <input className={inputCls} placeholder="e.g. Beachwaters Resource Consent" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Link (URL) *</label>
            <input className={inputCls} placeholder="https://drive.google.com/…" value={form.url} onChange={e => set('url', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Category</label>
              <select className={inputCls} value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Project</label>
              <select className={inputCls} value={form.projectId} onChange={e => set('projectId', e.target.value)}>
                <option value="">— General —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Notes</label>
            <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Any notes…" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          <button
            disabled={!valid}
            onClick={() => { onSave(form); onClose() }}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {doc ? 'Save' : 'Add document'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Documents() {
  const { projects, documents, addDocument, updateDocument, deleteDocument } = useStore()
  const [search, setSearch] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [modal, setModal] = useState(null) // null | 'add' | doc object
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const filtered = useMemo(() => {
    return documents.filter(d => {
      if (filterProject && d.projectId !== filterProject) return false
      if (filterCategory && d.category !== filterCategory) return false
      if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.notes.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [documents, filterProject, filterCategory, search])

  const fmtDate = d => new Date(d).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-400 mt-0.5">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setModal('add')}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Add document
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          />
        </div>
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
        </select>
        {(search || filterProject || filterCategory) && (
          <button onClick={() => { setSearch(''); setFilterProject(''); setFilterCategory('') }} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Clear</button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">
          {documents.length === 0 ? 'No documents yet. Add your first document to get started.' : 'No documents match your filters.'}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Category</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Project</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Notes</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Added</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(doc => {
                const project = projects.find(p => p.id === doc.projectId)
                return (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-gray-800 hover:text-blue-600 flex items-center gap-1.5 group"
                        onClick={e => e.stopPropagation()}
                      >
                        {doc.name}
                        <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />
                      </a>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAT_COLORS[doc.category] || CAT_COLORS.other}`}>
                        {CAT_LABELS[doc.category] || doc.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{project?.name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell max-w-[200px] truncate">{doc.notes || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell">{doc.createdAt ? fmtDate(doc.createdAt) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setModal(doc)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        {deleteConfirm === doc.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => { deleteDocument(doc.id); setDeleteConfirm(null) }} className="text-xs text-red-600 hover:text-red-800 font-medium px-1.5 py-1">Delete</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-400 hover:text-gray-600 px-1">Cancel</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(doc.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <DocModal
          doc={modal === 'add' ? null : modal}
          projects={projects}
          onClose={() => setModal(null)}
          onSave={form => {
            if (modal === 'add') addDocument(form)
            else updateDocument(modal.id, form)
          }}
        />
      )}
    </div>
  )
}
