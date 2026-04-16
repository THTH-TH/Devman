import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import useStore from '../store/useStore'
import ChecklistView from './ChecklistView'

export default function ChecklistPage() {
  const { projectId } = useParams()
  const { projects } = useStore()
  const project = projects.find(p => p.id === projectId)

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24">
        <p className="text-gray-400 mb-4">Project not found.</p>
        <Link to="/projects" className="text-forest-600 text-sm hover:underline">Back to projects</Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to={`/projects/${project.id}`}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900">{project.name} — Checklist</h1>
          <p className="text-sm text-gray-400">{project.address}</p>
        </div>
      </div>

      <ChecklistView projectId={projectId} />
    </div>
  )
}
