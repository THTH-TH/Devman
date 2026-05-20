import { useMemo, useState } from 'react'
import { Bot, Check, Loader2, Sparkles, X } from 'lucide-react'
import useStore from '../store/useStore'

const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-ocean-400'

export default function AiDraftActionsPanel({ project }) {
  const {
    checklistItems,
    scheduleTasks,
    documents,
    dailyLogs,
    projectContacts,
    propertyProfiles,
    aiActionDrafts,
    addAiActionDraft,
    updateAiActionDraft,
    applyAiActionDraft,
    dismissAiActionDraft,
  } = useStore()
  const [open, setOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [payloadText, setPayloadText] = useState('')

  const projectDrafts = useMemo(
    () => aiActionDrafts.filter(draft => draft.projectId === project.id && draft.status === 'pending'),
    [aiActionDrafts, project.id]
  )

  const context = useMemo(() => ({
    project,
    checklistItems: checklistItems.filter(item => item.projectId === project.id),
    scheduleTasks: scheduleTasks.filter(item => item.projectId === project.id),
    documents: documents.filter(item => item.projectId === project.id),
    dailyLogs: dailyLogs.filter(item => item.projectId === project.id).slice(0, 10),
    projectContacts: projectContacts.filter(item => item.projectId === project.id),
    propertyProfile: propertyProfiles.find(item => item.projectId === project.id) || null,
  }), [project, checklistItems, scheduleTasks, documents, dailyLogs, projectContacts, propertyProfiles])

  const generate = async () => {
    setGenerating(true)
    setError('')
    try {
      const response = await fetch('/api/ai/draft-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not draft actions')
      const drafts = Array.isArray(data.drafts) ? data.drafts : []
      await Promise.all(drafts.map(draft => addAiActionDraft({
        projectId: project.id,
        actionType: draft.actionType || draft.action_type || 'priority_summary',
        title: draft.title || 'Suggested action',
        rationale: draft.rationale || '',
        payload: draft.payload || {},
      })))
      setOpen(true)
    } catch (err) {
      setError(err.message || 'Could not draft actions')
    } finally {
      setGenerating(false)
    }
  }

  const startEdit = draft => {
    setEditing(draft)
    setPayloadText(JSON.stringify(draft.payload || {}, null, 2))
  }

  const saveEdit = async () => {
    if (!editing) return
    try {
      const payload = JSON.parse(payloadText || '{}')
      await updateAiActionDraft(editing.id, { payload })
      setEditing(null)
      setPayloadText('')
    } catch {
      setError('Payload must be valid JSON before saving.')
    }
  }

  return (
    <section className="rounded-xl border border-forest-100 bg-forest-50/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-forest-700">
            <Bot size={17} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Suggested actions</h3>
            <p className="text-xs text-gray-500">AI can draft priorities, recovery tasks and warnings. You approve everything before records change.</p>
            {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          {projectDrafts.length > 0 && (
            <button onClick={() => setOpen(true)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              Review {projectDrafts.length}
            </button>
          )}
          <button onClick={generate} disabled={generating} className="inline-flex items-center gap-2 rounded-lg bg-forest-600 px-3 py-2 text-xs font-semibold text-white hover:bg-forest-700 disabled:opacity-60">
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Draft actions
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={event => event.target === event.currentTarget && setOpen(false)}>
          <div className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Review AI drafts</h3>
                <p className="text-xs text-gray-500">Apply, edit, or dismiss. No silent changes.</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-700"><X size={16} /></button>
            </div>

            <div className="space-y-3 p-5">
              {projectDrafts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">No pending drafts.</div>
              ) : projectDrafts.map(draft => (
                <div key={draft.id} className="rounded-xl border border-gray-100 p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-gray-900">{draft.title}</div>
                      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">{draft.actionType}</div>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-gray-600">{draft.rationale}</p>
                  {editing?.id === draft.id ? (
                    <div className="mt-3 space-y-2">
                      <textarea className={`${inputCls} min-h-[150px] font-mono text-xs`} value={payloadText} onChange={event => setPayloadText(event.target.value)} />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditing(null)} className="rounded-lg px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50">Cancel</button>
                        <button onClick={saveEdit} className="rounded-lg bg-forest-600 px-3 py-2 text-xs font-semibold text-white hover:bg-forest-700">Save payload</button>
                      </div>
                    </div>
                  ) : (
                    <pre className="mt-3 max-h-32 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-600">{JSON.stringify(draft.payload || {}, null, 2)}</pre>
                  )}
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <button onClick={() => startEdit(draft)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">Edit</button>
                    <button onClick={() => dismissAiActionDraft(draft.id)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50">
                      <X size={13} /> Dismiss
                    </button>
                    <button onClick={() => applyAiActionDraft(draft.id)} className="inline-flex items-center gap-1 rounded-lg bg-forest-600 px-3 py-2 text-xs font-semibold text-white hover:bg-forest-700">
                      <Check size={13} /> Apply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
