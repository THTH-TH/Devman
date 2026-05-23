import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileText,
  FolderOpen,
  MapPin,
  Plus,
} from 'lucide-react'
import useStore from '../store/useStore'
import EmptyState from '../components/EmptyState'
import ProgressBar from '../components/ProgressBar'
import StatusPill from '../components/StatusPill'
import { STAGE_MAP, STAGES } from '../data/stages'
import { buildAttentionItems } from '../lib/attention'

const DAY_MS = 86_400_000

const doneTask = task => task.status === 'done'
const openTask = task => !doneTask(task)
const parseDate = value => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
const startOfToday = () => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}
const formatShortDate = value => {
  const date = parseDate(value)
  if (!date) return 'No date'
  return date.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
}
const projectName = (projects, id) => projects.find(project => project.id === id)?.name || 'General'
const stageForSchedule = phase => STAGES.find(stage => stage.label === phase || stage.short === phase || stage.id === phase)

function MetricCard({ label, value, detail, icon: Icon, tone = 'neutral', to }) {
  const toneClasses = {
    neutral: 'border-gray-100 bg-white text-gray-900',
    green: 'border-green-100 bg-green-50/70 text-green-800',
    amber: 'border-amber-100 bg-amber-50/80 text-amber-800',
    red: 'border-red-100 bg-red-50/80 text-red-800',
    ocean: 'border-ocean-100 bg-ocean-50/70 text-ocean-800',
  }
  const iconClasses = {
    neutral: 'bg-gray-100 text-gray-500',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    ocean: 'bg-ocean-100 text-ocean-700',
  }
  const content = (
    <div className={`rounded-xl border p-4 shadow-sm transition-colors ${toneClasses[tone] || toneClasses.neutral} ${to ? 'hover:border-forest-200 hover:bg-white' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
          <div className="mt-2 text-3xl font-bold leading-none">{value}</div>
          {detail && <div className="mt-2 text-xs font-medium text-gray-500">{detail}</div>}
        </div>
        {Icon && (
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClasses[tone] || iconClasses.neutral}`}>
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  )
  return to ? <Link to={to}>{content}</Link> : content
}

function Panel({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="mt-0.5 truncate text-xs text-gray-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function StageChip({ stageId, primary = false }) {
  const stage = STAGE_MAP[stageId]
  if (!stage) return null
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${primary ? `${stage.bg} text-white` : `${stage.light} ${stage.text}`}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {stage.short}
    </span>
  )
}

function EmptyPanel({ children }) {
  return <div className="px-5 py-10 text-center text-sm text-gray-400">{children}</div>
}

export default function Dashboard() {
  const {
    projects,
    checklistItems,
    milestones,
    tasks,
    scheduleTasks,
    documents,
    projectContacts,
    contacts,
    dailyLogs,
    propertyProfiles,
    currentUser,
  } = useStore()
  const navigate = useNavigate()

  const today = useMemo(() => startOfToday(), [])
  const attentionItems = useMemo(
    () => buildAttentionItems({ projects, checklistItems, milestones, tasks, scheduleTasks }),
    [projects, checklistItems, milestones, tasks, scheduleTasks],
  )

  const projectRows = useMemo(() => {
    return projects.map(project => {
      const items = checklistItems.filter(item => item.projectId === project.id)
      const done = items.filter(item => item.done).length
      const checklistProgress = items.length ? Math.round((done / items.length) * 100) : 0
      const projectTasks = tasks.filter(task => task.projectId === project.id)
      const overdueTasks = projectTasks.filter(task => {
        const due = parseDate(task.dueDate)
        return due && due < today && openTask(task)
      })
      const delayedSchedule = scheduleTasks.filter(task => task.projectId === project.id && task.status === 'delayed')
      const openBlockers = items.filter(item => item.isBlocker && !item.done)
      const activeStageIds = project.activeStageIds?.length ? project.activeStageIds : [project.currentStage]
      const projectMilestones = [
        ...milestones
          .filter(item => item.projectId === project.id && item.date && !item.complete)
          .map(item => ({ title: item.label, date: item.date, type: 'Milestone', stageId: item.stageId })),
        ...scheduleTasks
          .filter(item => item.projectId === project.id && item.isMilestone && (item.endDate || item.startDate))
          .map(item => ({ title: item.name, date: item.endDate || item.startDate, type: 'Schedule', stageId: stageForSchedule(item.phase)?.id })),
      ]
        .filter(item => {
          const date = parseDate(item.date)
          return date && date >= today
        })
        .sort((a, b) => parseDate(a.date) - parseDate(b.date))

      const docs = documents.filter(doc => doc.projectId === project.id)
      const directory = projectContacts.filter(item => item.projectId === project.id)
      const profile = propertyProfiles.find(item => item.projectId === project.id)
      const riskScore = openBlockers.length * 5 + overdueTasks.length * 3 + delayedSchedule.length * 4
      return {
        ...project,
        activeStageIds,
        checklistProgress,
        overdueTasks: overdueTasks.length,
        delayedSchedule: delayedSchedule.length,
        blockers: openBlockers.length,
        documents: docs.length,
        contacts: directory.length,
        nextMilestone: projectMilestones[0] || null,
        propertyAddress: profile?.formattedAddress || profile?.address || project.address,
        riskScore,
      }
    }).sort((a, b) => {
      if (a.status === 'Active' && b.status !== 'Active') return -1
      if (a.status !== 'Active' && b.status === 'Active') return 1
      return b.riskScore - a.riskScore
    })
  }, [projects, checklistItems, tasks, scheduleTasks, milestones, documents, projectContacts, propertyProfiles, today])

  const portfolio = useMemo(() => {
    const activeProjects = projects.filter(project => project.status === 'Active')
    const delayedSchedule = scheduleTasks.filter(task => task.status === 'delayed')
    const blockers = checklistItems.filter(item => item.isBlocker && !item.done)
    const in30 = new Date(today.getTime() + 30 * DAY_MS)
    const upcomingMilestones = [
      ...milestones.filter(item => item.date && !item.complete).map(item => ({ date: item.date })),
      ...scheduleTasks.filter(item => item.isMilestone && (item.endDate || item.startDate)).map(item => ({ date: item.endDate || item.startDate })),
    ].filter(item => {
      const date = parseDate(item.date)
      return date && date >= today && date <= in30
    })
    const docsLast14 = documents.filter(doc => {
      const date = parseDate(doc.createdAt)
      return date && today - date <= 14 * DAY_MS
    })
    return {
      activeProjects: activeProjects.length,
      attention: attentionItems.length,
      delayedSchedule: delayedSchedule.length,
      blockers: blockers.length,
      upcomingMilestones: upcomingMilestones.length,
      docsLast14: docsLast14.length,
      contactsLinked: projectContacts.length,
    }
  }, [projects, scheduleTasks, checklistItems, milestones, documents, projectContacts, attentionItems.length, today])

  const upcomingMilestones = useMemo(() => {
    return [
      ...milestones
        .filter(item => item.date && !item.complete)
        .map(item => ({
          id: `milestone-${item.id}`,
          title: item.label,
          date: item.date,
          projectId: item.projectId,
          projectName: projectName(projects, item.projectId),
          stageId: item.stageId,
          type: 'Milestone',
        })),
      ...scheduleTasks
        .filter(item => item.isMilestone && (item.endDate || item.startDate))
        .map(item => ({
          id: `schedule-${item.id}`,
          title: item.name,
          date: item.endDate || item.startDate,
          projectId: item.projectId,
          projectName: projectName(projects, item.projectId),
          stageId: stageForSchedule(item.phase)?.id,
          type: 'Schedule',
        })),
    ]
      .filter(item => {
        const date = parseDate(item.date)
        return date && date >= today
      })
      .sort((a, b) => parseDate(a.date) - parseDate(b.date))
      .slice(0, 7)
  }, [projects, milestones, scheduleTasks, today])

  const recentDocuments = useMemo(() => documents.slice(0, 7), [documents])
  const recentLogs = useMemo(() => dailyLogs.slice(0, 5), [dailyLogs])
  const myOpenTasks = useMemo(() => {
    if (!currentUser) return []
    return tasks
      .filter(task => task.assignee === currentUser && openTask(task))
      .sort((a, b) => {
        const aDate = parseDate(a.dueDate)
        const bDate = parseDate(b.dueDate)
        if (aDate && bDate) return aDate - bDate
        if (aDate) return -1
        if (bDate) return 1
        return 0
      })
      .slice(0, 5)
  }, [tasks, currentUser])

  const stagePipeline = useMemo(() => {
    return STAGES.map(stage => ({
      ...stage,
      projects: projectRows.filter(project => project.activeStageIds.includes(stage.id) || project.currentStage === stage.id),
    })).filter(stage => stage.projects.length)
  }, [projectRows])

  const contactName = contactId => contacts.find(contact => contact.id === contactId)?.name || ''

  if (projects.length === 0) return <EmptyState />

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="shrink-0 border-b border-gray-100 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Project control dashboard</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {new Date().toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/projects" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              <FolderOpen size={15} />
              All projects
            </Link>
            <Link to="/projects/new" className="inline-flex items-center gap-2 rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-700">
              <Plus size={15} />
              New project
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Active projects" value={portfolio.activeProjects} detail={`${projects.length} total projects`} icon={FolderOpen} tone="green" to="/projects" />
            <MetricCard label="Needs attention" value={portfolio.attention} detail={`${portfolio.blockers} blockers, ${portfolio.delayedSchedule} delayed`} icon={AlertTriangle} tone={portfolio.attention ? 'red' : 'green'} to="/tasks?status=overdue" />
            <MetricCard label="Milestones 30d" value={portfolio.upcomingMilestones} detail="Project and schedule milestones" icon={CalendarDays} tone="ocean" to="/calendar" />
            <MetricCard label="Documents added" value={portfolio.docsLast14} detail="Last 14 days" icon={FileText} tone="neutral" to="/documents" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
            <Panel
              title="Active project control"
              subtitle="Sorted by active status and programme risk. Click any project to work inside it."
              action={<Link to="/projects" className="text-xs font-semibold text-ocean-600 hover:underline">Open projects</Link>}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-400">
                      <th className="px-5 py-3 text-left font-semibold">Project</th>
                      <th className="px-3 py-3 text-left font-semibold">Stages</th>
                      <th className="px-3 py-3 text-left font-semibold">Progress</th>
                      <th className="px-3 py-3 text-left font-semibold">Attention</th>
                      <th className="px-3 py-3 text-left font-semibold">Next milestone</th>
                      <th className="px-3 py-3 text-left font-semibold">Docs</th>
                      <th className="px-3 py-3 text-left font-semibold">Contacts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {projectRows.map(project => {
                      const hasRisk = project.blockers || project.overdueTasks || project.delayedSchedule
                      return (
                        <tr key={project.id} className="cursor-pointer transition-colors hover:bg-gray-50" onClick={() => navigate(`/projects/${project.id}`)}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-gray-900">{project.name}</div>
                              <StatusPill status={project.status} />
                            </div>
                            <div className="mt-1 flex max-w-[330px] items-center gap-1 truncate text-xs text-gray-400">
                              <MapPin size={12} className="shrink-0" />
                              <span className="truncate">{project.propertyAddress || 'No address captured'}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex max-w-[210px] flex-wrap gap-1.5">
                              <StageChip stageId={project.currentStage} primary />
                              {project.activeStageIds.filter(id => id !== project.currentStage).slice(0, 3).map(id => <StageChip key={id} stageId={id} />)}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex min-w-[125px] items-center gap-2">
                              <ProgressBar value={project.checklistProgress} height="h-1.5" color={project.checklistProgress >= 80 ? 'bg-green-500' : 'bg-forest-600'} />
                              <span className="w-8 text-right text-xs font-semibold text-gray-500">{project.checklistProgress}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            {hasRisk ? (
                              <div className="flex flex-wrap gap-1.5">
                                {project.blockers > 0 && <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">{project.blockers} blockers</span>}
                                {project.overdueTasks > 0 && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">{project.overdueTasks} overdue</span>}
                                {project.delayedSchedule > 0 && <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">{project.delayedSchedule} delayed</span>}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                                <CheckCircle2 size={11} />
                                Clear
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {project.nextMilestone ? (
                              <div>
                                <div className="max-w-[180px] truncate text-xs font-semibold text-gray-700">{project.nextMilestone.title}</div>
                                <div className="text-[11px] text-gray-400">{formatShortDate(project.nextMilestone.date)}</div>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-300">None set</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-xs font-semibold text-gray-600">{project.documents}</td>
                          <td className="px-3 py-3 text-xs font-semibold text-gray-600">{project.contacts}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>

            <div className="space-y-6">
              <Panel
                title="Needs attention"
                subtitle="Highest priority project actions"
                action={<Link to="/tasks?status=overdue" className="text-xs font-semibold text-ocean-600 hover:underline">Tasks</Link>}
              >
                {attentionItems.length === 0 ? (
                  <EmptyPanel>No urgent items showing.</EmptyPanel>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {attentionItems.slice(0, 7).map(item => (
                      <Link key={item.id} to={item.href} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.severity === 'critical' ? 'bg-red-500' : item.severity === 'warning' ? 'bg-amber-400' : 'bg-ocean-400'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{item.type}</span>
                            <span className="truncate text-[10px] text-gray-300">{item.projectName}</span>
                          </div>
                          <div className="truncate text-sm font-semibold text-gray-800">{item.title}</div>
                          <div className="truncate text-xs text-gray-400">{item.detail}</div>
                        </div>
                        <ArrowRight size={14} className="text-gray-300" />
                      </Link>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel
                title={currentUser ? `${currentUser}'s tasks` : 'My tasks'}
                subtitle={currentUser ? 'Open work assigned to you' : 'Set current user in Settings'}
                action={<Link to={currentUser ? '/tasks?status=mine' : '/settings'} className="text-xs font-semibold text-ocean-600 hover:underline">Open</Link>}
              >
                {!currentUser ? (
                  <EmptyPanel>No current user selected.</EmptyPanel>
                ) : myOpenTasks.length === 0 ? (
                  <EmptyPanel>No open tasks assigned to you.</EmptyPanel>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {myOpenTasks.map(task => {
                      const overdue = parseDate(task.dueDate) && parseDate(task.dueDate) < today
                      return (
                        <Link key={task.id} to="/tasks?status=mine" className="block px-5 py-3 hover:bg-gray-50">
                          <div className="line-clamp-1 text-sm font-semibold text-gray-800">{task.title}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                            <span>{projectName(projects, task.projectId)}</span>
                            {task.dueDate && <span className={overdue ? 'font-semibold text-red-500' : ''}>{formatShortDate(task.dueDate)}</span>}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </Panel>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Panel title="Upcoming milestones" subtitle="What is coming next across projects" action={<Link to="/calendar" className="text-xs font-semibold text-ocean-600 hover:underline">Calendar</Link>}>
              {upcomingMilestones.length === 0 ? (
                <EmptyPanel>No upcoming milestones.</EmptyPanel>
              ) : (
                <div className="divide-y divide-gray-50">
                  {upcomingMilestones.map(item => (
                    <Link key={item.id} to={`/projects/${item.projectId}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-gray-50">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-gray-800">{item.title}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                          <span>{item.projectName}</span>
                          {item.stageId && <StageChip stageId={item.stageId} />}
                        </div>
                      </div>
                      <div className="shrink-0 text-xs font-semibold text-gray-600">{formatShortDate(item.date)}</div>
                    </Link>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Recent documents" subtitle="Latest items in the document register" action={<Link to="/documents" className="text-xs font-semibold text-ocean-600 hover:underline">Documents</Link>}>
              {recentDocuments.length === 0 ? (
                <EmptyPanel>No documents added yet.</EmptyPanel>
              ) : (
                <div className="divide-y divide-gray-50">
                  {recentDocuments.map(doc => (
                    <Link key={doc.id} to={doc.projectId ? `/projects/${doc.projectId}` : '/documents'} className="block px-5 py-3 hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="shrink-0 text-forest-600" />
                        <div className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800">{doc.name || doc.fileName || 'Untitled document'}</div>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 pl-6 text-xs text-gray-400">
                        <span>{projectName(projects, doc.projectId)}</span>
                        <span>{STAGE_MAP[doc.stageId]?.short || 'General'}</span>
                        <span>{formatShortDate(doc.createdAt)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Recent daily logs" subtitle="Latest field notes and blockers" action={<Link to="/projects" className="text-xs font-semibold text-ocean-600 hover:underline">Projects</Link>}>
              {recentLogs.length === 0 ? (
                <EmptyPanel>No daily logs yet.</EmptyPanel>
              ) : (
                <div className="divide-y divide-gray-50">
                  {recentLogs.map(log => (
                    <Link key={log.id} to={`/projects/${log.projectId}`} className="block px-5 py-3 hover:bg-gray-50">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-sm font-semibold text-gray-800">{projectName(projects, log.projectId)}</div>
                        <span className="shrink-0 text-xs text-gray-400">{formatShortDate(log.logDate || log.createdAt)}</span>
                      </div>
                      <div className="mt-1 line-clamp-2 text-xs text-gray-500">{log.blockers || log.summary || log.workCompleted || log.nextSteps || 'No summary entered'}</div>
                      {log.blockers && <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-red-500">Blocker logged</div>}
                    </Link>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <Panel title="Active stages" subtitle="Projects can now sit across multiple stages">
              <div className="flex gap-3 overflow-x-auto px-5 py-4">
                {stagePipeline.map(stage => (
                  <div key={stage.id} className={`min-w-[190px] rounded-xl border ${stage.border} ${stage.light} p-3`}>
                    <div className={`text-xs font-bold ${stage.text}`}>{stage.label}</div>
                    <div className="mt-3 space-y-1.5">
                      {stage.projects.slice(0, 5).map(project => (
                        <Link key={project.id} to={`/projects/${project.id}`} className="block truncate rounded-lg bg-white/70 px-2 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white">
                          {project.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Contacts coverage" subtitle="People and companies linked into project work">
              <div className="grid grid-cols-2 gap-3 p-5">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Project contacts</div>
                  <div className="mt-2 text-2xl font-bold text-gray-900">{portfolio.contactsLinked}</div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">All contacts</div>
                  <div className="mt-2 text-2xl font-bold text-gray-900">{contacts.length}</div>
                </div>
              </div>
              {projectContacts.length > 0 && (
                <div className="divide-y divide-gray-50 border-t border-gray-100">
                  {projectContacts.slice(0, 4).map(item => (
                    <Link key={item.id} to={`/projects/${item.projectId}`} className="block px-5 py-3 hover:bg-gray-50">
                      <div className="text-sm font-semibold text-gray-800">{contactName(item.contactId) || item.projectRole || 'Project contact'}</div>
                      <div className="text-xs text-gray-400">{projectName(projects, item.projectId)}{item.discipline ? ` / ${item.discipline}` : ''}</div>
                    </Link>
                  ))}
                </div>
              )}
              <div className="border-t border-gray-100 px-5 py-3">
                <Link to="/contacts" className="inline-flex items-center gap-2 text-xs font-semibold text-ocean-600 hover:underline">
                  Open contacts
                  <ArrowRight size={13} />
                </Link>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  )
}
