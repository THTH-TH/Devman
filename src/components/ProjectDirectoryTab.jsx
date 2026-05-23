import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Papa from 'papaparse'
import { Mail, Phone, Plus, Search, Trash2, Upload, X } from 'lucide-react'
import useStore from '../store/useStore'
import { STAGES, STAGE_MAP } from '../data/stages'

const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100'
const ROLE_OPTIONS = ['Archispace', 'Architect', 'Planner', 'Engineer', 'Surveyor', 'Geotech', 'Traffic', 'Council', 'Lawyer', 'Agent', 'Builder', 'Supplier', 'Other']
const STATUS_OPTIONS = ['active', 'tendering', 'waiting', 'inactive']

const normalise = value => String(value || '').trim().toLowerCase()
const headerKey = value => normalise(value).replace(/[^a-z0-9]/g, '')

const DEFAULT_MAP = {
  companyName: ['company', 'companyname', 'business', 'organisation', 'organization'],
  companyType: ['type', 'companytype', 'category'],
  contactName: ['name', 'contact', 'contactname', 'person'],
  email: ['email', 'emailaddress'],
  phone: ['phone', 'mobile', 'telephone'],
  title: ['title', 'position', 'jobtitle'],
  projectRole: ['role', 'projectrole'],
  discipline: ['discipline', 'trade'],
  notes: ['notes', 'note'],
}

function guessMap(headers) {
  const byKey = Object.fromEntries(headers.map(header => [headerKey(header), header]))
  return Object.fromEntries(Object.entries(DEFAULT_MAP).map(([field, keys]) => [
    field,
    keys.map(key => byKey[key]).find(Boolean) || '',
  ]))
}

function AssignmentModal({ project, item, onClose }) {
  const { companies, contacts, addCompany, addContact, addProjectContact, updateProjectContact } = useStore()
  const [newCompany, setNewCompany] = useState('')
  const [newContact, setNewContact] = useState('')
  const [form, setForm] = useState({
    companyId: item?.companyId || '',
    contactId: item?.contactId || '',
    projectRole: item?.projectRole || 'Architect',
    discipline: item?.discipline || '',
    stageIds: item?.stageIds || [],
    status: item?.status || 'active',
    isPrimary: item?.isPrimary || false,
    notes: item?.notes || '',
  })

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const toggleStage = stageId => set('stageIds', form.stageIds.includes(stageId) ? form.stageIds.filter(id => id !== stageId) : [...form.stageIds, stageId])

  const save = async () => {
    let companyId = form.companyId
    let contactId = form.contactId
    if (!companyId && newCompany.trim()) {
      const company = await addCompany({ name: newCompany.trim(), type: form.projectRole })
      companyId = company.id
    }
    if (!contactId && newContact.trim()) {
      const contact = await addContact({ name: newContact.trim(), companyId })
      contactId = contact.id
    }
    if (!companyId && !contactId) return
    const payload = { ...form, projectId: project.id, companyId, contactId, notes: form.notes.trim() }
    if (item) await updateProjectContact(item.id, payload)
    else await addProjectContact(payload)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={event => event.target === event.currentTarget && onClose()}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-900">{item ? 'Edit project contact' : 'Add project contact'}</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-600"><X size={16} /></button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Company</label>
              <select className={inputCls} value={form.companyId} onChange={event => set('companyId', event.target.value)}>
                <option value="">Select company</option>
                {companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
              </select>
              <input className={`${inputCls} mt-2`} value={newCompany} onChange={event => setNewCompany(event.target.value)} placeholder="Or create new company" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Person</label>
              <select className={inputCls} value={form.contactId} onChange={event => set('contactId', event.target.value)}>
                <option value="">Select contact</option>
                {contacts.filter(contact => !form.companyId || contact.companyId === form.companyId).map(contact => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
              </select>
              <input className={`${inputCls} mt-2`} value={newContact} onChange={event => setNewContact(event.target.value)} placeholder="Or create new person" />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Project role</label>
              <select className={inputCls} value={form.projectRole} onChange={event => set('projectRole', event.target.value)}>
                {ROLE_OPTIONS.map(role => <option key={role} value={role}>{role}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Discipline</label>
              <input className={inputCls} value={form.discipline} onChange={event => set('discipline', event.target.value)} placeholder="e.g. Civil, Planning" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Status</label>
              <select className={inputCls} value={form.status} onChange={event => set('status', event.target.value)}>
                {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-600">Stages</label>
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
            Primary project contact
          </label>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Notes</label>
            <textarea className={`${inputCls} resize-none`} rows={3} value={form.notes} onChange={event => set('notes', event.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-50">Cancel</button>
          <button onClick={save} className="rounded-lg bg-forest-600 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700">Save</button>
        </div>
      </div>
    </div>
  )
}

function ContactImport({ project, onClose }) {
  const { companies, contacts, projectContacts, addCompany, addContact, addProjectContact } = useStore()
  const [rows, setRows] = useState([])
  const [headers, setHeaders] = useState([])
  const [map, setMap] = useState({})
  const [status, setStatus] = useState('')

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

  const value = (row, field) => String(row[map[field]] || '').trim()

  const importRows = async () => {
    const companyByName = new Map(companies.map(company => [normalise(company.name), company]))
    const contactByKey = new Map(contacts.map(contact => [`${normalise(contact.email)}|${normalise(contact.name)}|${contact.companyId}`, contact]))
    const assignmentKeys = new Set(projectContacts.filter(item => item.projectId === project.id).map(item => `${item.companyId}|${item.contactId}|${normalise(item.projectRole)}`))
    let imported = 0

    for (const row of rows) {
      const companyName = value(row, 'companyName')
      const contactName = value(row, 'contactName')
      const email = value(row, 'email')
      if (!companyName && !contactName && !email) continue

      let company = companyName ? companyByName.get(normalise(companyName)) : null
      if (!company && companyName) {
        company = await addCompany({ name: companyName, type: value(row, 'companyType'), email: value(row, 'email'), phone: value(row, 'phone'), notes: value(row, 'notes') })
        companyByName.set(normalise(company.name), company)
      }

      const contactKey = `${normalise(email)}|${normalise(contactName)}|${company?.id || ''}`
      let contact = (email || contactName) ? contactByKey.get(contactKey) : null
      if (!contact && (contactName || email)) {
        contact = await addContact({ companyId: company?.id || '', name: contactName || email, title: value(row, 'title'), email, phone: value(row, 'phone'), notes: value(row, 'notes') })
        contactByKey.set(contactKey, contact)
      }

      const projectRole = value(row, 'projectRole') || value(row, 'companyType') || 'Other'
      const assignmentKey = `${company?.id || ''}|${contact?.id || ''}|${normalise(projectRole)}`
      if (!assignmentKeys.has(assignmentKey)) {
        await addProjectContact({
          projectId: project.id,
          companyId: company?.id || '',
          contactId: contact?.id || '',
          projectRole,
          discipline: value(row, 'discipline'),
          notes: value(row, 'notes'),
          status: 'active',
        })
        assignmentKeys.add(assignmentKey)
        imported += 1
      }
    }
    setStatus(`${imported} project contact${imported !== 1 ? 's' : ''} imported`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={event => event.target === event.currentTarget && onClose()}>
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-900">Import project contacts CSV</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-600"><X size={16} /></button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <input type="file" accept=".csv,text/csv" onChange={event => event.target.files?.[0] && loadFile(event.target.files[0])} className="text-sm" />
          {headers.length > 0 && (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                {Object.keys(DEFAULT_MAP).map(field => (
                  <label key={field} className="block">
                    <span className="mb-1 block text-xs font-medium text-gray-600">{field}</span>
                    <select className={inputCls} value={map[field] || ''} onChange={event => setMap(current => ({ ...current, [field]: event.target.value }))}>
                      <option value="">Ignore</option>
                      {headers.map(header => <option key={header} value={header}>{header}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>{headers.slice(0, 8).map(header => <th key={header} className="px-2 py-2 text-left font-medium">{header}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((row, index) => <tr key={index} className="border-t border-gray-100">{headers.slice(0, 8).map(header => <td key={header} className="px-2 py-2 text-gray-600">{row[header]}</td>)}</tr>)}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {status && <div className="rounded-lg border border-forest-100 bg-forest-50 px-3 py-2 text-sm text-forest-700">{status}</div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-50">Close</button>
          <button onClick={importRows} disabled={!rows.length} className="rounded-lg bg-forest-600 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 disabled:opacity-50">Import</button>
        </div>
      </div>
    </div>
  )
}

export default function ProjectDirectoryTab({ project }) {
  const { companies, contacts, projectContacts, teamMembers, currentUser, updateBatchProjectContacts, deleteBatchProjectContacts, deleteProjectContact } = useStore()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [showImport, setShowImport] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [bulkStatus, setBulkStatus] = useState('')

  const rows = useMemo(() => projectContacts
    .filter(item => item.projectId === project.id)
    .map(item => ({
      ...item,
      company: companies.find(company => company.id === item.companyId),
      contact: contacts.find(contact => contact.id === item.contactId),
    }))
    .filter(item => {
      const q = search.trim().toLowerCase()
      if (!q) return true
      return [item.company?.name, item.contact?.name, item.projectRole, item.discipline, item.notes].some(value => String(value || '').toLowerCase().includes(q))
    }), [projectContacts, companies, contacts, project.id, search])

  const groups = useMemo(() => {
    const grouped = new Map()
    rows.forEach(item => {
      const key = item.projectRole || 'Other'
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key).push(item)
    })
    if (!search.trim() && !grouped.has('Archispace')) grouped.set('Archispace', [])
    return [...grouped.entries()]
      .sort(([a], [b]) => (a === 'Archispace' ? -1 : b === 'Archispace' ? 1 : a.localeCompare(b)))
      .map(([role, items]) => ({ role, items }))
  }, [rows, search])

  const archispacePeople = useMemo(() => {
    const projectTeam = (project.teamMembers || [])
      .map(member => typeof member === 'string' ? member : member?.name || member?.email || '')
      .filter(Boolean)
    const globalTeam = teamMembers.map(member => member.name).filter(Boolean)
    return [...new Set([...projectTeam, ...globalTeam, currentUser].filter(Boolean))]
  }, [currentUser, project.teamMembers, teamMembers])

  const toggleSelected = id => setSelected(current => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const selectedIds = [...selected]

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-forest-100 bg-forest-50/50 p-4">
        <div className="text-sm font-semibold text-forest-900">Project contacts</div>
        <p className="mt-1 text-sm text-forest-800/75">
          People appear here once assigned to this project from the main Contacts page or imported into this project. Select multiple people in Contacts, then assign them to a project with a role.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className={`${inputCls} w-72 pl-8`} placeholder="Search contacts, companies, roles..." value={search} onChange={event => setSearch(event.target.value)} />
        </div>
        <div className="flex-1" />
        <Link to="/contacts" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Open main Contacts</Link>
        <button onClick={() => setShowImport(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><Upload size={14} /> Import CSV</button>
        <button onClick={() => setModal({})} className="inline-flex items-center gap-1.5 rounded-lg bg-forest-600 px-3 py-2 text-sm font-medium text-white hover:bg-forest-700"><Plus size={14} /> Assign contact</button>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-forest-100 bg-forest-50 px-3 py-2">
          <span className="text-xs font-medium text-forest-800">{selectedIds.length} selected</span>
          <select value={bulkStatus} onChange={event => setBulkStatus(event.target.value)} className="h-8 rounded border border-gray-200 bg-white px-2 text-xs">
            <option value="">Set status</option>
            {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
          </select>
          <button onClick={() => { if (bulkStatus) updateBatchProjectContacts(selectedIds, { status: bulkStatus }); setSelected(new Set()) }} className="rounded bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50">Apply</button>
          <button onClick={() => { deleteBatchProjectContacts(selectedIds); setSelected(new Set()) }} className="rounded bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50">Remove</button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
            <tr>
              <th className="w-10 px-4 py-3" />
              <th className="px-4 py-3 text-left font-medium">Company / contact</th>
              <th className="px-4 py-3 text-left font-medium">Role</th>
              <th className="px-4 py-3 text-left font-medium">Stages</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="w-20 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {groups.map(group => (
              <Fragment key={group.role}>
                <tr className="bg-gray-50/80">
                  <td colSpan={6} className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${group.role === 'Archispace' ? 'bg-forest-600' : 'bg-ocean-500'}`} />
                      <span className="text-xs font-bold uppercase tracking-wide text-gray-700">{group.role}</span>
                      <span className="text-xs text-gray-400">{group.items.length || (group.role === 'Archispace' ? archispacePeople.length : 0)} people</span>
                    </div>
                  </td>
                </tr>
                {group.items.length === 0 && group.role === 'Archispace' ? (
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">Archispace</div>
                      <div className="text-xs text-gray-500">{archispacePeople.length ? archispacePeople.join(', ') : 'Default internal project group'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">Internal team</td>
                    <td className="px-4 py-3 text-xs text-gray-400">All stages</td>
                    <td className="px-4 py-3 text-xs capitalize text-gray-500"><span className="rounded-full bg-forest-50 px-2 py-0.5 font-medium text-forest-700">Default</span></td>
                    <td />
                  </tr>
                ) : group.items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelected(item.id)} /></td>
                    <td className="px-4 py-3">
                      <button onClick={() => setModal(item)} className="text-left">
                        <div className="font-medium text-gray-900">{item.company?.name || item.contact?.name || 'Unassigned contact'}</div>
                        {item.contact && <div className="text-xs text-gray-500">{item.contact.name}{item.contact.title ? `, ${item.contact.title}` : ''}</div>}
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-400">
                          {item.contact?.email && <span className="inline-flex items-center gap-1"><Mail size={10} /> {item.contact.email}</span>}
                          {(item.contact?.phone || item.company?.phone) && <span className="inline-flex items-center gap-1"><Phone size={10} /> {item.contact?.phone || item.company?.phone}</span>}
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.projectRole || '-'}{item.discipline ? <div className="text-xs text-gray-400">{item.discipline}</div> : null}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(item.stageIds || []).slice(0, 4).map(stageId => <span key={stageId} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">{STAGE_MAP[stageId]?.short || stageId}</span>)}
                        {item.stageIds?.length > 4 && <span className="text-[10px] text-gray-400">+{item.stageIds.length - 4}</span>}
                        {!item.stageIds?.length && <span className="text-xs text-gray-300">All stages</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs capitalize text-gray-500">{item.status}{item.isPrimary ? <span className="ml-2 rounded-full bg-forest-50 px-2 py-0.5 font-medium text-forest-700">Primary</span> : null}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => deleteProjectContact(item.id)} className="rounded p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
            {rows.length === 0 && search && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">No contacts match this search.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && <AssignmentModal project={project} item={modal.id ? modal : null} onClose={() => setModal(null)} />}
      {showImport && <ContactImport project={project} onClose={() => setShowImport(false)} />}
    </div>
  )
}
