import { useState } from 'react'
import { X } from 'lucide-react'
import useStore from '../store/useStore'
import { STAGES } from '../data/stages'

const inputCls =
  'w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent'

const STATUS_OPTIONS = ['not-started', 'in-progress', 'waiting', 'complete', 'blocked']
const STATUS_LABELS = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  waiting: 'Waiting',
  complete: 'Complete',
  blocked: 'Blocked',
}
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'critical']

export default function ChecklistItemModal({ item, onClose }) {
  const { updateChecklistItem, deleteChecklistItem, logActivity } = useStore()

  const [form, setForm] = useState({
    label: item.label,
    stageId: item.stageId,
    owner: item.owner || '',
    dueDate: item.dueDate || '',
    status: item.status || 'not-started',
    priority: item.priority || 'medium',
    requiredToProgress: item.requiredToProgress || false,
    isBlocker: item.isBlocker || false,
    description: item.description || '',
  })
  const [confirmDelete, setConfirmDelete] = useState(false)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = () => {
    const done = form.status === 'complete'
    updateChecklistItem(item.id, {
      ...form,
      done,
    })
    logActivity(item.projectId, 'Item updated', form.label)
    onClose()
  }

  const handleDelete = () => {
    deleteChecklistItem(item.id)
    logActivity(item.projectId, 'Item deleted', item.label)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Edit checklist item</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Label */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Item name</label>
            <input
              type="text"
              className={inputCls}
              value={form.label}
              onChange={e => set('label', e.target.value)}
            />
          </div>

          {/* Stage */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Stage</label>
            <select
              className={inputCls}
              value={form.stageId}
              onChange={e => set('stageId', e.target.value)}
            >
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
              <select
                className={inputCls}
                value={form.status}
                onChange={e => set('status', e.target.value)}
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Priority</label>
              <select
                className={inputCls}
                value={form.priority}
                onChange={e => set('priority', e.target.value)}
              >
                {PRIORITY_OPTIONS.map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Owner + Due date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Owner</label>
              <input
                type="text"
                className={inputCls}
                placeholder="Assigned to…"
                value={form.owner}
                onChange={e => set('owner', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Due date</label>
              <input
                type="date"
                className={inputCls}
                value={form.dueDate}
                onChange={e => set('dueDate', e.target.value)}
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.requiredToProgress}
                onChange={e => set('requiredToProgress', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-ocean-600 focus:ring-ocean-500"
              />
              <span className="text-sm text-gray-600">Required to progress</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isBlocker}
                onChange={e => set('isBlocker', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-gray-600">Blocker</span>
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Notes</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              placeholder="Any notes…"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600">Are you sure?</span>
              <button
                onClick={handleDelete}
                className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              Delete item
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium bg-forest-600 text-white rounded-lg hover:bg-forest-700 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
