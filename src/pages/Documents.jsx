import { useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ExternalLink,
  FileText,
  FolderOpen,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import useStore from '../store/useStore'
import { supabase } from '../lib/supabase'
import { STAGES, STAGE_MAP } from '../data/stages'

const DOCUMENT_BUCKET = 'documents'
const CATEGORIES = ['contract', 'consent', 'drawing', 'report', 'invoice', 'photo', 'email', 'other']
const CAT_LABELS = {
  contract: 'Contract',
  consent: 'Consent',
  drawing: 'Drawing',
  report: 'Report',
  invoice: 'Invoice',
  photo: 'Photo',
  email: 'Email',
  other: 'Other',
}
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
const SOURCE_LABELS = {
  upload: 'Uploaded',
  google_drive: 'Drive link',
  manual_link: 'Link',
  gmail: 'Email',
}

const inputCls = 'w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500'
const iconBtnCls = 'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed'

const cleanFileName = name =>
  (name || 'document')
    .replace(/[^\w.\- ]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim() || 'document'

const cleanFolder = value => cleanFileName(value || 'general').replace(/\s+/g, '-').toLowerCase()

const getUploadErrorMessage = error => {
  const message = error?.message || String(error || 'Unknown error')
  if (/bucket|storage|row-level security|policy/i.test(message)) {
    return 'Document storage is not set up for private uploads yet. Run the V1 Supabase migration, then upload again.'
  }
  return `Upload failed: ${message}`
}

function SourceBadge({ source }) {
  if (!source) return null
  const label = SOURCE_LABELS[source] || source
  const Icon = source === 'upload' ? FileText : Link2
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-forest-50 text-forest-700 px-1.5 py-0.5 rounded mt-1">
      <Icon size={10} />
      {label}
    </span>
  )
}

function DocModal({ doc, projects, onClose, onSave }) {
  const [form, setForm] = useState({
    name: doc?.name || '',
    url: doc?.url || doc?.driveUrl || '',
    projectId: doc?.projectId || '',
    stageId: doc?.stageId || 'feasibility',
    category: doc?.category || 'other',
    notes: doc?.notes || '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const requiresUrl = !doc || doc.source !== 'upload'
  const valid = form.name.trim() && (!requiresUrl || form.url.trim())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">{doc ? 'Edit document' : 'Add link'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Document name *</label>
            <input className={inputCls} placeholder="e.g. Beachwaters Resource Consent" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{requiresUrl ? 'Link *' : 'External link'}</label>
            <input className={inputCls} placeholder="https://drive.google.com/..." value={form.url} onChange={e => set('url', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Project</label>
              <select className={inputCls} value={form.projectId} onChange={e => set('projectId', e.target.value)}>
                <option value="">General</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Stage folder</label>
              <select className={inputCls} value={form.stageId} onChange={e => set('stageId', e.target.value)}>
                {STAGES.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Category</label>
            <select className={inputCls} value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Notes</label>
            <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Any notes..." value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          <button
            disabled={!valid}
            onClick={() => {
              const url = form.url.trim()
              onSave({
                ...form,
                name: form.name.trim(),
                url,
                notes: form.notes.trim(),
                source: url ? (url.includes('drive.google.com') ? 'google_drive' : 'manual_link') : doc?.source || 'manual_link',
                driveUrl: url.includes('drive.google.com') ? url : '',
              })
              onClose()
            }}
            className="px-4 py-2 text-sm font-medium bg-forest-600 text-white rounded-lg hover:bg-forest-700 disabled:opacity-50 transition-colors"
          >
            {doc ? 'Save' : 'Add link'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DocumentVault({ projects, profile, currentUser, addDocument, onAddLink }) {
  const fileInputRef = useRef(null)
  const [projectId, setProjectId] = useState('')
  const [stageId, setStageId] = useState('feasibility')
  const [category, setCategory] = useState('other')
  const [notes, setNotes] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSummary, setUploadSummary] = useState('')

  const uploadFiles = async fileList => {
    const files = Array.from(fileList || []).filter(Boolean)
    if (!files.length) return

    setUploading(true)
    setUploadError('')
    setUploadSummary('')

    try {
      let uploaded = 0
      for (const file of files) {
        const safeName = cleanFileName(file.name)
        const path = `${cleanFolder(projectId)}/${cleanFolder(stageId)}/${crypto.randomUUID()}-${safeName}`
        const { error } = await supabase.storage.from(DOCUMENT_BUCKET).upload(path, file, {
          cacheControl: '3600',
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        })
        if (error) throw error

        const saved = await addDocument({
          projectId,
          stageId,
          name: file.name,
          url: '',
          category,
          notes,
          source: 'upload',
          storagePath: path,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          fileSize: file.size,
          uploadedBy: profile?.id || '',
          addedBy: currentUser || profile?.name || '',
        })
        if (!saved) throw new Error('Document record could not be saved. Run the V1 Supabase migration, then upload again.')
        uploaded += 1
      }
      setUploadSummary(`${uploaded} file${uploaded !== 1 ? 's' : ''} uploaded`)
    } catch (error) {
      setUploadError(getUploadErrorMessage(error))
    } finally {
      setUploading(false)
      setDragActive(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDrop = event => {
    event.preventDefault()
    event.stopPropagation()
    uploadFiles(event.dataTransfer.files)
  }

  return (
    <section className="mb-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-forest-50 text-forest-700 flex items-center justify-center shrink-0">
            <FolderOpen size={20} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Document vault</h2>
            <p className="text-xs text-gray-500 mt-0.5">Private uploads and project links organised by stage</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={iconBtnCls} onClick={onAddLink}>
            <Link2 size={15} />
            Add link
          </button>
          <button className={iconBtnCls} disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
            Upload file
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={event => uploadFiles(event.target.files)} />
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px]">
        <button
          type="button"
          onDragEnter={event => { event.preventDefault(); setDragActive(true) }}
          onDragOver={event => { event.preventDefault(); setDragActive(true) }}
          onDragLeave={event => { event.preventDefault(); setDragActive(false) }}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`min-h-[180px] px-5 py-6 text-left border-b lg:border-b-0 lg:border-r border-gray-100 transition-colors ${
            dragActive ? 'bg-forest-50' : 'bg-white hover:bg-gray-50'
          } disabled:cursor-wait`}
        >
          <div className="h-full border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-center px-4 py-8">
            {uploading ? <Loader2 size={28} className="text-forest-700 animate-spin" /> : <UploadCloud size={30} className="text-forest-700" />}
            <p className="text-sm font-semibold text-gray-900 mt-3">{uploading ? 'Uploading files' : 'Drop files here'}</p>
            <p className="text-xs text-gray-500 mt-1">Saved privately into the selected project and stage folder</p>
          </div>
        </button>

        <div className="px-5 py-4 space-y-4 bg-gray-50/60">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Project</label>
            <select className={inputCls} value={projectId} onChange={event => setProjectId(event.target.value)}>
              <option value="">General</option>
              {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Stage folder</label>
            <select className={inputCls} value={stageId} onChange={event => setStageId(event.target.value)}>
              {STAGES.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Category</label>
            <select className={inputCls} value={category} onChange={event => setCategory(event.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Notes</label>
            <textarea className={`${inputCls} resize-none`} rows={3} value={notes} onChange={event => setNotes(event.target.value)} />
          </div>
          {uploadError && (
            <div className="flex gap-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}
          {uploadSummary && !uploadError && (
            <div className="text-xs text-forest-700 bg-forest-50 border border-forest-100 rounded-lg p-3">
              {uploadSummary}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default function Documents() {
  const { projects, documents, profile, currentUser, addDocument, updateDocument, deleteDocument, updateBatchDocuments, deleteBatchDocuments } = useStore()
  const [search, setSearch] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStage, setFilterStage] = useState('')
  const [modal, setModal] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [openError, setOpenError] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [bulk, setBulk] = useState({ projectId: '', stageId: '', category: '' })
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)

  const stageCounts = useMemo(() => {
    const counts = Object.fromEntries(STAGES.map(stage => [stage.id, 0]))
    documents.forEach(doc => {
      if (doc.stageId && counts[doc.stageId] !== undefined) counts[doc.stageId] += 1
    })
    return counts
  }, [documents])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return documents.filter(d => {
      if (filterProject && d.projectId !== filterProject) return false
      if (filterCategory && d.category !== filterCategory) return false
      if (filterStage && d.stageId !== filterStage) return false
      if (term && !d.name.toLowerCase().includes(term) && !d.notes.toLowerCase().includes(term)) return false
      return true
    })
  }, [documents, filterProject, filterCategory, filterStage, search])

  const selectedIds = [...selected].filter(id => documents.some(doc => doc.id === id))
  const visibleIds = filtered.map(doc => doc.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selected.has(id))

  const toggleSelected = id => {
    setSelected(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
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
    if (bulk.projectId) payload.projectId = bulk.projectId
    if (bulk.stageId) payload.stageId = bulk.stageId
    if (bulk.category) payload.category = bulk.category
    if (!Object.keys(payload).length) return
    await updateBatchDocuments(selectedIds, payload)
    setBulk({ projectId: '', stageId: '', category: '' })
    setSelected(new Set())
  }

  const removeSelected = async () => {
    await deleteBatchDocuments(selectedIds)
    setSelected(new Set())
    setConfirmBulkDelete(false)
  }

  const fmtDate = d => new Date(d).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })

  const openDocument = async doc => {
    setOpenError('')
    if (doc.storagePath) {
      const { data, error } = await supabase.storage.from(DOCUMENT_BUCKET).createSignedUrl(doc.storagePath, 60 * 10)
      if (error || !data?.signedUrl) {
        setOpenError(error?.message || 'Could not open this uploaded file.')
        return
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
      return
    }
    if (doc.url) {
      window.open(doc.url, '_blank', 'noopener,noreferrer')
      return
    }
    setOpenError('This document has no file or link attached.')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Documents</h1>
            <p className="text-sm text-gray-400 mt-0.5">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setModal('add')}
            className="inline-flex items-center gap-2 bg-forest-600 hover:bg-forest-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} />
            Add link
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <DocumentVault projects={projects} profile={profile} currentUser={currentUser} addDocument={addDocument} onAddLink={() => setModal('add')} />

          <div className="mb-5 flex flex-wrap gap-2">
            <button
              onClick={() => setFilterStage('')}
              className={`rounded-lg border px-3 py-2 text-xs font-medium ${!filterStage ? 'border-forest-600 bg-forest-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              All folders ({documents.length})
            </button>
            {STAGES.map(stage => (
              <button
                key={stage.id}
                onClick={() => setFilterStage(stage.id)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium ${filterStage === stage.id ? 'border-forest-600 bg-forest-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {stage.short} ({stageCounts[stage.id] || 0})
              </button>
            ))}
          </div>

          <div className="mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Document register</h2>
          </div>
          <div className="flex flex-wrap gap-3 mb-5">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 w-56"
              />
            </div>
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500">
              <option value="">All projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500">
              <option value="">All categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
            </select>
            {(search || filterProject || filterCategory || filterStage) && (
              <button onClick={() => { setSearch(''); setFilterProject(''); setFilterCategory(''); setFilterStage('') }} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Clear</button>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-forest-100 bg-forest-50/60 p-3">
              <span className="text-xs font-semibold text-forest-800">{selectedIds.length} selected</span>
              <select className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs outline-none focus:border-ocean-400" value={bulk.projectId} onChange={e => setBulk(current => ({ ...current, projectId: e.target.value }))}>
                <option value="">Project</option>
                {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
              <select className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs outline-none focus:border-ocean-400" value={bulk.stageId} onChange={e => setBulk(current => ({ ...current, stageId: e.target.value }))}>
                <option value="">Stage folder</option>
                {STAGES.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
              </select>
              <select className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs outline-none focus:border-ocean-400" value={bulk.category} onChange={e => setBulk(current => ({ ...current, category: e.target.value }))}>
                <option value="">Category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
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

          {openError && (
            <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{openError}</div>
          )}

          {filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400 text-sm">
              {documents.length === 0 ? 'No documents yet. Drop files above or add a link to get started.' : 'No documents match your filters.'}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th className="w-8 px-4 py-3">
                      <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} className="h-4 w-4 rounded border-gray-300 text-forest-600 focus:ring-forest-500" />
                    </th>
                    <th className="text-left px-5 py-3 font-medium">Name</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Stage</th>
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
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selected.has(doc.id)} onChange={() => toggleSelected(doc.id)} className="h-4 w-4 rounded border-gray-300 text-forest-600 focus:ring-forest-500" />
                        </td>
                        <td className="px-5 py-3">
                          <button
                            type="button"
                            onClick={() => openDocument(doc)}
                            className="font-medium text-gray-800 hover:text-ocean-600 flex items-center gap-1.5 group text-left"
                          >
                            {doc.name}
                            <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-ocean-400" />
                          </button>
                          <SourceBadge source={doc.source} />
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-xs text-gray-500">{STAGE_MAP[doc.stageId]?.label || 'General'}</td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAT_COLORS[doc.category] || CAT_COLORS.other}`}>
                            {CAT_LABELS[doc.category] || doc.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{project?.name || 'General'}</td>
                        <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell max-w-[200px] truncate">{doc.notes || 'No notes'}</td>
                        <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell">{doc.createdAt ? fmtDate(doc.createdAt) : 'Not saved'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => setModal(doc)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                              <Pencil size={13} />
                            </button>
                            {deleteConfirm === doc.id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => { deleteDocument(doc.id); setDeleteConfirm(null) }} className="text-xs text-red-600 hover:text-red-800 font-medium px-1.5 py-1">Delete</button>
                                <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-400 hover:text-gray-600 px-1">Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => setDeleteConfirm(doc.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
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
      </div>
    </div>
  )
}
