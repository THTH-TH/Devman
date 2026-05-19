const DAY_MS = 86_400_000

function parseDate(value) {
  if (!value) return null
  const parts = String(value).split('-').map(Number)
  if (parts.length === 3 && parts.every(Boolean)) return new Date(parts[0], parts[1] - 1, parts[2])
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  d.setHours(0, 0, 0, 0)
  return d
}

function today() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function scheduleStatus(task) {
  if (task.status === 'complete') return 'complete'
  if (task.status === 'blocked') return 'blocked'
  if (task.status === 'on-hold') return 'on-hold'
  if (task.status === 'delayed') return 'delayed'
  const current = today()
  const finish = parseDate(task.endDate)
  const start = parseDate(task.startDate)
  if (finish && finish < current) return 'delayed'
  if (start && start < current && task.status === 'not-started') return 'delayed'
  if (task.status === 'in-progress' || Number(task.progress || 0) > 0) return 'in-progress'
  return 'not-started'
}

function projectFor(projects, projectId) {
  return projects.find(project => project.id === projectId)
}

export function buildAttentionItems({ projects, checklistItems, milestones, tasks, scheduleTasks }) {
  const now = today()
  const in30 = new Date(now.getTime() + 30 * DAY_MS)
  const items = []

  tasks.forEach(task => {
    const due = parseDate(task.dueDate)
    if (due && due < now && task.status !== 'done') {
      const project = projectFor(projects, task.projectId)
      items.push({
        id: `task-${task.id}`,
        severity: 'critical',
        type: 'Overdue task',
        title: task.title,
        detail: `${task.assignee || 'Unassigned'} - due ${due.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}`,
        projectName: project?.name || 'General',
        href: task.projectId ? `/tasks?project=${task.projectId}&status=overdue` : '/tasks?status=overdue',
      })
    }
  })

  checklistItems.forEach(item => {
    const project = projectFor(projects, item.projectId)
    if (item.isBlocker && !item.done) {
      items.push({
        id: `blocker-${item.id}`,
        severity: 'critical',
        type: 'Blocker',
        title: item.label,
        detail: 'Checklist item is blocking progress',
        projectName: project?.name || 'Project',
        href: item.projectId ? `/projects/${item.projectId}` : '/workflow',
      })
    }
  })

  projects.forEach(project => {
    const missing = checklistItems.filter(item =>
      item.projectId === project.id &&
      item.stageId === project.currentStage &&
      item.requiredToProgress &&
      !item.done
    )
    missing.slice(0, 4).forEach(item => {
      items.push({
        id: `gate-${item.id}`,
        severity: 'warning',
        type: 'Missing stage gate',
        title: item.label,
        detail: 'Required before stage advance',
        projectName: project.name,
        href: `/projects/${project.id}`,
      })
    })
  })

  scheduleTasks.forEach(task => {
    if (scheduleStatus(task) === 'delayed') {
      const project = projectFor(projects, task.projectId)
      items.push({
        id: `schedule-${task.id}`,
        severity: 'warning',
        type: 'Delayed schedule',
        title: task.name,
        detail: task.endDate ? `Finish was ${parseDate(task.endDate)?.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}` : 'Start date has passed',
        projectName: project?.name || 'Project',
        href: task.projectId ? `/projects/${task.projectId}` : '/schedule',
      })
    }
  })

  milestones.forEach(milestone => {
    const date = parseDate(milestone.date)
    if (date && !milestone.complete && date >= now && date <= in30) {
      const project = projectFor(projects, milestone.projectId)
      items.push({
        id: `milestone-${milestone.id}`,
        severity: 'info',
        type: 'Upcoming milestone',
        title: milestone.label,
        detail: date.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }),
        projectName: project?.name || 'Project',
        href: milestone.projectId ? `/projects/${milestone.projectId}` : '/workflow',
      })
    }
  })

  const rank = { critical: 0, warning: 1, info: 2 }
  return items.sort((a, b) => rank[a.severity] - rank[b.severity] || a.projectName.localeCompare(b.projectName)).slice(0, 12)
}
