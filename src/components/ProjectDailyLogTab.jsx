import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import useStore from '../store/useStore'

const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function LogModal({ project, log, onClose }) {
  const { addDailyLog, updateDailyLog, deleteDailyLog, currentUser } = useStore()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [form, setForm] = useState({
    logDate: log?.logDate || today(),
    summary: log?.summary || '',
    workCompleted: log?.workCompleted || '',
    blockers: log?.blockers || '',
    nextSteps: log?.nextSteps || '',
    weather: log?.weather || '',
  })

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))

  const save = async () => {
    const payload = {
      ...form,
      projectId: project.id,
      summary: form.summary.trim(),
      workCompleted: form.workCompleted.trim(),
      blockers: form.blockers.trim(),
      nextSteps: form.nextSteps.trim(),
      weather: form.weather.trim(),
      createdBy: currentUser,
    }
    if (log) await updateDailyLog(log.id, payload)
    else await addDailyLog(payload)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={event => event.target === event.currentTarget && onClose()}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-900">{log ? 'Edit daily log' : 'New daily log'}</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-600"><X size={16} /></button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="grid gap-3 md:grid-cols-[160px_1fr]">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Date</label>
              <input type="date" className={inputCls} value={form.logDate} onChange={event => set('logDate', event.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Summary</label>
              <input className={inputCls} value={form.summary} onChange={event => set('summary', event.target.value)} autoFocus />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Work completed</label>
            <textarea className={`${inputCls} resize-none`} rows={3} value={form.workCompleted} onChange={event => set('workCompleted', event.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Blockers / risks</label>
            <textarea className={`${inputCls} resize-none`} rows={2} value={form.blockers} onChange={event => set('blockers', event.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Next steps</label>
            <textarea className={`${inputCls} resize-none`} rows={2} value={form.nextSteps} onChange={event => set('nextSteps', event.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Weather / site note</label>
            <input className={inputCls} value={form.weather} onChange={event => set('weather', event.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          {log ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <button onClick={async () => { await deleteDailyLog(log.id); onClose() }} className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Delete</button>
                <button onClick={() => setConfirmDelete(false)} className="px-1 text-xs text-gray-400">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700"><Trash2 size={12} /> Delete</button>
            )
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-50">Cancel</button>
            <button onClick={save} disabled={!form.summary.trim()} className="rounded-lg bg-forest-600 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 disabled:opacity-50">Save log</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProjectDailyLogTab({ project }) {
  const { dailyLogs } = useStore()
  const [modal, setModal] = useState(null)
  const [dateFilter, setDateFilter] = useState('')

  const logs = useMemo(() => dailyLogs
    .filter(log => log.projectId === project.id)
    .filter(log => !dateFilter || log.logDate === dateFilter)
    .sort((a, b) => String(b.logDate).localeCompare(String(a.logDate))), [dailyLogs, project.id, dateFilter])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input type="date" className={`${inputCls} w-44`} value={dateFilter} onChange={event => setDateFilter(event.target.value)} />
        {dateFilter && <button onClick={() => setDateFilter('')} className="text-sm text-gray-500 hover:text-gray-700">Clear</button>}
        <div className="flex-1" />
        <button onClick={() => setModal({})} className="inline-flex items-center gap-1.5 rounded-lg bg-forest-600 px-3 py-2 text-sm font-medium text-white hover:bg-forest-700"><Plus size={14} /> Add log</button>
      </div>

      <div className="space-y-3">
        {logs.map(log => (
          <article key={log.id} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-gray-400">{log.logDate ? new Date(log.logDate).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date'} · {log.createdBy || 'Team'}</div>
                <h3 className="mt-1 text-sm font-semibold text-gray-900">{log.summary}</h3>
              </div>
              <button onClick={() => setModal(log)} className="rounded p-1.5 text-gray-300 hover:bg-gray-50 hover:text-gray-600"><Pencil size={14} /></button>
            </div>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              {log.workCompleted && <div><div className="mb-1 text-xs font-medium text-gray-400">Work completed</div><p className="text-gray-700 whitespace-pre-wrap">{log.workCompleted}</p></div>}
              {log.nextSteps && <div><div className="mb-1 text-xs font-medium text-gray-400">Next steps</div><p className="text-gray-700 whitespace-pre-wrap">{log.nextSteps}</p></div>}
              {log.blockers && <div className="rounded-lg border border-red-100 bg-red-50 p-3 md:col-span-2"><div className="mb-1 text-xs font-medium text-red-600">Blockers / risks</div><p className="text-sm text-red-700 whitespace-pre-wrap">{log.blockers}</p></div>}
              {log.weather && <div className="md:col-span-2 text-xs text-gray-400">Weather/site note: {log.weather}</div>}
            </div>
          </article>
        ))}
        {logs.length === 0 && <div className="rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center text-sm text-gray-400">No daily logs yet.</div>}
      </div>

      {modal && <LogModal project={project} log={modal.id ? modal : null} onClose={() => setModal(null)} />}
    </div>
  )
}
