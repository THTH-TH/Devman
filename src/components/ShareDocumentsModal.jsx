import { useMemo, useState } from 'react'
import { Check, Copy, ExternalLink, Loader2, X } from 'lucide-react'
import useStore from '../store/useStore'
import { STAGE_MAP } from '../data/stages'

const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-ocean-400'

function toSnapshot(doc) {
  return {
    id: doc.id,
    name: doc.name,
    url: doc.url || doc.driveUrl || '',
    source: doc.source || '',
    storagePath: doc.storagePath || '',
    category: doc.category || '',
    stageId: doc.stageId || '',
    revision: doc.revision || '',
    drawingNumber: doc.drawingNumber || '',
    discipline: doc.discipline || '',
    issuedFor: doc.issuedFor || '',
    documentStatus: doc.documentStatus || '',
    notes: doc.notes || '',
  }
}

export default function ShareDocumentsModal({ project, documents, onClose }) {
  const { addDocumentShare, currentUser } = useStore()
  const [title, setTitle] = useState(`${project?.name || 'Archispace'} document issue`)
  const [expiryDays, setExpiryDays] = useState(14)
  const [saving, setSaving] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const hasPrivateUploads = useMemo(() => documents.some(doc => doc.storagePath), [documents])

  const createShare = async () => {
    setSaving(true)
    const expiresAt = expiryDays ? new Date(Date.now() + Number(expiryDays) * 86400000).toISOString() : null
    const share = await addDocumentShare({
      projectId: project?.id || documents[0]?.projectId || '',
      documentIds: documents.map(doc => doc.id),
      documentSnapshot: documents.map(toSnapshot),
      title,
      expiresAt,
      createdBy: currentUser,
    })
    const url = `${window.location.origin}/share/${share.token}`
    setShareUrl(url)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={event => event.target === event.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-sm font-bold text-gray-900">Share selected documents</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="rounded-xl bg-gray-50 p-3">
            <div className="mb-2 text-xs font-semibold text-gray-500">{documents.length} document{documents.length !== 1 ? 's' : ''}</div>
            <div className="max-h-32 space-y-1 overflow-auto">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate font-medium text-gray-700">{doc.name}</span>
                  <span className="shrink-0 text-gray-400">{STAGE_MAP[doc.stageId]?.short || 'General'}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Issue title</label>
            <input className={inputCls} value={title} onChange={event => setTitle(event.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Expires after</label>
            <select className={inputCls} value={expiryDays} onChange={event => setExpiryDays(Number(event.target.value))}>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
            </select>
          </div>

          {hasPrivateUploads && (
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              Private uploaded files need `SUPABASE_SERVICE_ROLE_KEY` in Vercel to create signed external download links. Drive/web links still open from the share page.
            </div>
          )}

          {shareUrl && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-emerald-700">
                <Check size={13} /> Share link created {copied ? 'and copied' : ''}
              </div>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="break-all text-xs text-ocean-700 hover:underline">{shareUrl}</a>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4">
          {shareUrl ? (
            <>
              <button onClick={() => navigator.clipboard.writeText(shareUrl).then(() => setCopied(true))} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                <Copy size={14} /> Copy
              </button>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-forest-600 px-3 py-2 text-sm font-semibold text-white hover:bg-forest-700">
                <ExternalLink size={14} /> Open
              </a>
            </>
          ) : (
            <button onClick={createShare} disabled={saving || !documents.length} className="inline-flex items-center gap-2 rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-700 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin" />}
              Create expiring link
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
