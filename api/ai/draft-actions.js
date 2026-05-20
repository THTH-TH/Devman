function fallbackDrafts(context = {}) {
  const project = context.project || {}
  const scheduleTasks = context.scheduleTasks || []
  const checklistItems = context.checklistItems || []
  const documents = context.documents || []
  const dailyLogs = context.dailyLogs || []
  const propertyProfile = context.propertyProfile || null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const delayed = scheduleTasks.filter(task => {
    if (['complete', 'on-hold'].includes(task.status)) return false
    const finish = task.endDate ? new Date(task.endDate) : null
    return task.status === 'delayed' || (finish && finish < today)
  })
  const blockers = checklistItems.filter(item => item.isBlocker && !item.done)
  const missingDocs = ['drawing', 'consent'].filter(category => !documents.some(doc => doc.category === category))
  const logBlocker = dailyLogs.find(log => log.blockers)

  const drafts = []
  if (delayed.length) {
    drafts.push({
      actionType: 'create_task',
      title: `Recover ${delayed[0].name}`,
      rationale: `${delayed[0].name} is delayed or past its finish date. Create an explicit recovery task so it is owned and tracked.`,
      payload: {
        title: `Recover delayed schedule item: ${delayed[0].name}`,
        description: `Review blockers, agree revised date, and confirm owner for ${delayed[0].name}.`,
        priority: 'high',
        dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
        status: 'open',
      },
    })
  }
  if (blockers.length) {
    drafts.push({
      actionType: 'create_task',
      title: `Clear blocker: ${blockers[0].label}`,
      rationale: 'Checklist blockers should become owned tasks, not passive warnings.',
      payload: {
        title: `Clear blocker: ${blockers[0].label}`,
        description: blockers[0].description || 'Confirm the next action and owner for this blocker.',
        priority: 'critical',
        dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        status: 'open',
      },
    })
  }
  if (missingDocs.length) {
    drafts.push({
      actionType: 'missing_documents',
      title: `Missing ${missingDocs.join(' and ')} documents`,
      rationale: `No ${missingDocs.join(' or ')} document is currently linked to ${project.name || 'this project'}.`,
      payload: { categories: missingDocs },
    })
  }
  if (logBlocker) {
    drafts.push({
      actionType: 'create_task',
      title: 'Follow up daily-log blocker',
      rationale: `A recent daily log recorded a blocker: ${logBlocker.blockers}`,
      payload: {
        title: 'Follow up daily-log blocker',
        description: logBlocker.blockers,
        priority: 'high',
        dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        status: 'open',
      },
    })
  }
  if (propertyProfile && !propertyProfile.titleSummary?.legalDescription) {
    drafts.push({
      actionType: 'property_due_diligence',
      title: 'Complete title/legal evidence',
      rationale: 'The property profile has address intelligence but no confirmed title/legal evidence yet.',
      payload: { section: 'titleSummary' },
    })
  }

  if (!drafts.length) {
    drafts.push({
      actionType: 'priority_summary',
      title: 'Today looks clear',
      rationale: 'No blockers, delayed schedule items, or obvious missing consent/drawing documents were found.',
      payload: { projectId: project.id },
    })
  }
  return drafts.slice(0, 6)
}

function extractJson(text) {
  if (!text) return null
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)
  const raw = fenced ? fenced[1] : text
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  if (start === -1 || end === -1) return null
  return JSON.parse(raw.slice(start, end + 1))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { context = {} } = req.body || {}
  const fallback = fallbackDrafts(context)

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({ drafts: fallback, source: 'deterministic' })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        system: [
          'You draft reviewable project actions for Archispace, a New Zealand property development company.',
          'Return only a JSON array. Do not mutate records.',
          'Allowed actionType values: create_task, create_schedule_task, missing_documents, follow_up_email, property_due_diligence, schedule_risk_summary, priority_summary.',
          'Each item must include actionType, title, rationale, and payload.',
        ].join(' '),
        messages: [{
          role: 'user',
          content: `Draft up to 6 practical actions from this DevMan project context:\n${JSON.stringify(context).slice(0, 15000)}`,
        }],
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return res.status(200).json({ drafts: fallback, source: 'deterministic', warning: data.error?.message || 'AI provider error' })
    }
    const text = data.content?.map(part => part.text || '').join('\n') || ''
    const drafts = extractJson(text)
    return res.status(200).json({ drafts: Array.isArray(drafts) && drafts.length ? drafts : fallback, source: 'ai' })
  } catch (error) {
    return res.status(200).json({ drafts: fallback, source: 'deterministic', warning: error.message })
  }
}
