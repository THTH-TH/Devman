import { useEffect, useMemo, useState } from 'react'
import {
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  File,
  Folder,
  FolderOpen,
  Link2,
  Loader2,
  MailPlus,
  RefreshCw,
  Search,
  Share2,
} from 'lucide-react'
import { ARCHISPACE_DRIVE_ROOT } from '../data/driveLibrary'
import {
  googleWorkspaceCallbackOrigin,
  invokeGoogleWorkspace,
} from '../lib/googleWorkspaceApi'

const FOLDER_MIME = 'application/vnd.google-apps.folder'
const inputCls = 'w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500'

function fmtDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtSize(value) {
  const bytes = Number(value)
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(bytes > 10 * 1024 * 1024 ? 0 : 1)} MB`
}

function typeLabel(file) {
  if (!file) return ''
  if (file.mimeType === FOLDER_MIME) return 'Folder'
  if (file.mimeType === 'application/vnd.google-apps.document') return 'Google Doc'
  if (file.mimeType === 'application/vnd.google-apps.spreadsheet') return 'Google Sheet'
  if (file.mimeType === 'application/vnd.google-apps.presentation') return 'Google Slides'
  if (file.mimeType === 'application/pdf') return 'PDF'
  if (file.mimeType?.startsWith('image/')) return 'Image'
  return file.mimeType?.split('/').pop()?.toUpperCase() || 'File'
}

function fileUrl(file) {
  return file?.webViewLink || file?.url || ''
}

function canPreview(file) {
  return Boolean(file?.previewUrl && file?.mimeType !== FOLDER_MIME)
}

function DriveStatus({ status, onConnect, onRefresh }) {
  const needsReconnect = status.connected && !status.hasDriveMirrorAccess
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-5 py-4 mb-5">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-forest-50 text-forest-700 flex items-center justify-center shrink-0">
            {status.loading ? <Loader2 size={18} className="animate-spin" /> : <FolderOpen size={18} />}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-gray-900">Google Drive mirror</h2>
            <p className="text-xs text-gray-500 mt-1">
              {status.loading
                ? 'Checking connection...'
                : status.connected
                  ? `Connected${status.email ? ` as ${status.email}` : ''}`
                  : 'Not connected'}
            </p>
            {needsReconnect && (
              <p className="text-xs text-amber-600 mt-1">
                Reconnect once to grant the full Drive access needed for live browsing and sharing.
              </p>
            )}
            {status.error && <p className="text-xs text-red-500 mt-1">{status.error}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          {(!status.connected || needsReconnect) && (
            <button
              onClick={onConnect}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-forest-600 text-white rounded-lg hover:bg-forest-700"
            >
              <Link2 size={14} />
              {needsReconnect ? 'Reconnect Drive' : 'Connect Drive'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function FileRows({ files, selectedFile, onOpenFolder, onSelectFile }) {
  if (!files.length) {
    return (
      <div className="flex min-h-[260px] items-center justify-center text-sm text-gray-400">
        No files found.
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-50">
      {files.map(file => {
        const selected = selectedFile?.id === file.id
        const isFolder = file.mimeType === FOLDER_MIME
        return (
          <button
            key={file.id}
            type="button"
            onDoubleClick={() => isFolder && onOpenFolder(file)}
            onClick={() => onSelectFile(file)}
            className={`grid w-full grid-cols-1 md:grid-cols-[minmax(0,1fr)_120px_120px] gap-3 px-4 py-3 text-left hover:bg-gray-50 ${selected ? 'bg-forest-50/60' : 'bg-white'}`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {isFolder ? (
                <Folder size={16} className="shrink-0 text-forest-600" />
              ) : (
                <File size={16} className="shrink-0 text-gray-400" />
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-gray-900">{file.name}</div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-400">
                  <span>{typeLabel(file)}</span>
                  {file.shared && <span>Shared</span>}
                  {file.size && <span>{fmtSize(file.size)}</span>}
                </div>
              </div>
            </div>
            <div className="hidden text-xs text-gray-500 md:block truncate">{file.modifiedBy || file.owner || '-'}</div>
            <div className="hidden text-xs text-gray-400 md:block">{fmtDate(file.modifiedTime)}</div>
          </button>
        )
      })}
    </div>
  )
}

function PreviewPanel({ file, projects, addDocument, onOpenFolder, onShared }) {
  const [projectId, setProjectId] = useState('')
  const [category, setCategory] = useState('other')
  const [attachBusy, setAttachBusy] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [shareRole, setShareRole] = useState('reader')
  const [shareBusy, setShareBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setMessage('')
  }, [file?.id])

  if (!file) {
    return (
      <aside className="bg-white border border-gray-100 rounded-xl shadow-sm min-h-[620px] p-5">
        <div className="h-full flex flex-col items-center justify-center text-center text-sm text-gray-400">
          <File size={28} className="mb-3 text-gray-300" />
          Select an item to preview, attach, or share.
        </div>
      </aside>
    )
  }

  const url = fileUrl(file)

  const copyLink = async () => {
    await navigator.clipboard.writeText(url)
    setMessage('Link copied.')
  }

  const attachFile = async () => {
    setAttachBusy(true)
    setMessage('')
    try {
      await addDocument({
        projectId,
        name: file.name,
        url,
        category,
        notes: [typeLabel(file), file.modifiedTime ? `Modified ${fmtDate(file.modifiedTime)}` : ''].filter(Boolean).join(' | '),
        source: 'google_drive',
        driveUrl: url,
        driveFileId: file.id,
      })
      setMessage(projectId ? 'Attached to project register.' : 'Added to document register.')
    } catch (err) {
      setMessage(err.message || 'Could not attach file.')
    } finally {
      setAttachBusy(false)
    }
  }

  const shareFile = async () => {
    if (!shareEmail.trim()) return
    setShareBusy(true)
    setMessage('')
    try {
      await invokeGoogleWorkspace('drive_share', {
        file_id: file.id,
        email: shareEmail.trim(),
        role: shareRole,
      })
      setMessage('Share invite sent.')
      setShareEmail('')
      onShared?.()
    } catch (err) {
      setMessage(err.message || 'Could not share file.')
    } finally {
      setShareBusy(false)
    }
  }

  return (
    <aside className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden min-h-[620px]">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{file.name}</h3>
            <p className="text-xs text-gray-400 mt-1">{typeLabel(file)}{file.size ? ` / ${fmtSize(file.size)}` : ''}</p>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-gray-400 hover:text-forest-700 hover:bg-gray-50 rounded-md"
            title="Open in Google Drive"
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      <div className="h-[360px] bg-gray-50 border-b border-gray-100">
        {canPreview(file) ? (
          <iframe
            title={file.name}
            src={file.previewUrl}
            className="w-full h-full"
            allow="autoplay"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-center px-6 text-sm text-gray-400">
            Preview is not available for this item.
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {file.mimeType === FOLDER_MIME && (
            <button
              onClick={() => onOpenFolder?.(file)}
              className="col-span-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-forest-600 text-white rounded-lg hover:bg-forest-700"
            >
              <FolderOpen size={14} />
              Open folder
            </button>
          )}
          <button
            onClick={copyLink}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Copy size={14} />
            Copy link
          </button>
          {file.webContentLink ? (
            <a
              href={file.webContentLink}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Download size={14} />
              Download
            </a>
          ) : (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <ExternalLink size={14} />
              Open
            </a>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-700">Attach to DevMan</div>
          <select className={inputCls} value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">General document register</option>
            {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <select className={inputCls} value={category} onChange={e => setCategory(e.target.value)}>
            <option value="consent">Consent</option>
            <option value="contract">Contract</option>
            <option value="drawing">Drawing</option>
            <option value="report">Report</option>
            <option value="invoice">Invoice</option>
            <option value="photo">Photo</option>
            <option value="other">Other</option>
          </select>
          <button
            onClick={attachFile}
            disabled={attachBusy}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-forest-600 text-white rounded-lg hover:bg-forest-700 disabled:opacity-50"
          >
            {attachBusy ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
            Attach file
          </button>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-700">Share</div>
          <input className={inputCls} value={shareEmail} onChange={e => setShareEmail(e.target.value)} placeholder="person@example.com" />
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <select className={inputCls} value={shareRole} onChange={e => setShareRole(e.target.value)}>
              <option value="reader">View</option>
              <option value="commenter">Comment</option>
              <option value="writer">Edit</option>
            </select>
            <button
              onClick={shareFile}
              disabled={shareBusy || !shareEmail.trim()}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {shareBusy ? <Loader2 size={14} className="animate-spin" /> : <MailPlus size={14} />}
              Send
            </button>
          </div>
        </div>

        {message && <p className="text-xs text-forest-700">{message}</p>}
      </div>
    </aside>
  )
}

export default function DriveBrowser({ projects, addDocument }) {
  const [status, setStatus] = useState({ loading: true, connected: false, hasDriveMirrorAccess: false, email: '', error: '' })
  const [folderStack, setFolderStack] = useState([{ id: ARCHISPACE_DRIVE_ROOT.id, name: ARCHISPACE_DRIVE_ROOT.name }])
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [callbackError, setCallbackError] = useState('')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)

  const currentFolder = folderStack[folderStack.length - 1]
  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      const aFolder = a.mimeType === FOLDER_MIME ? 0 : 1
      const bFolder = b.mimeType === FOLDER_MIME ? 0 : 1
      if (aFolder !== bFolder) return aFolder - bFolder
      return a.name.localeCompare(b.name)
    })
  }, [files])

  const refreshStatus = async () => {
    setStatus(current => ({ ...current, loading: true, error: '' }))
    try {
      const data = await invokeGoogleWorkspace('status')
      setStatus({
        loading: false,
        connected: Boolean(data.connected),
        hasDriveMirrorAccess: Boolean(data.hasDriveMirrorAccess),
        email: data.email || '',
        error: '',
      })
      return data
    } catch (err) {
      setStatus({ loading: false, connected: false, hasDriveMirrorAccess: false, email: '', error: err.message || 'Could not check Drive connection' })
      return null
    }
  }

  const connectGoogle = async () => {
    const data = await invokeGoogleWorkspace('auth_url', {
      redirect_url: `${window.location.origin}/documents`,
      origin: googleWorkspaceCallbackOrigin(),
    })
    window.location.href = data.auth_url
  }

  const loadFolder = async (folder = currentFolder, stack = folderStack) => {
    setLoading(true)
    setError('')
    setSearching(false)
    try {
      const data = await invokeGoogleWorkspace('drive_list', { folder_id: folder.id })
      setFiles(data.files || [])
      setFolderStack(stack)
      setSelectedFile(null)
    } catch (err) {
      const message = err.message || 'Could not load Drive folder.'
      setError(message)
      if (/insufficient|scope|permission/i.test(message)) {
        setStatus(current => ({ ...current, hasDriveMirrorAccess: false, error: 'Reconnect Drive to grant mirror access.' }))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const googleError = params.get('google_error')
    if (googleError) {
      setCallbackError(decodeURIComponent(googleError.replace(/\+/g, ' ')))
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (params.get('google_connected') === 'true') {
      window.history.replaceState({}, '', window.location.pathname)
    }
    refreshStatus().then(data => {
      if (data?.connected && data?.hasDriveMirrorAccess) loadFolder({ id: ARCHISPACE_DRIVE_ROOT.id, name: ARCHISPACE_DRIVE_ROOT.name }, [{ id: ARCHISPACE_DRIVE_ROOT.id, name: ARCHISPACE_DRIVE_ROOT.name }])
    })
  }, [])

  const openFolder = folder => {
    const nextStack = [...folderStack, { id: folder.id, name: folder.name }]
    loadFolder(folder, nextStack)
  }

  const openBreadcrumb = index => {
    const nextStack = folderStack.slice(0, index + 1)
    loadFolder(nextStack[nextStack.length - 1], nextStack)
  }

  const searchDrive = async () => {
    if (!query.trim()) {
      loadFolder()
      return
    }
    setLoading(true)
    setError('')
    setSearching(true)
    try {
      const data = await invokeGoogleWorkspace('drive_search', { query: query.trim() })
      setFiles(data.files || [])
      setSelectedFile(null)
    } catch (err) {
      setError(err.message || 'Drive search failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mb-7">
      <DriveStatus status={status} onConnect={connectGoogle} onRefresh={() => { refreshStatus(); loadFolder() }} />

      {callbackError && (
        <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          Google did not connect: {callbackError}
        </div>
      )}

      {status.connected && status.hasDriveMirrorAccess && (
        <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_420px] gap-5">
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="flex items-center gap-1 text-sm font-semibold text-gray-800 flex-1 min-w-0 overflow-hidden">
                  {folderStack.map((folder, index) => (
                    <div key={`${folder.id}-${index}`} className="flex items-center gap-1 min-w-0">
                      {index > 0 && <ChevronRight size={13} className="shrink-0 text-gray-300" />}
                      <button
                        type="button"
                        onClick={() => openBreadcrumb(index)}
                        className={`truncate hover:text-forest-700 ${index === folderStack.length - 1 ? 'text-gray-900' : 'text-gray-500'}`}
                      >
                        {folder.name}
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => loadFolder()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-white"
                >
                  <RefreshCw size={13} />
                  Refresh
                </button>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') searchDrive() }}
                    className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500"
                    placeholder="Search Drive..."
                  />
                </div>
                <button
                  onClick={searchDrive}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-forest-600 text-white rounded-lg hover:bg-forest-700"
                >
                  <Search size={14} />
                  Search
                </button>
              </div>
              {searching && (
                <button onClick={() => { setQuery(''); loadFolder() }} className="text-xs font-medium text-forest-700 hover:text-forest-800">
                  Clear search and return to {currentFolder.name}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_120px_120px] gap-3 px-4 py-2 bg-white border-b border-gray-100 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              <div>Name</div>
              <div className="hidden md:block">Modified by</div>
              <div className="hidden md:block">Modified</div>
            </div>

            {error && <div className="px-4 py-3 text-sm text-red-500 border-b border-red-50">{error}</div>}
            {loading ? (
              <div className="flex min-h-[360px] items-center justify-center text-sm text-gray-400">
                <Loader2 size={18} className="mr-2 animate-spin" />
                Loading Drive...
              </div>
            ) : (
              <FileRows
                files={sortedFiles}
                selectedFile={selectedFile}
                onOpenFolder={openFolder}
                onSelectFile={setSelectedFile}
              />
            )}
          </div>

          <PreviewPanel
            file={selectedFile}
            projects={projects}
            addDocument={addDocument}
            onOpenFolder={openFolder}
            onShared={() => loadFolder()}
          />
        </div>
      )}
    </section>
  )
}
