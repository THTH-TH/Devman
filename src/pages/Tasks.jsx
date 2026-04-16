import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Sparkles, AlertTriangle } from 'lucide-react'
import useStore from '../store/useStore'
import StatusPill from '../components/StatusPill'
import ChecklistItemModal from '../modals/ChecklistItemModal'
import { STAGE_MAP } from '../data/stages'

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

const priorityColor = p => ({
  critical: 'text-red-600 font-semibold',
  high: 'text-orange-500 font-medium',
  medium: 'text-gray-500',
  low: 'text-gray-400',
}[p] || 'text-gray-500')

export default function Tasks() {
  const { projects, checklistItems, teamMembers, toggleChecklistItem } = useStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const [editItem, setEditItem] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState(null)

  const filterProject = searchParams.get('project') || ''
  const filterOwner = searchParams.get('owner') || ''
  const filterStatus = searchParams.get('status') || 'active'

  const setFilter = (key, val) => {
    const next = new URLSearchParams(searchParams)
    if (val) next.set(key, val)
    else next.delete(key)
    setSearchParams(next)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in7 = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

  const enriched = useMemo(() => {
    return checklistItems.map(i => ({
      ...i,
      project: projects.find(p => p.id === i.projectId),
      stage: STAGE_MAP[i.stageId],
      isOverdue: i.dueDate && !i.done && new Date(i.dueDate) < today,
      isDueSoon: i.dueDate && !i.done && new Date(i.dueDate) >= today && new Date(i.dueDate) <= in7,
    }))
  }, [checklistItems, projects])

  const filtered = useMemo(() => {
    return enriched.filter(i => {
      if (filterProject && i.projectId !== filterProject) return false
      if (filterOwner && i.owner !== filterOwner) return false
      if (filterStatus === 'active') return !i.done
      if (filterStatus === 'overdue') return i.isOverdue
      if (filterStatus === 'due-soon') return i.isDueSoon
      if (filterStatus === 'blocked') return i.isBlocker && !i.done
      if (filterStatus === 'done') return i.done
      return true
    }).sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1
      if (!a.isOverdue && b.isOverdue) return 1
      if (a.isBlocker && !b.isBlocker) return -1
      if (!a.isBlocker && b.isBlocker) return 1
      const pa = PRIORITY_ORDER[a.priority] ?? 2
      const pb = PRIORITY_ORDER[b.priority] ?? 2
      if (pa !== pb) return pa - pb
      if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate)
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      return 0
    })
  }, [enriched, filterProject, filterOwner, filterStatus])

  const owners = useMemo(() => {
    const s = new Set(checklistItems.map(i => i.owner).filter(Boolean))
    return [...s].sort()
  }, [checklistItems])

  const counts = useMemo(() => ({
    active: enriched.filter(i => !i.done).length,
    overdue: enriched.filter(i => i.isOverdue).length,
    dueSoon: enriched.filter(i => i.isDueSoon).length,
    blocked: enriched.filter(i => i.isBlocker && !i.done).length,
  }), [enriched])

  const handleAIPrioritise = async () => {
    setAiLoading(true)
    setAiSuggestion(null)
    const overdueItems = enriched.filter(i => i.isOverdue).slice(0, 10)
    const blockers = enriched.filter(i => i.isBlocker && !i.done).slice(0, 5)
    const dueSoon = enriched.filter(i => i.isDueSoon).slice(0, 10)

    const context = `Projects: ${projects.map(p => `${p.name} (${p.currentStage}, ${p.status})`).join(', ')}\n\nOverdue tasks (${overdueItems.length}): ${overdueItems.map(i => `"${i.label}" on ${i.project?.name} due ${i.dueDate}`).join('; ')}\n\nBlockers (${blockers.length}): ${blockers.map(i => `"${i.label}" on ${i.project?.name}`).join('; ')}\n\nDue this week: ${dueSoon.map(i => `"${i.label}" on ${i.project?.name} due ${i.dueDate}`).join('; ')}`

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: `You are a project manager assistant for Archispace, a property development firm. Today is ${new Date().toLocaleDateString('en-NZ')}. Be concise and practical.`,
          messages: [{ role: 'user', content: `Based on this data, what are the top 5 most important tasks to action today and why?\n\n${context}` }],
        }),
      })
      const data = await res.json()
      setAiSuggestion(data.content?.[0]?.text || 'No response received.')
    } catch {
      setAiSuggestion('Could not reach AI. Check your connection.')
    }
    setAiLoading(false)
  }

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }) : ''

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-400 mt-0.5">All tasks across every project</p>
        </div>
        <button
          onClick={handleAIPrioritise}
          disabled={aiLoading}
          className="inline-flex items-center gap-2 bg-ocean-600 hover:bg-ocean-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Sparkles size={14} />
          {aiLoading ? 'Thinking…' : 'AI Prioritise'}
        </button>
      </div>

      {/* AI suggestion */}
      {aiSuggestion && (
        <div className="mb-5 bg-ocean-50 border border-ocean-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-ocean-600" />
            <span className="text-sm font-semibold text-ocean-700">AI Priority Suggestion</span>
            <button onClick={() => setAiSuggestion(null)} className="ml-auto text-ocean-400 hover:text-ocean-600 text-xs">Dismiss</button>
          </div>
          <p className="text-sm text-ocean-700 whitespace-pre-wrap leading-relaxed">{aiSuggestion}</p>
        </div>
      )}

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: 'active', label: `Active (${counts.active})` },
          { key: 'overdue', label: `Overdue (${counts.overdue})`, danger: counts.overdue > 0 },
          { key: 'due-soon', label: `Due this week (${counts.dueSoon})` },
          { key: 'blocked', label: `Blocked (${counts.blocked})`, danger: counts.blocked > 0 },
          { key: 'done', label: 'Done' },
          { key: 'all', label: 'All' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter('status', tab.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterStatus === tab.key
                ? 'bg-white shadow-sm text-gray-800'
                : tab.danger ? 'text-red-500 hover:text-red-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterProject}
          onChange={e => setFilter('project', e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
        >
          <option value="">All projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          value={filterOwner}
          onChange={e => setFilter('owner', e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
        >
          <option value="">All owners</option>
          {owners.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        {(filterProject || filterOwner) && (
          <button onClick={() => { setFilter('project', ''); setFilter('owner', '') }} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">No tasks match your filters.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="w-8 px-4 py-3"></th>
                <th className="text-left px-4 py-3 font-medium">Task</th>
                <th className="text-left px-4 py-3 font-medium">Project</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Stage</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Owner</th>
                <th className="text-left px-4 py-3 font-medium">Due</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(item => (
                <tr
                  key={item.id}
                  className={`hover:bg-gray-50 cursor-pointer transition-colors ${item.isOverdue ? 'bg-red-50 hover:bg-red-50' : ''}`}
                  onClick={() => setEditItem(item)}
                >
                  <td className="px-4 py-3" onClick={e => { e.stopPropagation(); toggleChecklistItem(item.id, item.projectId) }}>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${item.done ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-blue-400'}`}>
                      {item.done && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={item.done ? 'line-through text-gray-400' : 'text-gray-800'}>
                      {item.label}
                    </span>
                    {item.isBlocker && !item.done && (
                      <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-500 uppercase">
                        <AlertTriangle size={10} /> Blocker
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{item.project?.name || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {item.stage && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${item.stage.light} ${item.stage.text}`}>
                        {item.stage.short}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">{item.owner || '—'}</td>
                  <td className="px-4 py-3 text-xs">
                    {item.dueDate ? (
                      <span className={item.isOverdue ? 'text-red-600 font-medium' : item.isDueSoon ? 'text-amber-600' : 'text-gray-500'}>
                        {fmtDate(item.dueDate)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className={`px-4 py-3 text-xs hidden sm:table-cell ${priorityColor(item.priority)}`}>
                    {item.priority ? item.priority.charAt(0).toUpperCase() + item.priority.slice(1) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-gray-50 text-xs text-gray-400">
            {filtered.length} task{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {editItem && <ChecklistItemModal item={editItem} onClose={() => setEditItem(null)} />}
    </div>
  )
}
