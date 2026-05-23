import { useMemo, useState } from 'react'
import { Check, Copy, ExternalLink, Loader2, Mail, Users, X } from 'lucide-react'
import useStore from '../store/useStore'
import { STAGE_MAP } from '../data/stages'

const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-ocean-400'
const tabCls = active => `rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${active ? 'bg-forest-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`

function toSnapshot(doc) {
  return {
    id: doc.id,
    name: doc.name,
    url: doc.url || doc.driveUrl || '',
    source: doc.source || '',
    storagePath: doc.storagePath || '',
    category: doc.category || '',
    stageId: doc.stageId || '',
    folderPath: doc.folderPath || '',
    revision: doc.revision || '',
    drawingNumber: doc.drawingNumber || '',
    discipline: doc.discipline || '',
    issuedFor: doc.issuedFor || '',
    documentStatus: doc.documentStatus || '',
    addedBy: doc.addedBy || '',
    notes: doc.notes || '',
  }
}

const splitEmails = value => value
  .split(/[\s,;]+/)
  .map(item => item.trim())
  .filter(Boolean)
  .filter(item => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item))

const uniqueRecipients = recipients => {
  const seen = new Set()
  return recipients.filter(recipient => {
    const email = String(recipient.email || '').toLowerCase()
    if (!email || seen.has(email)) return false
    seen.add(email)
    return true
  })
}

function buildMailto({ recipients, subject, body }) {
  const emails = recipients.map(recipient => recipient.email).join(',')
  if (!emails) return ''
  return `mailto:${emails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export default function ShareDocumentsModal({ project, documents, onClose }) {
  const {
    addDocumentShare,
    currentUser,
    teamMembers,
    projectContacts,
    contacts,
    companies,
  } = useStore()
  const [title, setTitle] = useState(`${project?.name || 'Archispace'} document issue`)
  const [expiryDays, setExpiryDays] = useState(14)
  const [shareMode, setShareMode] = useState('link')
  const [recipientText, setRecipientText] = useState('')
  const [selectedRecipients, setSelectedRecipients] = useState([])
  const [selectedGroups, setSelectedGroups] = useState([])
  const [message, setMessage] = useState('Please see the selected project documents below.')
  const [saving, setSaving] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [emailUrl, setEmailUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const hasPrivateUploads = useMemo(() => documents.some(doc => doc.storagePath), [documents])
  const projectDirectoryRecipients = useMemo(() => {
    if (!project?.id) return []
    return projectContacts
      .filter(item => item.projectId === project.id)
      .flatMap(item => {
        const contact = contacts.find(person => person.id === item.contactId)
        const company = companies.find(entry => entry.id === item.companyId)
        const recipients = []
        if (contact?.email) recipients.push({ name: contact.name || contact.email, email: contact.email, source: 'Project directory' })
        if (company?.email) recipients.push({ name: company.name || company.email, email: company.email, source: 'Project company' })
        return recipients
      })
  }, [companies, contacts, project?.id, projectContacts])

  const internalRecipients = useMemo(() => (
    teamMembers
      .filter(member => member.email)
      .map(member => ({ name: member.name || member.email, email: member.email, source: 'Archispace team' }))
  ), [teamMembers])

  const recipientGroups = useMemo(() => [
    { id: 'project-team', label: 'Project team', count: internalRecipients.length, recipients: internalRecipients },
    { id: 'project-directory', label: 'Project directory', count: projectDirectoryRecipients.length, recipients: projectDirectoryRecipients },
  ], [internalRecipients, projectDirectoryRecipients])

  const allRecipients = useMemo(() => uniqueRecipients([
    ...selectedRecipients,
    ...splitEmails(recipientText).map(email => ({ name: email, email, source: 'Manual' })),
  ]), [recipientText, selectedRecipients])
  const canCreateShare = documents.length > 0 && (shareMode !== 'direct' || allRecipients.length > 0)

  const toggleGroup = group => {
    const active = selectedGroups.includes(group.id)
    setSelectedGroups(current => active ? current.filter(id => id !== group.id) : [...current, group.id])
    setSelectedRecipients(current => {
      if (active) return current.filter(recipient => recipient.groupId !== group.id)
      return uniqueRecipients([
        ...current,
        ...group.recipients.map(recipient => ({ ...recipient, groupId: group.id })),
      ])
    })
  }

  const removeRecipient = email => {
    setSelectedRecipients(current => current.filter(recipient => recipient.email !== email))
    setRecipientText(current => current
      .split(/[\s,;]+/)
      .filter(item => item && item.toLowerCase() !== email.toLowerCase())
      .join(', '))
  }

  const createShare = async () => {
    setSaving(true)
    const expiresAt = expiryDays ? new Date(Date.now() + Number(expiryDays) * 86400000).toISOString() : null
    const recipients = allRecipients
    const subject = title
    const share = await addDocumentShare({
      projectId: project?.id || documents[0]?.projectId || '',
      documentIds: documents.map(doc => doc.id),
      documentSnapshot: documents.map(toSnapshot),
      title,
      expiresAt,
      createdBy: currentUser,
      deliveryMethod: shareMode,
      recipients,
      recipientGroups: selectedGroups,
      message,
      subject,
    })
    const url = `${window.location.origin}/share/${share.token}`
    setShareUrl(url)
    setEmailUrl(buildMailto({
      recipients,
      subject,
      body: `${message}\n\n${url}`,
    }))
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={event => event.target === event.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-sm font-bold text-gray-900">Share selected documents</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="flex gap-2">
            <button className={tabCls(shareMode === 'link')} onClick={() => setShareMode('link')}>
              <ExternalLink size={13} className="mr-1 inline" />
              Create link
            </button>
            <button className={tabCls(shareMode === 'direct')} onClick={() => setShareMode('direct')}>
              <Mail size={13} className="mr-1 inline" />
              Share to people
            </button>
          </div>

          <div className="rounded-xl bg-gray-50 p-3">
            <div className="mb-2 text-xs font-semibold text-gray-500">{documents.length} document{documents.length !== 1 ? 's' : ''}</div>
            <div className="max-h-32 space-y-1 overflow-auto">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate font-medium text-gray-700">{doc.name}</span>
                  <span className="shrink-0 text-gray-400">{STAGE_MAP[doc.stageId]?.short || 'General'}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Issue title</label>
            <input className={inputCls} value={title} onChange={event => setTitle(event.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Expires after</label>
            <select className={inputCls} value={expiryDays} onChange={event => setExpiryDays(Number(event.target.value))}>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
            </select>
          </div>

          {shareMode === 'direct' && (
            <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-600">
                  <Users size={13} />
                  Share with
                </div>
                <div className="flex flex-wrap gap-2">
                  {recipientGroups.map(group => (
                    <button
                      key={group.id}
                      onClick={() => toggleGroup(group)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${selectedGroups.includes(group.id) ? 'border-forest-200 bg-forest-50 text-forest-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                      {group.label} {group.count ? `(${group.count})` : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">People emails</label>
                <input
                  className={inputCls}
                  value={recipientText}
                  onChange={event => setRecipientText(event.target.value)}
                  placeholder="person@email.co.nz, another@email.co.nz"
                />
              </div>

              {allRecipients.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {allRecipients.map(recipient => (
                    <span key={recipient.email} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-gray-600 ring-1 ring-gray-200">
                      {recipient.name || recipient.email}
                      <button onClick={() => removeRecipient(recipient.email)} className="text-gray-400 hover:text-red-500">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Message</label>
                <textarea className={`${inputCls} min-h-[72px] resize-none`} value={message} onChange={event => setMessage(event.target.value)} />
              </div>
              <p className="text-[11px] leading-5 text-gray-500">
                DevMan records the recipients and creates the secure share link. Email sending is still via your mail app for now.
              </p>
            </div>
          )}

          {hasPrivateUploads && (
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              Private uploaded files need `SUPABASE_SERVICE_ROLE_KEY` in Vercel to create signed external download links. Drive/web links still open from the share page.
            </div>
          )}

          {shareUrl && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-emerald-700">
                <Check size={13} /> Share link created {copied ? 'and copied' : ''}
              </div>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="break-all text-xs text-ocean-700 hover:underline">{shareUrl}</a>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4">
          {shareUrl ? (
            <>
              <button onClick={() => navigator.clipboard.writeText(shareUrl).then(() => setCopied(true))} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                <Copy size={14} /> Copy
              </button>
              {emailUrl && (
                <a href={emailUrl} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  <Mail size={14} /> Open email
                </a>
              )}
              <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-forest-600 px-3 py-2 text-sm font-semibold text-white hover:bg-forest-700">
                <ExternalLink size={14} /> Open
              </a>
            </>
          ) : (
            <button onClick={createShare} disabled={saving || !canCreateShare} className="inline-flex items-center gap-2 rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-700 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {shareMode === 'direct' ? 'Create share and email' : 'Create expiring link'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
