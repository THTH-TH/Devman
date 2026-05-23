import { useMemo, useState } from 'react'
import { BarChart2, Calendar, List, Search } from 'lucide-react'
import useStore from '../store/useStore'
import {
  ScheduleCalendarView,
  ScheduleGanttView,
  ScheduleTaskListView,
  getScheduleSmartStatus,
} from '../components/ProjectScheduleTab'

export default function Schedule() {
  const { projects, scheduleTasks } = useStore()
  const [view, setView] = useState('list')
  const [filterProject, setFilterProject] = useState('')
  const [search, setSearch] = useState('')

  const tasks = useMemo(() => {
    const q = search.trim().toLowerCase()
    return scheduleTasks
      .map(task => {
        const project = projects.find(p => p.id === task.projectId)
        return {
          ...task,
          projectName: project?.name || 'Unknown project',
        }
      })
      .filter(task => !filterProject || task.projectId === filterProject)
      .filter(task => {
        if (!q) return true
        return [task.name, task.phase, task.projectName].some(value => String(value || '').toLowerCase().includes(q))
      })
  }, [scheduleTasks, projects, filterProject, search])

  const selectedProject = filterProject ? projects.find(p => p.id === filterProject) : null
  const complete = tasks.filter(t => getScheduleSmartStatus(t) === 'complete').length
  const delayed = tasks.filter(t => getScheduleSmartStatus(t) === 'delayed').length
  const pct = tasks.length ? Math.round((complete / tasks.length) * 100) : 0

  const tabs = [
    { key: 'list', label: 'Task List', Icon: List },
    { key: 'gantt', label: 'Gantt', Icon: BarChart2 },
    { key: 'calendar', label: 'Calendar', Icon: Calendar },
  ]

  return (
    <div className={`${view === 'gantt' ? 'max-w-none' : 'mx-auto max-w-7xl'} p-6`}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Schedule</h1>
          <p className="mt-1 text-sm text-gray-500">
            {tasks.length} tasks · {complete} complete · {delayed} delayed · {pct}% done
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="h-9 w-60 rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-ocean-400"
              placeholder="Search schedule..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-600 outline-none focus:border-ocean-400"
          >
            <option value="">All projects</option>
            {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-5 border-b border-gray-200">
        {tabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`inline-flex items-center gap-1.5 border-b-2 px-1 pb-3 text-sm transition-colors ${view === key ? 'border-forest-600 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {view === 'list' && (
        <ScheduleTaskListView
          projectId={selectedProject?.id || ''}
          project={selectedProject}
          tasks={tasks}
          showProject={!selectedProject}
          exportTitle={selectedProject ? `${selectedProject.name} schedule` : 'Portfolio schedule'}
        />
      )}
      {view === 'gantt' && (
        <ScheduleGanttView
          projectId={selectedProject?.id || ''}
          projectStartDate={selectedProject?.startDate}
          project={selectedProject}
          tasks={tasks}
          exportTitle={selectedProject ? `${selectedProject.name} schedule` : 'Portfolio schedule'}
        />
      )}
      {view === 'calendar' && <ScheduleCalendarView tasks={tasks} />}
    </div>
  )
}
