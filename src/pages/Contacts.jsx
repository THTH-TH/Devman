import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Papa from 'papaparse'
import {
  Building2,
  Download,
  FolderKanban,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react'
import useStore from '../store/useStore'
import { STAGES, STAGE_MAP } from '../data/stages'

const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100'
const ROLE_OPTIONS = ['Architect', 'Planner', 'Engineer', 'Surveyor', 'Geotech', 'Traffic', 'Council', 'Lawyer', 'Agent', 'Builder', 'Supplier', 'Broker', 'Solicitor', 'Other']
const STATUS_OPTIONS = ['active', 'tendering', 'waiting', 'inactive']

const normalise = value => String(value || '').trim().toLowerCase()
const headerKey = value => normalise(value).replace(/[^a-z0-9]/g, '')
const initials = value => String(value || 'A').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'A'

const DEFAULT_MAP = {
  companyName: ['company', 'companyname', 'business', 'organisation', 'organization', 'account'],
  companyType: ['type', 'companytype', 'category', 'trade'],
  contactName: ['name', 'fullname', 'contact', 'contactname', 'person'],
  firstName: ['firstname', 'first'],
  lastName: ['lastname', 'last', 'surname'],
  email: ['email', 'emailaddress', 'mail'],
  phone: ['phone', 'mobile', 'telephone', 'phonenumber'],
  title: ['title', 'position', 'jobtitle', 'role'],
  project: ['project', 'projectname', 'site'],
  projectRole: ['projectrole', 'project role', 'roleonproject', 'role'],
  discipline: ['discipline', 'specialty', 'speciality'],
  notes: ['notes', 'note', 'comments', 'comment'],
}

function guessMap(headers) {
  const byKey = Object.fromEntries(headers.map(header => [headerKey(header), header]))
  return Object.fromEntries(Object.entries(DEFAULT_MAP).map(([field, keys]) => [
    field,
    keys.map(key => byKey[headerKey(key)]).find(Boolean) || '',
  ]))
}

function statusCls(status) {
  return {
    active: 'bg-green-50 text-green-700 border-green-100',
    tendering: 'bg-blue-50 text-blue-700 border-blue-100',
    waiting: 'bg-amber-50 text-amber-700 border-amber-100',
    inactive: 'bg-gray-100 text-gray-500 border-gray-200',
  }[status] || 'bg-gray-100 text-gray-500 border-gray-200'
}

function downloadCsv(filename, rows) {
  const csv = Papa.unparse(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function ContactModal({ record, onClose }) {
  const { companies, addCompany, updateCompany, deleteCompany, addContact, updateContact, deleteContact } = useStore()
  const company = record?.company || null
  const contact = record?.contact || null
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [newCompany, setNewCompany] = useState('')
  const [form, setForm] = useState({
    companyId: company?.id || contact?.companyId || '',
    companyName: company?.name || '',
    companyType: company?.type || '',
    companyPhone: company?.phone || '',
    companyEmail: company?.email || '',
    companyWebsite: company?.website || '',
    companyAddress: company?.address || '',
    contactName: contact?.name || '',
    title: contact?.title || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    notes: contact?.notes || company?.notes || '',
  })

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))

  const save = async () => {
    let companyId = form.companyId
    if (!companyId && newCompany.trim()) {
      const created = await addCompany({ name: newCompany.trim(), type: form.companyType, phone: form.companyPhone, email: form.companyEmail, website: form.companyWebsite, address: form.companyAddress, notes: !form.contactName.trim() ? form.notes : '' })
      companyId = created.id
    } else if (companyId && company?.id === companyId) {
      await updateCompany(companyId, {
        type: form.companyType,
        phone: form.companyPhone,
        email: form.companyEmail,
        website: form.companyWebsite,
        address: form.companyAddress,
        notes: record?.kind === 'company' ? form.notes : company?.notes || '',
      })
    }

    if (contact?.id) {
      await updateContact(contact.id, { companyId, name: form.contactName.trim(), title: form.title, email: form.email, phone: form.phone, notes: form.notes })
    } else if (form.contactName.trim() || form.email.trim() || form.phone.trim()) {
      await addContact({ companyId, name: form.contactName.trim() || form.email.trim() || form.phone.trim(), title: form.title, email: form.email, phone: form.phone, notes: form.notes })
    } else if (!companyId && form.companyName.trim()) {
      await addCompany({ name: form.companyName.trim(), type: form.companyType, phone: form.companyPhone, email: form.companyEmail, website: form.companyWebsite, address: form.companyAddress, notes: form.notes })
    }
    onClose()
  }

  const remove = async () => {
    if (contact?.id) await deleteContact(contact.id)
    else if (company?.id) await deleteCompany(company.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/25" onClick={event => event.target === event.currentTarget && onClose()}>
      <div className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{record ? 'Edit contact' : 'New contact'}</h2>
            <p className="text-sm text-gray-400">Person and company details stay in the central contacts register.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="space-y-6 px-6 py-5">
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Person</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className="mb-1 block text-xs font-medium text-gray-600">Name</span>
                <input className={inputCls} value={form.contactName} onChange={event => set('contactName', event.target.value)} placeholder="e.g. Marc Vale" autoFocus />
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-gray-600">Email</span>
                <input className={inputCls} value={form.email} onChange={event => set('email', event.target.value)} placeholder="name@example.co.nz" />
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-gray-600">Phone</span>
                <input className={inputCls} value={form.phone} onChange={event => set('phone', event.target.value)} placeholder="021..." />
              </label>
              <label className="md:col-span-2">
                <span className="mb-1 block text-xs font-medium text-gray-600">Title / role</span>
                <input className={inputCls} value={form.title} onChange={event => set('title', event.target.value)} placeholder="Director, Planner, Civil engineer..." />
              </label>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Company</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className="mb-1 block text-xs font-medium text-gray-600">Existing company</span>
                <select className={inputCls} value={form.companyId} onChange={event => set('companyId', event.target.value)}>
                  <option value="">No company</option>
                  {companies.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              {!form.companyId && (
                <label className="md:col-span-2">
                  <span className="mb-1 block text-xs font-medium text-gray-600">Or create company</span>
                  <input className={inputCls} value={newCompany || form.companyName} onChange={event => setNewCompany(event.target.value)} placeholder="Company name" />
                </label>
              )}
              <label>
                <span className="mb-1 block text-xs font-medium text-gray-600">Company type</span>
                <input className={inputCls} value={form.companyType} onChange={event => set('companyType', event.target.value)} placeholder="Contractor, consultant, council..." />
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-gray-600">Website</span>
                <input className={inputCls} value={form.companyWebsite} onChange={event => set('companyWebsite', event.target.value)} />
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-gray-600">Company email</span>
                <input className={inputCls} value={form.companyEmail} onChange={event => set('companyEmail', event.target.value)} />
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-gray-600">Company phone</span>
                <input className={inputCls} value={form.companyPhone} onChange={event => set('companyPhone', event.target.value)} />
              </label>
              <label className="md:col-span-2">
                <span className="mb-1 block text-xs font-medium text-gray-600">Address</span>
                <input className={inputCls} value={form.companyAddress} onChange={event => set('companyAddress', event.target.value)} />
              </label>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Notes</h3>
            <textarea className={`${inputCls} min-h-24 resize-none`} value={form.notes} onChange={event => set('notes', event.target.value)} placeholder="Useful notes, rates, trade, history..." />
          </section>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between border-t border-gray-100 bg-white px-6 py-4">
          {record ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <button onClick={remove} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Delete</button>
                <button onClick={() => setConfirmDelete(false)} className="text-sm text-gray-400">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700"><Trash2 size={14} /> Delete</button>
            )
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-50">Cancel</button>
            <button onClick={save} className="rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-700">Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AssignProjectModal({ records, onClose }) {
  const { projects, projectContacts, addProjectContact } = useStore()
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState(null)
  const [form, setForm] = useState({
    projectId: projects[0]?.id || '',
    projectRole: 'Other',
    discipline: '',
    status: 'active',
    stageIds: [],
    isPrimary: false,
    notes: '',
  })
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const toggleStage = stageId => set('stageIds', form.stageIds.includes(stageId) ? form.stageIds.filter(id => id !== stageId) : [...form.stageIds, stageId])

  const assign = async () => {
    if (!form.projectId || !records.length) return
    setSaving(true)
    let count = 0
    const existing = new Set(projectContacts.map(item => `${item.projectId}|${item.companyId || ''}|${item.contactId || ''}|${normalise(item.projectRole)}`))
    for (const record of records) {
      const key = `${form.projectId}|${record.company?.id || ''}|${record.contact?.id || ''}|${normalise(form.projectRole)}`
      if (existing.has(key)) continue
      await addProjectContact({
        projectId: form.projectId,
        companyId: record.company?.id || '',
        contactId: record.contact?.id || '',
        projectRole: form.projectRole,
        discipline: form.discipline,
        status: form.status,
        stageIds: form.stageIds,
        isPrimary: form.isPrimary,
        notes: form.notes,
      })
      existing.add(key)
      count += 1
    }
    setSaving(false)
    setCreated(count)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={event => event.target === event.currentTarget && onClose()}>
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Add to project group</h2>
            <p className="text-sm text-gray-400">{records.length} selected contact{records.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-50"><X size={16} /></button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="md:col-span-2">
              <span className="mb-1 block text-xs font-medium text-gray-600">Project</span>
              <select className={inputCls} value={form.projectId} onChange={event => set('projectId', event.target.value)}>
                {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-medium text-gray-600">Status</span>
              <select className={inputCls} value={form.status} onChange={event => set('status', event.target.value)}>
                {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-medium text-gray-600">Project role</span>
              <select className={inputCls} value={form.projectRole} onChange={event => set('projectRole', event.target.value)}>
                {ROLE_OPTIONS.map(role => <option key={role} value={role}>{role}</option>)}
              </select>
            </label>
            <label className="md:col-span-2">
              <span className="mb-1 block text-xs font-medium text-gray-600">Discipline / trade</span>
              <input className={inputCls} value={form.discipline} onChange={event => set('discipline', event.target.value)} placeholder="e.g. Civil, planning, piling" />
            </label>
          </div>
          <div>
            <span className="mb-2 block text-xs font-medium text-gray-600">Stages</span>
            <div className="flex flex-wrap gap-2">
              {STAGES.map(stage => (
                <button key={stage.id} type="button" onClick={() => toggleStage(stage.id)} className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${form.stageIds.includes(stage.id) ? `${stage.light} ${stage.text} ${stage.border}` : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  {stage.short}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={form.isPrimary} onChange={event => set('isPrimary', event.target.checked)} />
            Mark as primary for this project role
          </label>
          <textarea className={`${inputCls} min-h-20 resize-none`} value={form.notes} onChange={event => set('notes', event.target.value)} placeholder="Project notes for this group..." />
          {created !== null && <div className="rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700">{created} assignment{created !== 1 ? 's' : ''} created.</div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-50">Close</button>
          <button onClick={assign} disabled={saving || !records.length} className="rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-700 disabled:opacity-50">{saving ? 'Assigning...' : 'Assign to project'}</button>
        </div>
      </div>
    </div>
  )
}

function ImportModal({ onClose }) {
  const { companies, contacts, projects, projectContacts, addCompany, updateCompany, addContact, updateContact, addProjectContact } = useStore()
  const [headers, setHeaders] = useState([])
  const [rows, setRows] = useState([])
  const [map, setMap] = useState({})
  const [defaultProjectId, setDefaultProjectId] = useState('')
  const [status, setStatus] = useState('')

  const value = (row, field) => String(row[map[field]] || '').trim()

  const loadFile = file => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: result => {
        const parsedRows = result.data.filter(row => Object.values(row).some(Boolean))
        const parsedHeaders = result.meta.fields || []
        setRows(parsedRows)
        setHeaders(parsedHeaders)
        setMap(guessMap(parsedHeaders))
        setStatus('')
      },
    })
  }

  const importRows = async () => {
    const companyByName = new Map(companies.map(company => [normalise(company.name), company]))
    const contactByEmail = new Map(contacts.filter(contact => contact.email).map(contact => [normalise(contact.email), contact]))
    const contactByPhone = new Map(contacts.filter(contact => contact.phone).map(contact => [normalise(contact.phone), contact]))
    const assignmentKeys = new Set(projectContacts.map(item => `${item.projectId}|${item.companyId || ''}|${item.contactId || ''}|${normalise(item.projectRole)}`))
    let createdContacts = 0
    let updatedContacts = 0
    let assignments = 0
    let skipped = 0

    for (const row of rows) {
      const companyName = value(row, 'companyName')
      const contactName = value(row, 'contactName') || [value(row, 'firstName'), value(row, 'lastName')].filter(Boolean).join(' ')
      const email = value(row, 'email')
      const phone = value(row, 'phone')
      if (!companyName && !contactName && !email && !phone) {
        skipped += 1
        continue
      }

      let company = companyName ? companyByName.get(normalise(companyName)) : null
      if (!company && companyName) {
        company = await addCompany({ name: companyName, type: value(row, 'companyType'), email: '', phone: '', notes: value(row, 'notes') })
        companyByName.set(normalise(company.name), company)
      } else if (company && value(row, 'companyType') && !company.type) {
        await updateCompany(company.id, { type: value(row, 'companyType') })
        company = { ...company, type: value(row, 'companyType') }
      }

      let contact = (email && contactByEmail.get(normalise(email))) || (phone && contactByPhone.get(normalise(phone)))
      if (!contact) {
        contact = await addContact({ companyId: company?.id || '', name: contactName || email || phone, title: value(row, 'title'), email, phone, notes: value(row, 'notes') })
        createdContacts += 1
        if (contact.email) contactByEmail.set(normalise(contact.email), contact)
        if (contact.phone) contactByPhone.set(normalise(contact.phone), contact)
      } else {
        const updates = {}
        if (company?.id && !contact.companyId) updates.companyId = company.id
        if (contactName && !contact.name) updates.name = contactName
        if (value(row, 'title') && !contact.title) updates.title = value(row, 'title')
        if (email && !contact.email) updates.email = email
        if (phone && !contact.phone) updates.phone = phone
        if (value(row, 'notes')) updates.notes = [contact.notes, value(row, 'notes')].filter(Boolean).join('\n')
        if (Object.keys(updates).length) {
          await updateContact(contact.id, updates)
          contact = { ...contact, ...updates }
          updatedContacts += 1
        }
      }

      const projectName = value(row, 'project')
      const project = projects.find(item => normalise(item.name) === normalise(projectName)) || projects.find(item => normalise(projectName).includes(normalise(item.name))) || projects.find(item => item.id === defaultProjectId)
      if (project) {
        const projectRole = value(row, 'projectRole') || value(row, 'companyType') || 'Other'
        const key = `${project.id}|${company?.id || contact.companyId || ''}|${contact.id}|${normalise(projectRole)}`
        if (!assignmentKeys.has(key)) {
          await addProjectContact({
            projectId: project.id,
            companyId: company?.id || contact.companyId || '',
            contactId: contact.id,
            projectRole,
            discipline: value(row, 'discipline'),
            status: 'active',
            notes: value(row, 'notes'),
          })
          assignmentKeys.add(key)
          assignments += 1
        }
      }
    }
    setStatus(`${createdContacts} created, ${updatedContacts} updated, ${assignments} project assignments, ${skipped} skipped.`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={event => event.target === event.currentTarget && onClose()}>
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Import contacts CSV</h2>
            <p className="text-sm text-gray-400">Works with contractor lists, exported Google contacts, and project directory CSV files.</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-50"><X size={16} /></button>
        </div>
        <div className="space-y-5 px-6 py-5">
          <div className="grid gap-3 md:grid-cols-[1fr_260px]">
            <input type="file" accept=".csv,text/csv" onChange={event => event.target.files?.[0] && loadFile(event.target.files[0])} className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm" />
            <select className={inputCls} value={defaultProjectId} onChange={event => setDefaultProjectId(event.target.value)}>
              <option value="">No default project assignment</option>
              {projects.map(project => <option key={project.id} value={project.id}>Assign unmatched rows to {project.name}</option>)}
            </select>
          </div>
          {headers.length > 0 && (
            <>
              <div className="grid gap-3 md:grid-cols-4">
                {Object.keys(DEFAULT_MAP).map(field => (
                  <label key={field}>
                    <span className="mb-1 block text-xs font-medium text-gray-600">{field}</span>
                    <select className={inputCls} value={map[field] || ''} onChange={event => setMap(current => ({ ...current, [field]: event.target.value }))}>
                      <option value="">Ignore</option>
                      {headers.map(header => <option key={header} value={header}>{header}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>{headers.slice(0, 9).map(header => <th key={header} className="px-3 py-2 text-left font-medium">{header}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 6).map((row, index) => (
                      <tr key={index} className="border-t border-gray-100">
                        {headers.slice(0, 9).map(header => <td key={header} className="px-3 py-2 text-gray-600">{row[header]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {status && <div className="rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700">{status}</div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-50">Close</button>
          <button onClick={importRows} disabled={!rows.length} className="rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-700 disabled:opacity-50">Import contacts</button>
        </div>
      </div>
    </div>
  )
}

export default function Contacts() {
  const { companies, contacts, projects, projectContacts } = useStore()
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [modalRecord, setModalRecord] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showAssign, setShowAssign] = useState(false)

  const projectName = id => projects.find(project => project.id === id)?.name || ''
  const assignmentRows = useMemo(() => projectContacts.map(item => ({
    ...item,
    project: projects.find(project => project.id === item.projectId),
    contact: contacts.find(contact => contact.id === item.contactId),
    company: companies.find(company => company.id === item.companyId),
  })), [companies, contacts, projectContacts, projects])

  const records = useMemo(() => {
    const contactRecords = contacts.map(contact => {
      const company = companies.find(item => item.id === contact.companyId)
      const assignments = assignmentRows.filter(item => item.contactId === contact.id)
      return {
        key: `contact:${contact.id}`,
        kind: 'contact',
        contact,
        company,
        name: contact.name || contact.email || contact.phone || 'Unnamed contact',
        email: contact.email || company?.email || '',
        phone: contact.phone || company?.phone || '',
        type: company?.type || '',
        notes: contact.notes || '',
        assignments,
      }
    })
    const companyOnlyRecords = companies
      .filter(company => !contacts.some(contact => contact.companyId === company.id))
      .map(company => {
        const assignments = assignmentRows.filter(item => item.companyId === company.id && !item.contactId)
        return {
          key: `company:${company.id}`,
          kind: 'company',
          contact: null,
          company,
          name: company.name,
          email: company.email || '',
          phone: company.phone || '',
          type: company.type || '',
          notes: company.notes || '',
          assignments,
        }
      })
    return [...contactRecords, ...companyOnlyRecords].sort((a, b) => a.name.localeCompare(b.name))
  }, [assignmentRows, companies, contacts])

  const filtered = useMemo(() => records.filter(record => {
    const q = search.trim().toLowerCase()
    if (q && ![record.name, record.email, record.phone, record.company?.name, record.type, record.notes].some(value => String(value || '').toLowerCase().includes(q))) return false
    if (projectFilter && !record.assignments.some(item => item.projectId === projectFilter)) return false
    if (typeFilter && normalise(record.type) !== normalise(typeFilter)) return false
    return true
  }), [projectFilter, records, search, typeFilter])

  const typeOptions = useMemo(() => [...new Set(companies.map(company => company.type).filter(Boolean))].sort(), [companies])
  const selectedRecords = useMemo(() => records.filter(record => selected.has(record.key)), [records, selected])
  const activeAssignments = assignmentRows.filter(item => item.status !== 'inactive')

  const toggle = key => setSelected(current => {
    const next = new Set(current)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })

  const exportAll = () => {
    downloadCsv('devman-contacts.csv', records.map(record => ({
      name: record.contact?.name || '',
      title: record.contact?.title || '',
      email: record.contact?.email || record.company?.email || '',
      phone: record.contact?.phone || record.company?.phone || '',
      company: record.company?.name || '',
      company_type: record.company?.type || '',
      company_email: record.company?.email || '',
      company_phone: record.company?.phone || '',
      website: record.company?.website || '',
      address: record.company?.address || '',
      projects: record.assignments.map(item => projectName(item.projectId)).filter(Boolean).join('; '),
      project_roles: record.assignments.map(item => item.projectRole).filter(Boolean).join('; '),
      notes: record.notes || '',
    })))
  }

  const groupsByProject = useMemo(() => projects.map(project => ({
    project,
    assignments: assignmentRows.filter(item => item.projectId === project.id),
  })).filter(item => item.assignments.length > 0), [assignmentRows, projects])

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-gray-100 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Contacts</h1>
            <p className="mt-0.5 text-sm text-gray-400">Companies, contractors, consultants, project groups and imported email contacts.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowImport(true)} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"><Upload size={14} /> Import CSV</button>
            <button onClick={exportAll} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"><Download size={14} /> Export CSV</button>
            <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-700"><Plus size={14} /> Add contact</button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl space-y-5 p-6">
          <div className="grid gap-3 md:grid-cols-4">
            {[
              ['Contacts', records.length, Users],
              ['Companies', companies.length, Building2],
              ['Project links', activeAssignments.length, FolderKanban],
              ['No email', records.filter(record => !record.email).length, Mail],
            ].map(([label, value, Icon]) => (
              <div key={label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{value}</div>
                    <div className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-2 text-forest-700"><Icon size={18} /></div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-lg bg-white p-2 text-blue-700"><Mail size={16} /></div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-blue-900">Email contacts</div>
                <div className="text-sm text-blue-700">Import a Google Contacts CSV for now. Direct Gmail/Google Contacts sync can be added once we wire OAuth into DevMan.</div>
              </div>
              <button onClick={() => setShowImport(true)} className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50">Import Google CSV</button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input className={`${inputCls} w-80 pl-8`} placeholder="Search contacts, companies, phone, email..." value={search} onChange={event => setSearch(event.target.value)} />
                </div>
                <select className={`${inputCls} w-56`} value={projectFilter} onChange={event => setProjectFilter(event.target.value)}>
                  <option value="">All projects</option>
                  {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
                <select className={`${inputCls} w-48`} value={typeFilter} onChange={event => setTypeFilter(event.target.value)}>
                  <option value="">All types</option>
                  {typeOptions.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
                <div className="flex-1" />
                <button onClick={() => setShowAssign(true)} disabled={!selectedRecords.length} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"><FolderKanban size={14} /> Add to project</button>
              </div>
              {selectedRecords.length > 0 && (
                <div className="mt-3 rounded-lg border border-forest-100 bg-forest-50 px-3 py-2 text-sm text-forest-800">
                  {selectedRecords.length} selected. Use Add to project to create a project group/role.
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
                    <th className="w-10 px-4 py-3"><input type="checkbox" checked={filtered.length > 0 && filtered.every(record => selected.has(record.key))} onChange={event => setSelected(event.target.checked ? new Set(filtered.map(record => record.key)) : new Set())} /></th>
                    <th className="px-4 py-3 text-left font-medium">Contact</th>
                    <th className="px-4 py-3 text-left font-medium">Company</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Phone</th>
                    <th className="px-4 py-3 text-left font-medium">Projects</th>
                    <th className="px-4 py-3 text-left font-medium">Role/status</th>
                    <th className="w-16 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(record => (
                    <tr key={record.key} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><input type="checkbox" checked={selected.has(record.key)} onChange={() => toggle(record.key)} /></td>
                      <td className="px-4 py-3">
                        <button onClick={() => setModalRecord(record)} className="flex min-w-0 items-center gap-3 text-left">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-50 text-xs font-bold text-forest-700">{initials(record.name)}</span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-gray-900">{record.name}</span>
                            {record.contact?.title && <span className="block truncate text-xs text-gray-400">{record.contact.title}</span>}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-700">{record.company?.name || '-'}</div>
                        {record.type && <div className="text-xs text-gray-400">{record.type}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm">{record.email ? <a className="text-ocean-600 hover:underline" href={`mailto:${record.email}`}>{record.email}</a> : <span className="text-gray-300">-</span>}</td>
                      <td className="px-4 py-3 text-sm">{record.phone ? <a className="text-ocean-600 hover:underline" href={`tel:${record.phone}`}>{record.phone}</a> : <span className="text-gray-300">-</span>}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {record.assignments.slice(0, 3).map(item => <Link key={item.id} to={`/projects/${item.projectId}`} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 hover:bg-gray-200">{projectName(item.projectId)}</Link>)}
                          {record.assignments.length > 3 && <span className="text-[11px] text-gray-400">+{record.assignments.length - 3}</span>}
                          {record.assignments.length === 0 && <span className="text-xs text-gray-300">No project</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {record.assignments.length ? (
                          <div className="flex flex-wrap gap-1">
                            {record.assignments.slice(0, 2).map(item => (
                              <span key={item.id} className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusCls(item.status)}`}>
                                {item.projectRole || 'Contact'} / {item.status}
                              </span>
                            ))}
                          </div>
                        ) : <span className="text-xs text-gray-300">-</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setModalRecord(record)} className="rounded p-1.5 text-gray-300 hover:bg-ocean-50 hover:text-ocean-600"><Pencil size={14} /></button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-14 text-center text-sm text-gray-400">No contacts match this view.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Project groups</h2>
                <p className="text-sm text-gray-400">These are the contacts attached to projects and available for project tasks, schedule tasks and document sharing.</p>
              </div>
              <button onClick={() => setShowAssign(true)} disabled={!selectedRecords.length} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40">Create from selected</button>
            </div>
            {groupsByProject.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">No project contact groups yet. Select contacts above and add them to a project.</div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {groupsByProject.map(({ project, assignments }) => (
                  <div key={project.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Link to={`/projects/${project.id}`} className="font-semibold text-gray-900 hover:text-ocean-700">{project.name}</Link>
                        <div className="text-xs text-gray-400">{assignments.length} contact{assignments.length !== 1 ? 's' : ''}</div>
                      </div>
                      <Link to={`/projects/${project.id}`} className="text-xs font-semibold text-forest-700 hover:underline">Open project</Link>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {assignments.slice(0, 8).map(item => (
                        <span key={item.id} className={`rounded-full border px-2 py-1 text-xs font-medium ${statusCls(item.status)}`}>
                          {item.contact?.name || item.company?.name || item.projectRole || 'Contact'}
                        </span>
                      ))}
                      {assignments.length > 8 && <span className="rounded-full bg-white px-2 py-1 text-xs text-gray-400">+{assignments.length - 8}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showNew && <ContactModal onClose={() => setShowNew(false)} />}
      {modalRecord && <ContactModal record={modalRecord} onClose={() => setModalRecord(null)} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
      {showAssign && <AssignProjectModal records={selectedRecords} onClose={() => { setShowAssign(false); setSelected(new Set()) }} />}
    </div>
  )
}
