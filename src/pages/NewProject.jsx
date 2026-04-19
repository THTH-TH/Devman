import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { X, Plus } from 'lucide-react'
import useStore from '../store/useStore'
import { STAGES } from '../data/stages'
import { CHECKLIST_TEMPLATE } from '../data/checklistTemplate'
import { MILESTONE_TEMPLATE } from '../data/milestones'

const STATUS_OPTIONS = ['Active', 'On Hold', 'Blocked', 'Complete']

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent transition'

export default function NewProject() {
  const navigate = useNavigate()
  const { projects, addProject, addBatchChecklistItems, addBatchMilestones, logActivity } = useStore()

  const [form, setForm] = useState({
    name: '',
    address: '',
    clientEntity: '',
    owner: '',
    startDate: '',
    targetCompletion: '',
    currentStage: 'feasibility',
    status: 'Active',
    description: '',
  })
  const [teamInput, setTeamInput] = useState('')
  const [teamMembers, setTeamMembers] = useState([])
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const addTeamMember = () => {
    const val = teamInput.trim()
    if (val && !teamMembers.includes(val)) {
      setTeamMembers(m => [...m, val])
    }
    setTeamInput('')
  }

  const removeTeamMember = name => setTeamMembers(m => m.filter(x => x !== name))

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Project name is required'
    if (!form.address.trim()) errs.address = 'Site address is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)

    const project = await addProject({ ...form, teamMembers })
    if (!project) { setSubmitting(false); return }

    // Generate checklist and milestones in parallel
    await Promise.all([
      addBatchChecklistItems(
        CHECKLIST_TEMPLATE.map(item => ({
          ...item,
          projectId: project.id,
          priority: 'medium',
        }))
      ),
      addBatchMilestones(
        MILESTONE_TEMPLATE.map(m => ({
          ...m,
          projectId: project.id,
        }))
      ),
    ])

    logActivity(project.id, 'Project created', project.name)
    navigate(`/projects/${project.id}`)
  }

  const handleCancel = () => {
    navigate(projects.length === 0 ? '/' : '/projects')
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">New project</h1>
        <p className="text-sm text-gray-400 mt-1">Fill in the details to create a new development project.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">

          {/* Project name */}
          <Field label="Project name" required>
            <input
              type="text"
              className={`${inputCls} ${errors.name ? 'border-red-300 ring-1 ring-red-300' : ''}`}
              placeholder="e.g. Beachwaters Stage 1"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </Field>

          {/* Site address */}
          <Field label="Site address" required>
            <input
              type="text"
              className={`${inputCls} ${errors.address ? 'border-red-300 ring-1 ring-red-300' : ''}`}
              placeholder="e.g. 9 Beachwater Drive, Papamoa"
              value={form.address}
              onChange={e => set('address', e.target.value)}
            />
            {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
          </Field>

          {/* Client / entity */}
          <Field label="Client / entity name">
            <input
              type="text"
              className={inputCls}
              placeholder="e.g. 23 Dickson LP"
              value={form.clientEntity}
              onChange={e => set('clientEntity', e.target.value)}
            />
          </Field>

          {/* Owner */}
          <Field label="Project owner">
            <input
              type="text"
              className={inputCls}
              value={form.owner}
              onChange={e => set('owner', e.target.value)}
            />
          </Field>

          {/* Team members */}
          <Field label="Team members">
            <div className="flex gap-2">
              <input
                type="text"
                className={inputCls}
                placeholder="Add a team member and press Enter"
                value={teamInput}
                onChange={e => setTeamInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTeamMember() } }}
              />
              <button
                type="button"
                onClick={addTeamMember}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
            {teamMembers.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {teamMembers.map(m => (
                  <span key={m} className="inline-flex items-center gap-1 bg-ocean-50 text-ocean-700 text-xs px-2.5 py-1 rounded-full">
                    {m}
                    <button type="button" onClick={() => removeTeamMember(m)}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Field>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start date">
              <input
                type="date"
                className={inputCls}
                value={form.startDate}
                onChange={e => set('startDate', e.target.value)}
              />
            </Field>
            <Field label="Target completion">
              <input
                type="date"
                className={inputCls}
                value={form.targetCompletion}
                onChange={e => set('targetCompletion', e.target.value)}
              />
            </Field>
          </div>

          {/* Stage + Status */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Current stage">
              <select
                className={inputCls}
                value={form.currentStage}
                onChange={e => set('currentStage', e.target.value)}
              >
                {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select
                className={inputCls}
                value={form.status}
                onChange={e => set('status', e.target.value)}
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          {/* Description */}
          <Field label="Description / notes">
            <textarea
              className={`${inputCls} resize-none`}
              rows={4}
              placeholder="Any notes about this project…"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </Field>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="bg-forest-600 hover:bg-forest-700 disabled:opacity-60 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            {submitting ? 'Creating…' : 'Create project'}
          </button>
        </div>
      </form>
    </div>
  )
}
