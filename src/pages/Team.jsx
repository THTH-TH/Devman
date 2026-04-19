import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Phone, ListTodo, Settings } from 'lucide-react'
import useStore from '../store/useStore'

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const AVATAR_COLORS = [
  'bg-ocean-500', 'bg-teal-500', 'bg-forest-600', 'bg-pink-500',
  'bg-orange-500', 'bg-green-500', 'bg-indigo-500', 'bg-rose-500',
]

export default function Team() {
  const { teamMembers, projects, checklistItems } = useStore()

  const enriched = useMemo(() => {
    return teamMembers.map((m, idx) => {
      const openTasks = checklistItems.filter(i => i.owner === m.name && !i.done)
      const overdueTasks = openTasks.filter(i => i.dueDate && new Date(i.dueDate) < new Date())
      const activeProjects = projects.filter(p =>
        p.status === 'Active' && (
          p.owner === m.name ||
          (p.teamMembers || []).includes(m.name) ||
          openTasks.some(t => t.projectId === p.id)
        )
      )
      return { ...m, openTasks: openTasks.length, overdueTasks: overdueTasks.length, activeProjects: activeProjects.length, colorIdx: idx % AVATAR_COLORS.length }
    })
  }, [teamMembers, projects, checklistItems])

  if (teamMembers.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <h1 className="text-lg font-bold text-gray-900">Team</h1>
            <Link to="/settings" className="inline-flex items-center gap-2 bg-forest-600 hover:bg-forest-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              <Settings size={15} />
              Manage team
            </Link>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          No team members yet.{' '}
          <Link to="/settings" className="ml-1 text-ocean-600 hover:underline">Add your team in Settings.</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Team</h1>
            <p className="text-sm text-gray-400 mt-0.5">{teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}</p>
          </div>
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Settings size={14} />
            Manage team
          </Link>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
      <div className="p-6 max-w-7xl mx-auto">

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {enriched.map(member => (
          <div key={member.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            {/* Top row */}
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 ${AVATAR_COLORS[member.colorIdx]}`}>
                {initials(member.name)}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 text-sm">{member.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">{member.role || '—'}</div>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-1.5 mb-4">
              {member.email && (
                <a href={`mailto:${member.email}`} className="flex items-center gap-2 text-xs text-gray-500 hover:text-ocean-600 transition-colors">
                  <Mail size={12} className="shrink-0 text-gray-400" />
                  <span className="truncate">{member.email}</span>
                </a>
              )}
              {member.phone && (
                <a href={`tel:${member.phone}`} className="flex items-center gap-2 text-xs text-gray-500 hover:text-ocean-600 transition-colors">
                  <Phone size={12} className="shrink-0 text-gray-400" />
                  {member.phone}
                </a>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-3 pt-3 border-t border-gray-50">
              <div className="text-center flex-1">
                <div className={`text-lg font-bold ${member.overdueTasks > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                  {member.openTasks}
                </div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wide">Open tasks</div>
              </div>
              <div className="text-center flex-1">
                <div className="text-lg font-bold text-gray-800">{member.activeProjects}</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wide">Projects</div>
              </div>
              {member.overdueTasks > 0 && (
                <div className="text-center flex-1">
                  <div className="text-lg font-bold text-red-600">{member.overdueTasks}</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide">Overdue</div>
                </div>
              )}
            </div>

            {/* View tasks link */}
            {member.openTasks > 0 && (
              <Link
                to={`/tasks?owner=${encodeURIComponent(member.name)}`}
                className="mt-3 flex items-center gap-1.5 text-xs text-ocean-600 hover:underline"
              >
                <ListTodo size={12} />
                View their tasks
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
    </div>
    </div>
  )
}
