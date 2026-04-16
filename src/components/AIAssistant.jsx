import { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Send, ChevronDown } from 'lucide-react'
import useStore from '../store/useStore'
import { STAGE_MAP } from '../data/stages'

const SUGGESTIONS = [
  'What should I focus on today?',
  'What is overdue across all projects?',
  'Give me a status summary of all projects',
  'Which project has the most blockers?',
  'What tasks are due this week?',
]

function buildSystemPrompt(projects, checklistItems, milestones) {
  const today = new Date().toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const now = new Date()

  const projectSummaries = projects.map(p => {
    const items = checklistItems.filter(i => i.projectId === p.id)
    const done = items.filter(i => i.done).length
    const overdue = items.filter(i => i.dueDate && !i.done && new Date(i.dueDate) < now)
    const blockers = items.filter(i => i.isBlocker && !i.done)
    const stage = STAGE_MAP[p.currentStage]
    return `• ${p.name} (${p.address}) — Stage: ${stage?.label || p.currentStage}, Status: ${p.status}, Progress: ${done}/${items.length} tasks, Overdue: ${overdue.length}, Blockers: ${blockers.length}`
  }).join('\n')

  const overdueItems = checklistItems
    .filter(i => i.dueDate && !i.done && new Date(i.dueDate) < now)
    .slice(0, 15)
    .map(i => {
      const p = projects.find(p => p.id === i.projectId)
      return `  - "${i.label}" on ${p?.name || 'Unknown'}, due ${i.dueDate}${i.owner ? `, owner: ${i.owner}` : ''}`
    }).join('\n')

  const blockerItems = checklistItems
    .filter(i => i.isBlocker && !i.done)
    .slice(0, 10)
    .map(i => {
      const p = projects.find(p => p.id === i.projectId)
      return `  - "${i.label}" on ${p?.name || 'Unknown'}${i.owner ? `, owner: ${i.owner}` : ''}`
    }).join('\n')

  return `You are an AI project management assistant for Archispace, a property development company based in Papamoa, Tauranga, New Zealand. Today is ${today}.

ACTIVE PROJECTS (${projects.filter(p => p.status === 'Active').length} of ${projects.length}):
${projectSummaries || 'No projects yet.'}

OVERDUE TASKS (${overdueItems ? overdueItems.split('\n').length : 0}):
${overdueItems || 'None.'}

ACTIVE BLOCKERS:
${blockerItems || 'None.'}

Be concise, practical, and direct. Use NZ English. When giving priorities, be specific about what needs to be done and why. Format lists clearly.`
}

export default function AIAssistant() {
  const { projects, checklistItems, milestones } = useStore()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text) => {
    const content = text || input.trim()
    if (!content || loading) return

    setInput('')
    setError(null)
    const userMsg = { role: 'user', content }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: buildSystemPrompt(projects, checklistItems, milestones),
          messages: nextMessages,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'API error')
      const reply = data.content?.[0]?.text || 'No response.'
      setMessages(m => [...m, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err.message || 'Could not reach AI. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 w-12 h-12 bg-ocean-600 hover:bg-ocean-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          title="AI Assistant"
        >
          <Sparkles size={20} />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ height: '520px' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-ocean-600 text-white shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles size={16} />
              <span className="font-semibold text-sm">AI Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button onClick={() => setMessages([])} className="text-white/60 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors">
                  Clear
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white p-1 rounded hover:bg-white/10 transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 text-center">Ask me anything about your projects</p>
                <div className="space-y-2">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="w-full text-left text-xs text-gray-600 bg-gray-50 hover:bg-ocean-50 hover:text-ocean-700 px-3 py-2 rounded-lg border border-gray-100 hover:border-ocean-200 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-ocean-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-3 py-2 rounded-xl rounded-bl-sm">
                  <div className="flex gap-1 items-center h-4">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 shrink-0">
            <div className="flex items-end gap-2 bg-gray-50 rounded-xl border border-gray-200 px-3 py-2 focus-within:border-ocean-500 focus-within:ring-1 focus-within:ring-ocean-500 transition-all">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your projects…"
                className="flex-1 text-sm bg-transparent resize-none focus:outline-none max-h-24 leading-relaxed"
                style={{ minHeight: '22px' }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-7 h-7 bg-ocean-600 hover:bg-ocean-700 disabled:opacity-40 text-white rounded-lg flex items-center justify-center transition-colors shrink-0"
              >
                <Send size={13} />
              </button>
            </div>
            <p className="text-[10px] text-gray-300 mt-1.5 text-center">Powered by Claude</p>
          </div>
        </div>
      )}
    </>
  )
}
