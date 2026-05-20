import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertCircle, ExternalLink, FileText, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

function mapSnapshot(doc) {
  return {
    id: doc.id,
    name: doc.name || 'Document',
    url: doc.url || doc.driveUrl || '',
    source: doc.source || '',
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

export default function SharePage() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [share, setShare] = useState(null)
  const [documents, setDocuments] = useState([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`/api/share/${token}`)
        const raw = await response.text()
        let data = {}
        try {
          data = raw ? JSON.parse(raw) : {}
        } catch {
          data = { error: 'Share API is not available in this local dev server.' }
        }
        if (response.ok && Array.isArray(data.documents)) {
          if (!cancelled) {
            setShare(data.share)
            setDocuments(data.documents || [])
          }
          return
        }

        const { data: fallback, error: shareError } = await supabase
          .from('document_shares')
          .select('*')
          .eq('token', token)
          .maybeSingle()
        if (shareError) throw shareError
        if (!fallback) throw new Error(data.error || 'Share link not found')
        if (fallback.revoked_at) throw new Error('Share link has been revoked')
        if (fallback.expires_at && new Date(fallback.expires_at) < new Date()) throw new Error('Share link has expired')
        if (!cancelled) {
          setShare({ title: fallback.title, expiresAt: fallback.expires_at, createdAt: fallback.created_at, createdBy: fallback.created_by })
          setDocuments((fallback.document_snapshot || []).map(mapSnapshot))
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not open share link')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [token])

  return (
    <div className="min-h-screen bg-offwhite">
      <header className="border-b border-gray-100 bg-white px-6 py-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <div className="text-lg font-bold text-gray-900">Archispace</div>
            <div className="text-xs text-gray-500">Shared document issue</div>
          </div>
          {share?.expiresAt && (
            <div className="text-right text-xs text-gray-500">
              Expires {new Date(share.expiresAt).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-500">
            <Loader2 size={18} className="mr-2 animate-spin" /> Opening share link
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-red-700">
            <div className="mb-1 flex items-center gap-2 text-sm font-bold"><AlertCircle size={16} /> Share unavailable</div>
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{share?.title || 'Shared documents'}</h1>
              <p className="mt-1 text-sm text-gray-500">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              {documents.length === 0 ? (
                <div className="px-6 py-16 text-center text-sm text-gray-400">No documents are attached to this share.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-forest-50 text-forest-700">
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900">{doc.name}</div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                            {doc.drawingNumber && <span>{doc.drawingNumber}</span>}
                            {doc.revision && <span>Rev {doc.revision}</span>}
                            {doc.discipline && <span>{doc.discipline}</span>}
                            {doc.issuedFor && <span>{doc.issuedFor}</span>}
                            {doc.documentStatus && <span>{doc.documentStatus}</span>}
                          </div>
                          {doc.notes && <p className="mt-1 text-xs text-gray-500">{doc.notes}</p>}
                        </div>
                      </div>
                      {doc.url ? (
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-forest-600 px-3 py-2 text-sm font-semibold text-white hover:bg-forest-700">
                          Open <ExternalLink size={13} />
                        </a>
                      ) : (
                        <span className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-500">Private upload unavailable</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
