import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  FolderPlus,
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
import { supabase } from '../lib/supabase'
import { STAGES, STAGE_MAP } from '../data/stages'
import ShareDocumentsModal from './ShareDocumentsModal'

export const DOCUMENT_BUCKET = 'documents'
export const SALES_DOCUMENT_PROJECT_PREFIX = 'sales:'
export const salesDocumentProjectId = projectId => `${SALES_DOCUMENT_PROJECT_PREFIX}${projectId}`
export const salesDocumentProjectOption = project => ({
  id: salesDocumentProjectId(project.id),
  name: `${project.name} (Sales)`,
  rawName: project.name,
  kind: 'sales',
  salesProjectId: project.id,
})

export const DOCUMENT_CATEGORIES = ['contract', 'consent', 'drawing', 'report', 'invoice', 'photo', 'email', 'other']
export const DOCUMENT_CATEGORY_LABELS = {
  contract: 'Contract',
  consent: 'Consent',
  drawing: 'Drawing',
  report: 'Report',
  invoice: 'Invoice',
  photo: 'Photo',
  email: 'Email',
  other: 'Other',
}
export const DOCUMENT_CATEGORY_COLORS = {
  contract: 'bg-ocean-50 text-ocean-700',
  consent: 'bg-purple-50 text-purple-700',
  drawing: 'bg-teal-50 text-teal-700',
  report: 'bg-amber-50 text-amber-700',
  invoice: 'bg-green-50 text-green-700',
  photo: 'bg-pink-50 text-pink-700',
  email: 'bg-sky-50 text-sky-700',
  other: 'bg-gray-100 text-gray-600',
}

const DOCUMENT_STATUS_OPTIONS = ['current', 'draft', 'for review', 'issued', 'approved', 'superseded']
const DOCUMENT_STATUS_LABELS = {
  current: 'Current',
  draft: 'Draft',
  'for review': 'For review',
  issued: 'Issued',
  approved: 'Approved',
  superseded: 'Superseded',
}
const DOCUMENT_STATUS_COLORS = {
  current: 'bg-green-50 text-green-700 border-green-100',
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  'for review': 'bg-amber-50 text-amber-700 border-amber-100',
  issued: 'bg-ocean-50 text-ocean-700 border-ocean-100',
  approved: 'bg-forest-50 text-forest-700 border-forest-100',
  superseded: 'bg-red-50 text-red-700 border-red-100',
}
const STAGE_COLORS = {
  feasibility: 'bg-slate-50 text-slate-700 border-slate-200',
  acquisition: 'bg-sky-50 text-sky-700 border-sky-100',
  funding: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  rc: 'bg-purple-50 text-purple-700 border-purple-100',
  bc: 'bg-blue-50 text-blue-700 border-blue-100',
  epa: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  pricing: 'bg-orange-50 text-orange-700 border-orange-100',
  sales: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  build: 'bg-stone-100 text-stone-700 border-stone-200',
  handover: 'bg-teal-50 text-teal-700 border-teal-100',
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

const projectName = (projects, id) => projects.find(project => project.id === id)?.name || 'General'

const stageLabel = stageId => STAGE_MAP[stageId]?.label || 'General'
const stageFolderPath = stageId => stageLabel(stageId)
const normalizePath = value => (value || '').split('/').map(part => part.trim()).filter(Boolean).join('/')
const parentPath = path => {
  const parts = normalizePath(path).split('/').filter(Boolean)
  parts.pop()
  return parts.join('/')
}
const pathDepth = path => normalizePath(path).split('/').filter(Boolean).length
const isPathInScope = (doc, folderPath) => {
  const target = normalizePath(folderPath)
  if (!target) return true
  const docPath = normalizePath(doc.folderPath || stageFolderPath(doc.stageId))
  return docPath === target || docPath.startsWith(`${target}/`)
}

function SourceBadge({ source }) {
  if (!source) return null
  const label = SOURCE_LABELS[source] || source
  const Icon = source === 'upload' ? FileText : Link2
  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded bg-forest-50 px-1.5 py-0.5 text-[10px] font-semibold text-forest-700">
      <Icon size={10} />
      {label}
    </span>
  )
}

function DocModal({ doc, projects, fixedProjectId = '', defaultProjectId = '', onClose, onSave }) {
  const lockedProjectId = fixedProjectId || ''
  const [form, setForm] = useState({
    name: doc?.name || '',
    url: doc?.url || doc?.driveUrl || '',
    projectId: lockedProjectId || doc?.projectId || defaultProjectId || '',
    stageId: doc?.stageId || 'feasibility',
    folderPath: doc?.folderPath || stageFolderPath(doc?.stageId || 'feasibility'),
    category: doc?.category || 'other',
    revision: doc?.revision || '',
    drawingNumber: doc?.drawingNumber || '',
    discipline: doc?.discipline || '',
    issuedFor: doc?.issuedFor || '',
    documentStatus: doc?.documentStatus || 'current',
    addedBy: doc?.addedBy || '',
    notes: doc?.notes || '',
  })

  useEffect(() => {
    if (lockedProjectId) setForm(current => ({ ...current, projectId: lockedProjectId }))
  }, [lockedProjectId])

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const setStage = value => setForm(current => ({
    ...current,
    stageId: value,
    folderPath: current.folderPath && current.folderPath !== stageFolderPath(current.stageId) ? current.folderPath : stageFolderPath(value),
  }))
  const requiresUrl = !doc || doc.source !== 'upload'
  const valid = form.name.trim() && (!requiresUrl || form.url.trim())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <h2 className="font-semibold text-gray-800">{doc ? 'Edit document' : 'Add link'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Document name *</label>
            <input className={inputCls} placeholder="e.g. Beachwaters plans" value={form.name} onChange={event => set('name', event.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">{requiresUrl ? 'Link *' : 'External link'}</label>
            <input className={inputCls} placeholder="https://drive.google.com/..." value={form.url} onChange={event => set('url', event.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Project</label>
              {lockedProjectId ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">{projectName(projects, lockedProjectId)}</div>
              ) : (
                <select className={inputCls} value={form.projectId} onChange={event => set('projectId', event.target.value)}>
                  <option value="">General</option>
                  {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Stage folder</label>
              <select className={inputCls} value={form.stageId} onChange={event => setStage(event.target.value)}>
                {STAGES.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Folder path</label>
            <input className={inputCls} placeholder="e.g. Sales & Marketing/Brochures" value={form.folderPath} onChange={event => set('folderPath', event.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Category</label>
            <select className={inputCls} value={form.category} onChange={event => set('category', event.target.value)}>
              {DOCUMENT_CATEGORIES.map(category => <option key={category} value={category}>{DOCUMENT_CATEGORY_LABELS[category]}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Drawing no.</label>
              <input className={inputCls} value={form.drawingNumber} onChange={event => set('drawingNumber', event.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Revision</label>
              <input className={inputCls} value={form.revision} onChange={event => set('revision', event.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Discipline</label>
              <input className={inputCls} value={form.discipline} onChange={event => set('discipline', event.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Issued for</label>
              <input className={inputCls} value={form.issuedFor} onChange={event => set('issuedFor', event.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Document status</label>
            <select className={inputCls} value={form.documentStatus} onChange={event => set('documentStatus', event.target.value)}>
              {DOCUMENT_STATUS_OPTIONS.map(status => <option key={status} value={status}>{DOCUMENT_STATUS_LABELS[status]}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Added by</label>
            <input className={inputCls} value={form.addedBy} onChange={event => set('addedBy', event.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Notes</label>
            <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Any notes..." value={form.notes} onChange={event => set('notes', event.target.value)} />
          </div>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-gray-100 bg-white px-6 py-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          <button
            disabled={!valid}
            onClick={() => {
              const url = form.url.trim()
              onSave({
                ...form,
                projectId: lockedProjectId || form.projectId,
                folderPath: normalizePath(form.folderPath) || stageFolderPath(form.stageId),
                name: form.name.trim(),
                url,
                notes: form.notes.trim(),
                revision: form.revision.trim(),
                drawingNumber: form.drawingNumber.trim(),
                discipline: form.discipline.trim(),
                issuedFor: form.issuedFor.trim(),
                documentStatus: form.documentStatus,
                addedBy: form.addedBy.trim(),
                source: url ? (url.includes('drive.google.com') ? 'google_drive' : 'manual_link') : doc?.source || 'manual_link',
                driveUrl: url.includes('drive.google.com') ? url : '',
              })
              onClose()
            }}
            className="rounded-lg bg-forest-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-forest-700 disabled:opacity-50"
          >
            {doc ? 'Save' : 'Add link'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DocumentVault({
  projects,
  profile,
  currentUser,
  addDocument,
  fixedProjectId = '',
  defaultProjectId = '',
  onAddLink,
}) {
  const fileInputRef = useRef(null)
  const [vaultOpen, setVaultOpen] = useState(false)
  const [projectId, setProjectId] = useState(fixedProjectId || defaultProjectId || '')
  const [stageId, setStageId] = useState('feasibility')
  const [folderPath, setFolderPath] = useState(stageFolderPath('feasibility'))
  const [category, setCategory] = useState('other')
  const [revision, setRevision] = useState('')
  const [drawingNumber, setDrawingNumber] = useState('')
  const [discipline, setDiscipline] = useState('')
  const [issuedFor, setIssuedFor] = useState('')
  const [documentStatus, setDocumentStatus] = useState('current')
  const [notes, setNotes] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSummary, setUploadSummary] = useState('')

  useEffect(() => {
    if (fixedProjectId) setProjectId(fixedProjectId)
  }, [fixedProjectId])

  const setStage = value => {
    setStageId(value)
    setFolderPath(current => current && current !== stageFolderPath(stageId) ? current : stageFolderPath(value))
  }

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
        const targetProjectId = fixedProjectId || projectId
        const path = `${cleanFolder(targetProjectId)}/${cleanFolder(stageId)}/${crypto.randomUUID()}-${safeName}`
        const { error } = await supabase.storage.from(DOCUMENT_BUCKET).upload(path, file, {
          cacheControl: '3600',
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        })
        if (error) throw error

        const saved = await addDocument({
          projectId: targetProjectId,
          stageId,
          folderPath: normalizePath(folderPath) || stageFolderPath(stageId),
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
          revision,
          drawingNumber,
          discipline,
          issuedFor,
          documentStatus,
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
    <section className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={() => setVaultOpen(value => !value)} className="flex min-w-0 items-center gap-3 text-left">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-forest-50 text-forest-700">
            <FolderOpen size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">Document vault</h2>
              {vaultOpen ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronRight size={15} className="text-gray-400" />}
            </div>
            <p className="mt-0.5 truncate text-xs text-gray-500">
              Upload to {folderPath || stageFolderPath(stageId)} - {DOCUMENT_CATEGORY_LABELS[category]} - {DOCUMENT_STATUS_LABELS[documentStatus]}
            </p>
          </div>
        </button>
        <div className="flex flex-wrap gap-2">
          <button className={iconBtnCls} onClick={onAddLink}>
            <Link2 size={15} />
            Add link
          </button>
          <button className={iconBtnCls} disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
            Upload file
          </button>
          <button className={iconBtnCls} onClick={() => setVaultOpen(value => !value)}>
            {vaultOpen ? 'Hide setup' : 'Upload setup'}
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={event => uploadFiles(event.target.files)} />
        </div>
      </div>

      {vaultOpen && <div className="grid border-t border-gray-100 lg:grid-cols-[minmax(320px,0.9fr)_minmax(420px,1.1fr)]">
        <button
          type="button"
          onDragEnter={event => { event.preventDefault(); setDragActive(true) }}
          onDragOver={event => { event.preventDefault(); setDragActive(true) }}
          onDragLeave={event => { event.preventDefault(); setDragActive(false) }}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`min-h-[120px] border-b border-gray-100 px-4 py-4 text-left transition-colors lg:border-b-0 lg:border-r ${
            dragActive ? 'bg-forest-50' : 'bg-white hover:bg-gray-50'
          } disabled:cursor-wait`}
        >
          <div className="flex h-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 px-4 py-6 text-center">
            {uploading ? <Loader2 size={24} className="animate-spin text-forest-700" /> : <UploadCloud size={26} className="text-forest-700" />}
            <p className="mt-2 text-sm font-semibold text-gray-900">{uploading ? 'Uploading files' : 'Drop files here'}</p>
            <p className="mt-1 text-xs text-gray-500">Saved into the selected folder path</p>
          </div>
        </button>

        <div className="grid gap-3 bg-gray-50/60 px-4 py-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Project</label>
            {fixedProjectId ? (
              <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700">{projectName(projects, fixedProjectId)}</div>
            ) : (
              <select className={inputCls} value={projectId} onChange={event => setProjectId(event.target.value)}>
                <option value="">General</option>
                {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Stage folder</label>
            <select className={inputCls} value={stageId} onChange={event => setStage(event.target.value)}>
              {STAGES.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Folder path</label>
            <input className={inputCls} placeholder="e.g. Sales & Marketing/Brochures" value={folderPath} onChange={event => setFolderPath(event.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Category</label>
            <select className={inputCls} value={category} onChange={event => setCategory(event.target.value)}>
              {DOCUMENT_CATEGORIES.map(item => <option key={item} value={item}>{DOCUMENT_CATEGORY_LABELS[item]}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3 md:col-span-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Drawing no.</label>
              <input className={inputCls} value={drawingNumber} onChange={event => setDrawingNumber(event.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Revision</label>
              <input className={inputCls} value={revision} onChange={event => setRevision(event.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Discipline</label>
              <input className={inputCls} value={discipline} onChange={event => setDiscipline(event.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Issued for</label>
              <input className={inputCls} value={issuedFor} onChange={event => setIssuedFor(event.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Document status</label>
            <select className={inputCls} value={documentStatus} onChange={event => setDocumentStatus(event.target.value)}>
              {DOCUMENT_STATUS_OPTIONS.map(status => <option key={status} value={status}>{DOCUMENT_STATUS_LABELS[status]}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Notes</label>
            <textarea className={`${inputCls} resize-none`} rows={2} value={notes} onChange={event => setNotes(event.target.value)} />
          </div>
          {uploadError && (
            <div className="flex gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
          {uploadSummary && !uploadError && (
            <div className="rounded-lg border border-forest-100 bg-forest-50 p-3 text-xs text-forest-700">
              {uploadSummary}
            </div>
          )}
        </div>
      </div>}
    </section>
  )
}

function EditableSelectChip({ value, options, labels = {}, colors = {}, onChange, className = '' }) {
  return (
    <select
      value={value || ''}
      onChange={event => onChange(event.target.value)}
      className={`max-w-[160px] rounded-full border px-2 py-1 text-xs font-semibold outline-none transition-colors ${colors[value] || 'border-gray-200 bg-gray-100 text-gray-600'} ${className}`}
    >
      {options.map(option => (
        <option key={option.value || option} value={option.value || option}>
          {option.label || labels[option] || option}
        </option>
      ))}
    </select>
  )
}

function FolderPanel({ selectedFolder, setSelectedFolder, folderOptions, folderCounts, addDocumentFolder, newFolder, setNewFolder, folderError, createFolder, fixedProjectId, folderProjectId, setFolderProjectId, projectOptions }) {
  return (
    <aside className="rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Folders</h2>
          <p className="text-xs text-gray-400">Create project document structures</p>
        </div>
        <button
          onClick={() => setSelectedFolder('')}
          className={`rounded-md px-2 py-1 text-xs font-semibold ${!selectedFolder ? 'bg-forest-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          All
        </button>
      </div>
      <div className="max-h-[520px] overflow-auto px-2 py-2">
        {folderOptions.map(path => {
          const depth = Math.max(0, pathDepth(path) - 1)
          const label = path.split('/').pop()
          const active = selectedFolder === path
          return (
            <button
              key={path}
              onClick={() => setSelectedFolder(path)}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm ${active ? 'bg-forest-50 text-forest-800' : 'text-gray-600 hover:bg-gray-50'}`}
              style={{ paddingLeft: `${8 + depth * 14}px` }}
            >
              <span className="flex min-w-0 items-center gap-2">
                <FolderOpen size={15} className={active ? 'text-forest-700' : 'text-gray-400'} />
                <span className="truncate font-medium">{label}</span>
              </span>
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">{folderCounts[path] || 0}</span>
            </button>
          )
        })}
      </div>
      {addDocumentFolder && (
        <div className="space-y-2 border-t border-gray-100 p-3">
          {!fixedProjectId && (
            <select className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs outline-none focus:border-ocean-400" value={folderProjectId} onChange={event => setFolderProjectId(event.target.value)}>
              <option value="">General folders</option>
              {projectOptions.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          )}
          <div className="flex gap-2">
            <input className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2 py-2 text-xs outline-none focus:border-ocean-400" value={newFolder} onChange={event => setNewFolder(event.target.value)} placeholder="New folder" />
            <button onClick={createFolder} disabled={!newFolder.trim()} className="inline-flex items-center gap-1 rounded-lg bg-forest-600 px-3 py-2 text-xs font-semibold text-white hover:bg-forest-700 disabled:opacity-50">
              <FolderPlus size={13} />
              Add
            </button>
          </div>
          {folderError && <div className="rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-700">{folderError}</div>}
        </div>
      )}
    </aside>
  )
}

export default function DocumentHub({
  projects = [],
  documents = [],
  profile,
  currentUser,
  addDocument,
  updateDocument,
  deleteDocument,
  updateBatchDocuments,
  deleteBatchDocuments,
  documentFolders = [],
  addDocumentFolder,
  fixedProjectId = '',
  defaultProjectId = '',
  title = 'Documents',
  subtitle,
  showHeader = false,
  showMainRegisterLink = false,
  className = '',
}) {
  const [searchParams] = useSearchParams()
  const initialProjectFilter = fixedProjectId ? '' : (searchParams.get('project') || '')
  const [search, setSearch] = useState('')
  const [filterProject, setFilterProject] = useState(initialProjectFilter)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStage, setFilterStage] = useState('')
  const [modal, setModal] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [openError, setOpenError] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [bulk, setBulk] = useState({ projectId: '', stageId: '', category: '' })
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [shareDocs, setShareDocs] = useState(null)
  const [selectedFolder, setSelectedFolder] = useState('')
  const [newFolder, setNewFolder] = useState('')
  const [folderError, setFolderError] = useState('')
  const [folderProjectId, setFolderProjectId] = useState(fixedProjectId || defaultProjectId || initialProjectFilter || '')

  const projectOptions = useMemo(() => projects.filter(Boolean), [projects])
  const scopedDocuments = useMemo(() => (
    fixedProjectId ? documents.filter(doc => doc.projectId === fixedProjectId) : documents
  ), [documents, fixedProjectId])

  const scopedFolders = useMemo(() => documentFolders.filter(folder => {
    const projectMatch = fixedProjectId ? folder.projectId === fixedProjectId : (!filterProject || folder.projectId === filterProject || !folder.projectId)
    return projectMatch
  }), [documentFolders, fixedProjectId, filterProject])

  const folderOptions = useMemo(() => {
    const paths = new Set(STAGES.map(stage => stageFolderPath(stage.id)))
    scopedFolders.forEach(folder => {
      if (folder.path) paths.add(normalizePath(folder.path))
    })
    scopedDocuments.forEach(doc => {
      const docPath = normalizePath(doc.folderPath || stageFolderPath(doc.stageId))
      if (!docPath) return
      const parts = docPath.split('/')
      for (let index = 1; index <= parts.length; index += 1) {
        paths.add(parts.slice(0, index).join('/'))
      }
    })
    return [...paths].filter(Boolean).sort((a, b) => a.localeCompare(b))
  }, [scopedDocuments, scopedFolders])

  const stageCounts = useMemo(() => {
    const counts = Object.fromEntries(STAGES.map(stage => [stage.id, 0]))
    scopedDocuments.forEach(doc => {
      if (doc.stageId && counts[doc.stageId] !== undefined) counts[doc.stageId] += 1
    })
    return counts
  }, [scopedDocuments])

  const folderCounts = useMemo(() => {
    const counts = {}
    folderOptions.forEach(path => { counts[path] = 0 })
    scopedDocuments.forEach(doc => {
      const docPath = normalizePath(doc.folderPath || stageFolderPath(doc.stageId))
      folderOptions.forEach(path => {
        if (isPathInScope({ ...doc, folderPath: docPath }, path)) counts[path] = (counts[path] || 0) + 1
      })
    })
    return counts
  }, [folderOptions, scopedDocuments])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return scopedDocuments.filter(doc => {
      if (!fixedProjectId && filterProject && doc.projectId !== filterProject) return false
      if (filterCategory && doc.category !== filterCategory) return false
      if (filterStage && doc.stageId !== filterStage) return false
      if (selectedFolder && !isPathInScope(doc, selectedFolder)) return false
      const searchable = [doc.name, doc.notes, doc.drawingNumber, doc.revision, doc.discipline, doc.fileName].filter(Boolean).join(' ').toLowerCase()
      if (term && !searchable.includes(term)) return false
      return true
    })
  }, [scopedDocuments, fixedProjectId, filterProject, filterCategory, filterStage, selectedFolder, search])

  const selectedIds = [...selected].filter(id => scopedDocuments.some(doc => doc.id === id))
  const selectedDocs = scopedDocuments.filter(doc => selectedIds.includes(doc.id))
  const visibleIds = filtered.map(doc => doc.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selected.has(id))
  const registerHref = fixedProjectId ? `/documents?project=${encodeURIComponent(fixedProjectId)}` : '/documents'

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
    if (!fixedProjectId && bulk.projectId) payload.projectId = bulk.projectId
    if (bulk.stageId) payload.stageId = bulk.stageId
    if (bulk.category) payload.category = bulk.category
    if (!Object.keys(payload).length) return
    await updateBatchDocuments(selectedIds, payload)
    setBulk({ projectId: '', stageId: '', category: '' })
    setSelected(new Set())
  }

  const createFolder = async () => {
    const name = newFolder.trim()
    if (!name || !addDocumentFolder) return
    setFolderError('')
    const basePath = selectedFolder || stageFolderPath(filterStage || 'feasibility')
    const path = normalizePath(`${basePath}/${name}`)
    const folder = await addDocumentFolder({
      projectId: fixedProjectId || folderProjectId || filterProject || '',
      name,
      path,
      parentPath: parentPath(path),
      createdBy: currentUser || profile?.name || '',
    })
    if (folder) {
      setSelectedFolder(path)
      setNewFolder('')
    } else {
      setFolderError('Folder storage is not set up yet. Run the document folder migration, then try again.')
    }
  }

  const updateDocMeta = (doc, data) => updateDocument(doc.id, data)

  const removeSelected = async () => {
    await deleteBatchDocuments(selectedIds)
    setSelected(new Set())
    setConfirmBulkDelete(false)
  }

  const fmtDate = value => new Date(value).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })

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

  const header = (
    <div className="shrink-0 border-b border-gray-100 bg-white px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{title}</h1>
          <p className="mt-0.5 text-sm text-gray-400">{subtitle || `${scopedDocuments.length} document${scopedDocuments.length !== 1 ? 's' : ''}`}</p>
        </div>
        <button
          onClick={() => setModal('add')}
          className="inline-flex items-center gap-2 rounded-lg bg-forest-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-forest-700"
        >
          <Plus size={15} />
          Add link
        </button>
      </div>
    </div>
  )

  const content = (
    <div className={showHeader ? 'mx-auto max-w-7xl p-6' : `space-y-6 ${className}`}>
      {showMainRegisterLink && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
            <p className="mt-0.5 text-xs text-gray-500">This view writes to the same central document register.</p>
          </div>
          <Link to={registerHref} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Open main Documents
            <ExternalLink size={14} />
          </Link>
        </div>
      )}

      <DocumentVault
        projects={projectOptions}
        profile={profile}
        currentUser={currentUser}
        addDocument={addDocument}
        fixedProjectId={fixedProjectId}
        defaultProjectId={defaultProjectId}
        onAddLink={() => setModal('add')}
      />

      <div className="grid gap-4 lg:grid-cols-[270px_minmax(0,1fr)]">
        <FolderPanel
          selectedFolder={selectedFolder}
          setSelectedFolder={setSelectedFolder}
          folderOptions={folderOptions}
          folderCounts={folderCounts}
          addDocumentFolder={addDocumentFolder}
          newFolder={newFolder}
          setNewFolder={setNewFolder}
          folderError={folderError}
          createFolder={createFolder}
          fixedProjectId={fixedProjectId}
          folderProjectId={folderProjectId}
          setFolderProjectId={setFolderProjectId}
          projectOptions={projectOptions}
        />

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Document register</h2>
              <p className="mt-0.5 text-xs text-gray-400">{selectedFolder || 'All folders'} - {filtered.length} shown</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {STAGES.map(stage => (
                <button
                  key={stage.id}
                  onClick={() => { setFilterStage(filterStage === stage.id ? '' : stage.id); setSelectedFolder(filterStage === stage.id ? '' : stageFolderPath(stage.id)) }}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${filterStage === stage.id ? 'border-forest-600 bg-forest-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  {stage.short} ({stageCounts[stage.id] || 0})
                </button>
              ))}
            </div>
          </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={event => setSearch(event.target.value)}
            className="w-56 rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
          />
        </div>
        {!fixedProjectId && (
          <select value={filterProject} onChange={event => setFilterProject(event.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500">
            <option value="">All projects</option>
            {projectOptions.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        )}
        <select value={filterCategory} onChange={event => setFilterCategory(event.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500">
          <option value="">All categories</option>
          {DOCUMENT_CATEGORIES.map(category => <option key={category} value={category}>{DOCUMENT_CATEGORY_LABELS[category]}</option>)}
        </select>
        {(search || filterProject || filterCategory || filterStage || selectedFolder) && (
          <button onClick={() => { setSearch(''); setFilterProject(''); setFilterCategory(''); setFilterStage(''); setSelectedFolder('') }} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Clear</button>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-forest-100 bg-forest-50/60 p-3">
          <span className="text-xs font-semibold text-forest-800">{selectedIds.length} selected</span>
          {!fixedProjectId && (
            <select className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs outline-none focus:border-ocean-400" value={bulk.projectId} onChange={event => setBulk(current => ({ ...current, projectId: event.target.value }))}>
              <option value="">Project</option>
              {projectOptions.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          )}
          <select className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs outline-none focus:border-ocean-400" value={bulk.stageId} onChange={event => setBulk(current => ({ ...current, stageId: event.target.value }))}>
            <option value="">Stage folder</option>
            {STAGES.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
          </select>
          <select className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs outline-none focus:border-ocean-400" value={bulk.category} onChange={event => setBulk(current => ({ ...current, category: event.target.value }))}>
            <option value="">Category</option>
            {DOCUMENT_CATEGORIES.map(category => <option key={category} value={category}>{DOCUMENT_CATEGORY_LABELS[category]}</option>)}
          </select>
          <button onClick={applyBulk} className="h-8 rounded-md bg-forest-600 px-3 text-xs font-semibold text-white hover:bg-forest-700">Apply</button>
          <button onClick={() => setShareDocs(selectedDocs)} className="h-8 rounded-md border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50">Share selected</button>
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
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{openError}</div>
      )}

      {filtered.length === 0 ? (
        <div className="py-20 text-center text-sm text-gray-400">
          {scopedDocuments.length === 0 ? 'No documents yet. Drop files above or add a link to get started.' : 'No documents match your filters.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full min-w-[1180px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
                <th className="w-8 px-4 py-3">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} className="h-4 w-4 rounded border-gray-300 text-forest-600 focus:ring-forest-500" />
                </th>
                <th className="px-5 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Folder</th>
                <th className="px-4 py-3 text-left font-medium">Stage</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                {!fixedProjectId && <th className="px-4 py-3 text-left font-medium">Project</th>}
                <th className="px-4 py-3 text-left font-medium">Notes</th>
                <th className="px-4 py-3 text-left font-medium">Added by</th>
                <th className="px-4 py-3 text-left font-medium">Added</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(doc => {
                const project = projectOptions.find(item => item.id === doc.projectId)
                const docFolder = normalizePath(doc.folderPath || stageFolderPath(doc.stageId))
                return (
                  <tr key={doc.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <input type="checkbox" checked={selected.has(doc.id)} onChange={() => toggleSelected(doc.id)} className="h-4 w-4 rounded border-gray-300 text-forest-600 focus:ring-forest-500" />
                    </td>
                    <td className="px-5 py-2">
                      <button type="button" onClick={() => openDocument(doc)} className="group flex items-center gap-1.5 text-left font-medium text-gray-800 hover:text-ocean-600">
                        {doc.name}
                        <ExternalLink size={12} className="text-ocean-400 opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                      <SourceBadge source={doc.source} />
                      {(doc.drawingNumber || doc.revision || doc.discipline || doc.issuedFor || doc.documentStatus) && (
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-400">
                          {doc.drawingNumber && <span>{doc.drawingNumber}</span>}
                          {doc.revision && <span>Rev {doc.revision}</span>}
                          {doc.discipline && <span>{doc.discipline}</span>}
                          {doc.issuedFor && <span>{doc.issuedFor}</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={docFolder}
                        onChange={event => updateDocMeta(doc, { folderPath: event.target.value })}
                        className="max-w-[190px] rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 outline-none focus:border-ocean-400"
                      >
                        {folderOptions.map(path => <option key={path} value={path}>{path}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <EditableSelectChip
                        value={doc.stageId || 'feasibility'}
                        options={STAGES.map(stage => ({ value: stage.id, label: stage.short }))}
                        colors={STAGE_COLORS}
                        onChange={value => updateDocMeta(doc, { stageId: value, folderPath: stageFolderPath(value) })}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <EditableSelectChip
                        value={doc.category || 'other'}
                        options={DOCUMENT_CATEGORIES}
                        labels={DOCUMENT_CATEGORY_LABELS}
                        colors={DOCUMENT_CATEGORY_COLORS}
                        onChange={value => updateDocMeta(doc, { category: value })}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <EditableSelectChip
                        value={doc.documentStatus || 'current'}
                        options={DOCUMENT_STATUS_OPTIONS}
                        labels={DOCUMENT_STATUS_LABELS}
                        colors={DOCUMENT_STATUS_COLORS}
                        onChange={value => updateDocMeta(doc, { documentStatus: value })}
                      />
                    </td>
                    {!fixedProjectId && <td className="px-4 py-2 text-xs text-gray-500">{project?.name || 'General'}</td>}
                    <td className="max-w-[190px] px-4 py-2">
                      <button onClick={() => setModal(doc)} className="max-w-full truncate rounded-full border border-gray-200 bg-white px-2 py-1 text-left text-xs font-medium text-gray-500 hover:bg-gray-50">
                        {doc.notes || 'Add notes'}
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      <button onClick={() => setModal(doc)} className="rounded-full bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100">
                        {doc.addedBy || 'Add person'}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-400">{doc.createdAt ? fmtDate(doc.createdAt) : 'Not saved'}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setModal(doc)} className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
                          <Pencil size={13} />
                        </button>
                        {deleteConfirm === doc.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => { deleteDocument(doc.id); setDeleteConfirm(null) }} className="px-1.5 py-1 text-xs font-medium text-red-600 hover:text-red-800">Delete</button>
                            <button onClick={() => setDeleteConfirm(null)} className="px-1 py-1 text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(doc.id)} className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500">
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
        </div>
      </div>

      {modal && (
        <DocModal
          doc={modal === 'add' ? null : modal}
          projects={projectOptions}
          fixedProjectId={fixedProjectId}
          defaultProjectId={defaultProjectId}
          onClose={() => setModal(null)}
          onSave={form => {
            if (modal === 'add') addDocument(form)
            else updateDocument(modal.id, form)
          }}
        />
      )}
      {shareDocs && (
        <ShareDocumentsModal
          project={projectOptions.find(project => project.id === shareDocs[0]?.projectId) || null}
          documents={shareDocs}
          onClose={() => setShareDocs(null)}
        />
      )}
    </div>
  )

  if (showHeader) {
    return (
      <div className="flex h-full flex-col">
        {header}
        <div className="flex-1 overflow-auto">{content}</div>
      </div>
    )
  }

  return content
}
