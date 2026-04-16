const PROJECT_STATUS = {
  Active: 'bg-green-100 text-green-700',
  'On Hold': 'bg-yellow-100 text-yellow-700',
  Blocked: 'bg-red-100 text-red-700',
  Complete: 'bg-forest-50 text-forest-700',
}

const ITEM_STATUS = {
  'not-started': 'bg-gray-100 text-gray-500',
  'in-progress': 'bg-forest-50 text-forest-700',
  waiting: 'bg-yellow-100 text-yellow-700',
  complete: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700',
}

const PRIORITY = {
  low: 'bg-gray-100 text-gray-500',
  medium: 'bg-forest-50 text-forest-600',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

const LABEL_MAP = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  waiting: 'Waiting',
  complete: 'Complete',
  blocked: 'Blocked',
}

export default function StatusPill({ status, type = 'project', className = '' }) {
  const map = type === 'priority' ? PRIORITY : type === 'item' ? ITEM_STATUS : PROJECT_STATUS
  const cls = map[status] || 'bg-gray-100 text-gray-500'
  const label = LABEL_MAP[status] || status
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cls} ${className}`}
    >
      {label}
    </span>
  )
}
