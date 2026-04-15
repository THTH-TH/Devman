import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import useStore from '../store/useStore'
import StatusPill from '../components/StatusPill'
import ProgressBar from '../components/ProgressBar'
import { STAGES, STAGE_MAP } from '../data/stages'
import ChecklistItemModal from '../modals/ChecklistItemModal'

function ChecklistItem({ item, onToggle, onEdit }) {
  return (
    <div className={`flex items-center gap-3 py-2 px-3 rounded-lg group hover:bg-gray-50 transition-colors ${
      item.isBlocker && !item.done ? 'bg-red-50 hover:bg-red-50' : ''
    }`}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(item.id)}
        className={`shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
          item.done
            ? 'bg-green-500 border-green-500'
            : 'border-gray-300 hover:border-blue-400'
        }`}
      >
        {item.done && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
            <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Label */}
      <span className={`flex-1 text-sm min-w-0 ${item.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
        {item.label}
        {item.requiredToProgress && (
          <span className="ml-1 text-gray-400 text-xs">*</span>
        )}
        {item.isBlocker && !item.done && (
          <span className="ml-2 text-[10px] font-semibold text-red-500 uppercase tracking-wide">Blocker</span>
        )}
      </span>

      {/* Meta */}
      <div className="flex items-center gap-2 shrink-0">
        {item.priority && item.priority !== 'medium' && (
          <StatusPill status={item.priority} type="priority" />
        )}
        {!item.done && item.status !== 'not-started' && (
          <StatusPill status={item.status} type="item" />
        )}
        {item.owner && (
          <span className="text-xs text-gray-400 hidden sm:inline">{item.owner}</span>
        )}
        {item.dueDate && (
          <span className={`text-xs hidden sm:inline ${
            !item.done && new Date(item.dueDate) < new Date() ? 'text-red-500 font-medium' : 'text-gray-400'
          }`}>
            {new Date(item.dueDate).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}
          </span>
        )}
        <button
          onClick={() => onEdit(item)}
          className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-gray-600 transition-all px-1.5 py-0.5 rounded hover:bg-gray-100"
        >
          Edit
        </button>
      </div>
    </div>
  )
}

function StageSection({ stage, items, onToggle, onEdit, onAdd, projectId }) {
  const [open, setOpen] = useState(true)
  const [addLabel, setAddLabel] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const { addChecklistItem, logActivity } = useStore()

  const done = items.filter(i => i.done).length
  const pct = items.length ? Math.round((done / items.length) * 100) : 0

  const handleAdd = () => {
    const label = addLabel.trim()
    if (!label) return
    addChecklistItem({ projectId, stageId: stage.id, label, priority: 'medium' })
    logActivity(projectId, 'Item added', label)
    setAddLabel('')
    setShowAdd(false)
  }

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      {/* Stage header */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${stage.light} hover:opacity-90`}
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown size={14} className={stage.text} /> : <ChevronRight size={14} className={stage.text} />}
          <span className={`text-sm font-semibold ${stage.text}`}>{stage.label}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full bg-white/60 ${stage.text}`}>
            {done}/{items.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ProgressBar value={pct} color={stage.bg} height="h-1.5" className="w-20 hidden sm:block" />
          <span className={`text-xs font-medium ${stage.text}`}>{pct}%</span>
        </div>
      </button>

      {/* Items */}
      {open && (
        <div className="bg-white divide-y divide-gray-50">
          {items.length === 0 && !showAdd ? (
            <div className="px-4 py-3 text-xs text-gray-400 italic">No items in this stage.</div>
          ) : (
            items.map(item => (
              <ChecklistItem key={item.id} item={item} onToggle={onToggle} onEdit={onEdit} />
            ))
          )}

          {/* Quick add */}
          <div className="px-3 py-2 flex items-center gap-2">
            {showAdd ? (
              <>
                <input
                  type="text"
                  autoFocus
                  className="flex-1 text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Item label…"
                  value={addLabel}
                  onChange={e => setAddLabel(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAdd()
                    if (e.key === 'Escape') { setShowAdd(false); setAddLabel('') }
                  }}
                />
                <button
                  onClick={handleAdd}
                  className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded hover:bg-blue-700"
                >
                  Add
                </button>
                <button
                  onClick={() => { setShowAdd(false); setAddLabel('') }}
                  className="text-xs text-gray-400 hover:text-gray-600 px-1"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Plus size={12} />
                Add item
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ChecklistView({ projectId }) {
  const { checklistItems, toggleChecklistItem } = useStore()
  const [editItem, setEditItem] = useState(null)

  const items = checklistItems.filter(i => i.projectId === projectId)
  const total = items.length
  const done = items.filter(i => i.done).length
  const pct = total ? Math.round((done / total) * 100) : 0

  const byStage = useMemo(() => {
    return STAGES.map(stage => ({
      stage,
      items: items.filter(i => i.stageId === stage.id),
    }))
  }, [items])

  return (
    <div>
      {/* Overall progress */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex items-center gap-4">
        <div className="flex-1">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span className="font-medium">Overall progress</span>
            <span>{done} of {total} complete</span>
          </div>
          <ProgressBar value={pct} height="h-2" />
        </div>
        <div className="text-2xl font-bold text-gray-800">{pct}%</div>
      </div>

      {/* Legend */}
      <div className="text-xs text-gray-400 mb-3 flex items-center gap-3">
        <span><span className="text-gray-600">*</span> Required to progress</span>
        <span className="text-red-500">Blocker = must not be blocked</span>
      </div>

      {/* Stages */}
      <div className="space-y-3">
        {byStage.map(({ stage, items: stageItems }) => (
          <StageSection
            key={stage.id}
            stage={stage}
            items={stageItems}
            projectId={projectId}
            onToggle={id => toggleChecklistItem(id, projectId)}
            onEdit={setEditItem}
          />
        ))}
      </div>

      {/* Edit modal */}
      {editItem && (
        <ChecklistItemModal
          item={editItem}
          onClose={() => setEditItem(null)}
        />
      )}
    </div>
  )
}
