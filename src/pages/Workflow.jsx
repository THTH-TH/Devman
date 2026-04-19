import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'
import EmptyState from '../components/EmptyState'
import StatusPill from '../components/StatusPill'
import ProgressBar from '../components/ProgressBar'
import { STAGES, STAGE_MAP } from '../data/stages'

export default function Workflow() {
  const { projects, checklistItems } = useStore()
  const navigate = useNavigate()

  const enriched = useMemo(() => {
    return projects.map(p => {
      const items = checklistItems.filter(i => i.projectId === p.id)
      const done = items.filter(i => i.done).length
      const overdue = items.filter(i => i.dueDate && !i.done && new Date(i.dueDate) < new Date()).length
      const pct = items.length ? Math.round((done / items.length) * 100) : 0
      return { ...p, pct, totalTasks: items.length, doneTasks: done, overdue }
    })
  }, [projects, checklistItems])

  if (projects.length === 0) {
    return <EmptyState title="No projects yet" subtitle="Create your first project to see the workflow board." />
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 bg-white border-b border-gray-100 shrink-0">
        <h1 className="text-lg font-bold text-gray-900">Workflow</h1>
        <p className="text-sm text-gray-400 mt-0.5">Projects by stage</p>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <div className="flex gap-4 h-full min-w-max">
          {STAGES.map(stage => {
            const stageProjects = enriched.filter(p => p.currentStage === stage.id)
            return (
              <div
                key={stage.id}
                className="flex flex-col w-60 shrink-0 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden"
              >
                {/* Column header */}
                <div className={`px-4 py-3 border-b border-gray-200 ${stage.light}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold ${stage.text}`}>{stage.label}</span>
                    <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${stage.bg} text-white`}>
                      {stageProjects.length}
                    </span>
                  </div>
                  {stageProjects.length > 0 && (() => {
                    const total = stageProjects.reduce((s, p) => s + p.totalTasks, 0)
                    const done = stageProjects.reduce((s, p) => s + p.doneTasks, 0)
                    const overdue = stageProjects.reduce((s, p) => s + p.overdue, 0)
                    return (
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className={`${stage.text} opacity-70`}>{done}/{total} tasks</span>
                        {overdue > 0 && <span className="text-red-500 font-medium">{overdue} overdue</span>}
                      </div>
                    )
                  })()}
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {stageProjects.length === 0 ? (
                    <div className="text-center py-6 text-xs text-gray-300">No projects</div>
                  ) : (
                    stageProjects.map(p => (
                      <div
                        key={p.id}
                        onClick={() => navigate(`/projects/${p.id}`)}
                        className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 cursor-pointer hover:shadow-md hover:border-gray-200 transition-all"
                      >
                        <div className="font-medium text-sm text-gray-800 mb-0.5 line-clamp-2">{p.name}</div>
                        <div className="text-xs text-gray-400 mb-2 line-clamp-1">{p.address}</div>
                        <div className="flex items-center justify-between gap-2">
                          <StatusPill status={p.status} />
                          <span className="text-xs text-gray-400">{p.pct}%</span>
                        </div>
                        <ProgressBar value={p.pct} color={stage.bg} height="h-1" className="mt-2" />
                        <div className="flex items-center justify-between mt-2">
                          {p.owner && <div className="text-[10px] text-gray-300">{p.owner}</div>}
                          {p.overdue > 0 && <div className="text-[10px] text-red-400 font-medium">{p.overdue} overdue</div>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
