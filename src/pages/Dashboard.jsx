import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, AlertTriangle, Calendar, TrendingUp } from 'lucide-react'
import useStore from '../store/useStore'
import EmptyState from '../components/EmptyState'
import StatusPill from '../components/StatusPill'
import ProgressBar from '../components/ProgressBar'
import { STAGE_MAP, STAGES } from '../data/stages'

function StatCard({ label, value, color = 'text-gray-800', accent = 'bg-gray-200' }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 overflow-hidden relative">
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${accent}`} />
      <div className="pl-3">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{label}</div>
        <div className={`text-3xl font-bold ${color}`}>{value}</div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { projects, checklistItems, milestones, activityLog } = useStore()
  const navigate = useNavigate()

  const stats = useMemo(() => {
    const active = projects.filter(p => p.status === 'Active').length
    const today = new Date()
    const in30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    const upcomingMilestones = milestones.filter(m => {
      if (!m.date || m.complete) return false
      const d = new Date(m.date)
      return d >= today && d <= in30
    }).length
    const overdue = checklistItems.filter(i => {
      if (!i.dueDate || i.done) return false
      return new Date(i.dueDate) < today
    }).length
    const blockerItems = checklistItems.filter(i => i.isBlocker && !i.done).length
    return { active, upcomingMilestones, overdue, blockerItems }
  }, [projects, checklistItems, milestones])

  const projectProgress = useMemo(() => {
    return projects.map(p => {
      const items = checklistItems.filter(i => i.projectId === p.id)
      const done = items.filter(i => i.done).length
      const pct = items.length ? Math.round((done / items.length) * 100) : 0
      const stage = STAGE_MAP[p.currentStage]
      return { ...p, pct, done, total: items.length, stage }
    })
  }, [projects, checklistItems])

  const pipeline = useMemo(() => {
    return STAGES.map(stage => ({
      ...stage,
      projects: projects.filter(p => p.currentStage === stage.id),
    })).filter(s => s.projects.length > 0)
  }, [projects])

  const recentActivity = activityLog.slice(0, 10)

  const fmtTime = ts => {
    const d = new Date(ts)
    return d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }) +
      ' ' + d.toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })
  }

  if (projects.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {new Date().toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <Link
            to="/projects/new"
            className="inline-flex items-center gap-2 bg-forest-600 hover:bg-forest-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} />
            New project
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Active projects" value={stats.active} accent="bg-ocean-500" />
            <StatCard
              label="Overdue tasks"
              value={stats.overdue}
              color={stats.overdue ? 'text-red-600' : 'text-gray-800'}
              accent={stats.overdue ? 'bg-red-400' : 'bg-gray-200'}
            />
            <StatCard label="Milestones (30d)" value={stats.upcomingMilestones} accent="bg-purple-400" />
            <StatCard
              label="Active blockers"
              value={stats.blockerItems}
              color={stats.blockerItems ? 'text-red-600' : 'text-gray-800'}
              accent={stats.blockerItems ? 'bg-orange-400' : 'bg-gray-200'}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Projects table */}
            <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800 text-sm">Projects</h2>
                <Link to="/projects" className="text-xs text-ocean-600 hover:underline">View all</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                      <th className="text-left px-5 py-2.5 font-medium">Project</th>
                      <th className="text-left px-4 py-2.5 font-medium">Stage</th>
                      <th className="text-left px-4 py-2.5 font-medium">Status</th>
                      <th className="text-left px-4 py-2.5 font-medium">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {projectProgress.map(p => (
                      <tr
                        key={p.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/projects/${p.id}`)}
                      >
                        <td className="px-5 py-3">
                          <div className="font-medium text-gray-800">{p.name}</div>
                          <div className="text-xs text-gray-400">{p.address}</div>
                        </td>
                        <td className="px-4 py-3">
                          {p.stage && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.stage.light} ${p.stage.text}`}>
                              {p.stage.short}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={p.status} />
                        </td>
                        <td className="px-4 py-3 min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <ProgressBar value={p.pct} height="h-1.5" className="flex-1" />
                            <span className="text-xs text-gray-400 w-8 text-right">{p.pct}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Activity feed */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800 text-sm">Recent activity</h2>
              </div>
              {recentActivity.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">No activity yet.</div>
              ) : (
                <div className="divide-y divide-gray-50 overflow-y-auto max-h-96">
                  {recentActivity.map(entry => {
                    const project = projects.find(p => p.id === entry.projectId)
                    return (
                      <div key={entry.id} className="px-5 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-medium text-gray-700">{entry.action}</div>
                            <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{entry.detail}</div>
                            {project && (
                              <Link
                                to={`/projects/${project.id}`}
                                className="text-xs text-ocean-500 hover:underline mt-0.5 inline-block"
                              >
                                {project.name}
                              </Link>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-300 shrink-0">{fmtTime(entry.timestamp)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Pipeline by stage */}
          {pipeline.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800 text-sm">Pipeline by stage</h2>
              </div>
              <div className="px-5 py-4 flex flex-wrap gap-3">
                {pipeline.map(stage => (
                  <div key={stage.id} className={`flex-1 min-w-[160px] rounded-lg p-3 ${stage.light}`}>
                    <div className={`text-xs font-semibold ${stage.text} mb-2`}>{stage.label}</div>
                    {stage.projects.map(p => (
                      <Link
                        key={p.id}
                        to={`/projects/${p.id}`}
                        className="block text-xs text-gray-700 hover:text-gray-900 py-0.5 truncate"
                      >
                        {p.name}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
