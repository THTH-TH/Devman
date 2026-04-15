import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'

export default function EmptyState({
  title = 'No projects yet',
  subtitle = 'Create your first project to get started.',
  showCreate = true,
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-6">
      {/* Wordmark */}
      <div className="mb-8">
        <div className="text-3xl font-bold tracking-tight text-gray-800">Archispace</div>
        <div className="text-sm text-gray-400 tracking-wide mt-0.5">Development Manager</div>
      </div>

      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl bg-gray-200 flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
      </div>

      <h2 className="text-xl font-semibold text-gray-700 mb-2">{title}</h2>
      <p className="text-gray-500 text-sm mb-8 max-w-xs">{subtitle}</p>

      {showCreate && (
        <Link
          to="/projects/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors text-sm"
        >
          <Plus size={16} />
          Create project
        </Link>
      )}
    </div>
  )
}
