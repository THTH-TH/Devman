import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ExternalLink, FolderOpen, Link2, Loader2, Mail, RefreshCw, Search } from 'lucide-react'
const inputCls = 'w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500'

function statusLabel(status) {
  if (status.loading) return 'Checking connection...'
  if (status.connected) return `Connected${status.email ? ` as ${status.email}` : ''}`
  return 'Not connected'
}

export default function GoogleWorkspacePanel({ projects, addDocument, updateProject }) {
  const [status, setStatus] = useState({ loading: true, connected: false, email: '', error: '' })
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [folderBusy, setFolderBusy] = useState(false)
  const [gmailQuery, setGmailQuery] = useState('newer_than:30d')
  const [gmailBusy, setGmailBusy] = useState(false)
  const [gmailMessages, setGmailMessages] = useState([])
  const [linkingId, setLinkingId] = useState('')
  const selectedProject = useMemo(
    () => projects.find(project => project.id === selectedProjectId),
    [projects, selectedProjectId]
  )

  const invoke = async (action, payload = {}) => {
    const response = await fetch('/api/google-workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.error || 'Google Workspace request failed')
    if (data?.error) throw new Error(data.error)
    return data
  }

  const refreshStatus = async () => {
    setStatus(current => ({ ...current, loading: true, error: '' }))
    try {
      const data = await invoke('status')
      setStatus({ loading: false, connected: Boolean(data.connected), email: data.email || '', error: '' })
    } catch (err) {
      setStatus({ loading: false, connected: false, email: '', error: err.message || 'Could not check Google connection' })
    }
  }

  useEffect(() => {
    refreshStatus()
    const params = new URLSearchParams(window.location.search)
    if (params.get('google_connected') === 'true' || params.get('google_error')) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const connectGoogle = async () => {
    const data = await invoke('auth_url', {
      redirect_url: `${window.location.origin}/documents`,
      origin: window.location.origin,
    })
    window.location.href = data.auth_url
  }

  const createProjectFolders = async () => {
    if (!selectedProjectId) return
    setFolderBusy(true)
    try {
      const data = await invoke('create_project_folders', { project_id: selectedProjectId })
      await updateProject(selectedProjectId, {
        driveFolderUrl: data.root_folder_url,
        driveRootFolderId: data.root_folder_id,
      })
    } catch (err) {
      setStatus(current => ({ ...current, error: err.message || 'Could not create Drive folders' }))
    } finally {
      setFolderBusy(false)
    }
  }

  const searchGmail = async () => {
    setGmailBusy(true)
    try {
      const data = await invoke('gmail_search', { query: gmailQuery, max_results: 10 })
      setGmailMessages(data.messages || [])
    } catch (err) {
      setStatus(current => ({ ...current, error: err.message || 'Gmail search failed' }))
    } finally {
      setGmailBusy(false)
    }
  }

  const linkGmailMessage = async message => {
    setLinkingId(message.id)
    try {
      await addDocument({
        projectId: selectedProjectId || '',
        name: message.subject || 'Gmail message',
        url: message.url,
        category: 'email',
        notes: [message.from, message.date, message.snippet].filter(Boolean).join(' | '),
        source: 'gmail',
        gmailMessageId: message.id,
        gmailThreadId: message.threadId || '',
      })
    } catch (err) {
      setStatus(current => ({ ...current, error: err.message || 'Could not link Gmail message' }))
    } finally {
      setLinkingId('')
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-10 h-10 rounded-lg bg-forest-50 text-forest-700 flex items-center justify-center shrink-0">
            {status.connected ? <CheckCircle2 size={18} /> : <FolderOpen size={18} />}
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Google Workspace</h2>
            <p className="text-xs text-gray-500 mt-1">{statusLabel(status)}</p>
            {status.error && <p className="text-xs text-red-500 mt-1">{status.error}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={refreshStatus}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          {!status.connected && (
            <button
              onClick={connectGoogle}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-forest-600 text-white rounded-lg hover:bg-forest-700"
            >
              <Link2 size={14} />
              Connect Gmail + Drive
            </button>
          )}
        </div>
      </div>

      {status.connected && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-2 pt-3 border-t border-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-2">
              <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className={inputCls}>
                <option value="">Select project</option>
                {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
              <div className="flex items-center gap-2 text-xs text-gray-500 min-w-0">
                {selectedProject?.driveFolderUrl ? (
                  <a href={selectedProject.driveFolderUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-ocean-600 hover:underline truncate">
                    Open linked Drive folder
                    <ExternalLink size={11} />
                  </a>
                ) : (
                  <span>Select a project to create its Drive folder structure.</span>
                )}
              </div>
            </div>
            <button
              onClick={createProjectFolders}
              disabled={!selectedProjectId || folderBusy}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-forest-600 text-white rounded-lg hover:bg-forest-700 disabled:opacity-50"
            >
              {folderBusy ? <Loader2 size={14} className="animate-spin" /> : <FolderOpen size={14} />}
              Create Drive folders
            </button>
          </div>

          <div className="pt-3 border-t border-gray-50">
            <div className="flex flex-col lg:flex-row lg:items-center gap-2 mb-3">
              <div className="flex items-center gap-2 flex-1">
                <Mail size={15} className="text-forest-600" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Gmail search</h3>
                  <p className="text-xs text-gray-500">Search Gmail and link useful messages back to a project.</p>
                </div>
              </div>
              <div className="flex gap-2 lg:w-[520px]">
                <input
                  value={gmailQuery}
                  onChange={e => setGmailQuery(e.target.value)}
                  className={inputCls}
                  placeholder="from:consultant@example.com newer_than:30d"
                />
                <button
                  onClick={searchGmail}
                  disabled={gmailBusy}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  {gmailBusy ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  Search
                </button>
              </div>
            </div>

            {gmailMessages.length > 0 && (
              <div className="rounded-lg border border-gray-100 overflow-hidden">
                {gmailMessages.map(message => (
                  <div key={message.id} className="px-3 py-2.5 border-b last:border-b-0 border-gray-50 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{message.subject}</div>
                      <div className="text-xs text-gray-500 truncate">{message.from}</div>
                      {message.snippet && <div className="text-xs text-gray-400 truncate mt-0.5">{message.snippet}</div>}
                    </div>
                    <a href={message.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-ocean-600 rounded-md hover:bg-gray-50">
                      <ExternalLink size={13} />
                    </a>
                    <button
                      onClick={() => linkGmailMessage(message)}
                      disabled={linkingId === message.id}
                      className="px-2.5 py-1.5 text-xs font-medium bg-forest-600 text-white rounded-lg hover:bg-forest-700 disabled:opacity-50"
                    >
                      {linkingId === message.id ? 'Linking...' : 'Link'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
