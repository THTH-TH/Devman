import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FileText,
  FolderOpen,
  LandPlot,
  Loader2,
  Map,
  MapPin,
  Plus,
  Search,
  Waves,
  X,
  Zap,
} from 'lucide-react'
import useStore from '../store/useStore'
import { STAGES } from '../data/stages'
import { CHECKLIST_TEMPLATE } from '../data/checklistTemplate'
import { MILESTONE_TEMPLATE } from '../data/milestones'
import { buildScheduleTasksFromTemplateItems } from '../data/scheduleTemplate'
import AddressAutocomplete, { buildGoogleMapsUrl } from '../components/AddressAutocomplete'
import PropertyMapEmbed from '../components/PropertyMapEmbed'

const STATUS_OPTIONS = ['Active', 'On Hold', 'Blocked', 'Complete']
const STEPS = [
  { id: 'find', label: 'Find Property', icon: Search },
  { id: 'confirm', label: 'Confirm', icon: MapPin },
  { id: 'setup', label: 'Project Setup', icon: Building2 },
]

const inputCls =
  'w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent transition'

function Field({ label, required, children, hint }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  )
}

function Detail({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-gray-800 break-words">{value}</div>
    </div>
  )
}

function StatusBadge({ status }) {
  const cls = status === 'live'
    ? 'bg-emerald-50 text-emerald-700'
    : status === 'linked'
      ? 'bg-ocean-50 text-ocean-700'
      : status === 'manual'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-gray-100 text-gray-500'
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>{status || 'pending'}</span>
}

function PlanningCard({ title, icon: Icon, status, children }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          <Icon size={13} className="text-forest-600" />
          {title}
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="text-xs font-semibold leading-5 text-gray-800">{children}</div>
    </div>
  )
}

function PlanningPreview({ preview, loading, error }) {
  if (loading) {
    return (
      <div className="rounded-xl border border-ocean-100 bg-ocean-50 px-4 py-3 text-sm text-ocean-700">
        <div className="flex items-center gap-2 font-semibold">
          <Loader2 size={15} className="animate-spin" />
          Pulling council planning layers...
        </div>
        <p className="mt-1 text-xs text-ocean-600">Checking Tauranga zoning, flooding/hazards and services from council GIS.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (!preview?.profile) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-offwhite/60 p-4">
        <div className="flex items-start gap-3">
          <LandPlot size={16} className="text-forest-600 mt-0.5 shrink-0" />
          <div>
            <div className="text-xs font-semibold text-gray-700">Property intelligence preview</div>
            <p className="text-xs text-gray-500 mt-1">
              Select a mapped Tauranga/Papamoa address to preview zoning, flooding and services before saving the project.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const profile = preview.profile
  const services = profile.servicesSummary?.groups || {}

  return (
    <div className="rounded-xl border border-forest-100 bg-forest-50/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-gray-900">Planning intelligence preview</div>
          <p className="mt-0.5 text-[11px] text-gray-500">Live council GIS check before project creation.</p>
        </div>
        <StatusBadge status={profile.sourceStatus?.council} />
      </div>
      <div className="grid grid-cols-1 gap-3">
        <PlanningCard title="Zoning" icon={Map} status={profile.zoningSummary?.status}>
          {profile.zoningSummary?.summary || 'No zoning returned yet.'}
        </PlanningCard>
        <PlanningCard title="Flooding / hazards" icon={Waves} status={profile.hazardSummary?.status}>
          {profile.hazardSummary?.summary || 'No hazard data returned yet.'}
        </PlanningCard>
        <PlanningCard title="Services" icon={Zap} status={profile.servicesSummary?.status}>
          {profile.servicesSummary?.summary || 'No services returned yet.'}
        </PlanningCard>
      </div>
      {(services.Water || services.Stormwater || services.Wastewater) && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {['Water', 'Stormwater', 'Wastewater'].map(key => (
            <div key={key} className="rounded-lg bg-white px-2 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{key}</div>
              <div className="mt-0.5 text-sm font-bold text-gray-900">{services[key]?.length || 0}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function makeManualPlace(address) {
  return {
    formattedAddress: address.trim(),
    lat: null,
    lng: null,
    streetNumber: '',
    route: '',
    suburb: '',
    city: '',
    region: '',
    postalCode: '',
    country: 'New Zealand',
    placeId: '',
  }
}

function suggestedNameFromPlace(place) {
  if (!place?.formattedAddress) return ''
  const firstLine = place.formattedAddress.split(',')[0]?.trim()
  if (firstLine) return firstLine
  return place.formattedAddress.trim()
}

function buildPropertySnapshot(place, form) {
  const mapUrl = buildGoogleMapsUrl(place)
  return {
    source: place?.placeId ? 'google_places' : 'manual',
    capturedAt: new Date().toISOString(),
    identity: {
      name: form.name,
      address: place?.formattedAddress || form.address,
      legalDescription: form.legalDescription || '',
      bcNumber: form.bcNumber || '',
    },
    location: {
      latitude: place?.lat ?? null,
      longitude: place?.lng ?? null,
      placeId: place?.placeId || '',
      suburb: place?.suburb || form.suburb || '',
      city: place?.city || form.city || '',
      region: place?.region || form.region || '',
      postalCode: place?.postalCode || form.postalCode || '',
      country: place?.country || form.country || 'New Zealand',
      mapUrl,
    },
    owner: {
      name: form.owner || '',
      contactPerson: form.ownerContactPerson || '',
      mailingAddress: form.ownerMailingAddress || '',
      phone: form.ownerPhone || '',
      email: form.ownerEmail || '',
    },
    notes: {
      buildingWorkDescription: form.buildingWorkDescription || '',
      description: form.description || '',
    },
  }
}

function StepBar({ current }) {
  const index = STEPS.findIndex(step => step.id === current)
  return (
    <div className="grid grid-cols-3 gap-2">
      {STEPS.map((step, stepIndex) => {
        const Icon = step.icon
        const active = step.id === current
        const done = stepIndex < index
        return (
          <div
            key={step.id}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${
              active
                ? 'border-forest-600 bg-forest-600 text-white'
                : done
                  ? 'border-forest-100 bg-forest-50 text-forest-700'
                  : 'border-gray-100 bg-white text-gray-400'
            }`}
          >
            <Icon size={14} />
            <span className="truncate">{step.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function PropertySnapshot({ place, form, propertyPreview, propertyPreviewLoading, propertyPreviewError }) {
  const snapshot = useMemo(() => buildPropertySnapshot(place, form), [place, form])

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Property snapshot</h2>
          <p className="text-xs text-gray-400 mt-0.5">Captured from the selected address and project fields.</p>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${snapshot.source === 'google_places' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
          {snapshot.source === 'google_places' ? 'Google Places' : 'Manual'}
        </span>
      </div>

      <div className="p-5 space-y-5">
        <PropertyMapEmbed
          address={snapshot.identity.address}
          latitude={snapshot.location.latitude}
          longitude={snapshot.location.longitude}
          mapLinks={{ googleMaps: snapshot.location.mapUrl }}
          title={snapshot.identity.address || 'Address pending'}
          subtitle="Project site"
          heightClass="h-[280px]"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Address source</div>
            <div className="mt-1 text-sm font-semibold text-gray-800">{snapshot.source === 'google_places' ? 'Google Places' : 'Manual entry'}</div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Location</div>
            <div className="mt-1 text-sm font-semibold text-gray-800">{[snapshot.location.suburb, snapshot.location.region, snapshot.location.postalCode].filter(Boolean).join(', ') || 'Not captured yet'}</div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Coordinates</div>
            <div className="mt-1 font-mono text-xs font-semibold text-gray-800">
              {snapshot.location.latitude && snapshot.location.longitude ? `${Number(snapshot.location.latitude).toFixed(6)}, ${Number(snapshot.location.longitude).toFixed(6)}` : 'Manual address'}
            </div>
          </div>
        </div>

        <PlanningPreview preview={propertyPreview} loading={propertyPreviewLoading} error={propertyPreviewError} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Detail label="Legal description" value={snapshot.identity.legalDescription || 'Not captured yet'} />
          <Detail label="Consent / BC" value={snapshot.identity.bcNumber || 'Not captured yet'} />
          <Detail label="Owner" value={snapshot.owner.name || 'Not captured yet'} />
          <Detail label="Drive folder" value={form.driveFolderUrl || 'Not linked yet'} />
        </div>

        <div className="rounded-xl border border-dashed border-gray-200 bg-offwhite/60 p-4">
          <div className="flex items-start gap-3">
            <LandPlot size={16} className="text-forest-600 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-gray-700">Property intelligence on save</div>
              <p className="text-xs text-gray-500 mt-1">
                DevMan will create a property profile with map links, LINZ/council evidence links, hazard status, title/legal fields, services notes, valuation placeholders and demographics placeholders. Restricted or licensed data stays marked as manual until a proper source is connected.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NewProject() {
  const navigate = useNavigate()
  const { projects, addProject, updateProject, addBatchChecklistItems, addBatchMilestones, addBatchScheduleTasks, logActivity, scheduleTemplates, scheduleTemplateItems, upsertPropertyProfile, addPropertySourceRun } = useStore()
  const [step, setStep] = useState('find')
  const [placeDetails, setPlaceDetails] = useState(null)
  const [teamInput, setTeamInput] = useState('')
  const [teamMembers, setTeamMembers] = useState([])
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [propertyPreview, setPropertyPreview] = useState(null)
  const [propertyPreviewLoading, setPropertyPreviewLoading] = useState(false)
  const [propertyPreviewError, setPropertyPreviewError] = useState('')
  const [form, setForm] = useState({
    name: '',
    address: '',
    clientEntity: '',
    owner: '',
    bcNumber: '',
    legalDescription: '',
    ownerContactPerson: '',
    ownerMailingAddress: '',
    ownerPhone: '',
    ownerEmail: '',
    buildingWorkDescription: '',
    placeId: '',
    latitude: null,
    longitude: null,
    suburb: '',
    city: '',
    region: '',
    postalCode: '',
    country: 'New Zealand',
    driveFolderUrl: '',
    startDate: '',
    targetCompletion: '',
    currentStage: 'feasibility',
    scheduleTemplateId: 'archispace-standard-development-programme',
    status: 'Active',
    description: '',
  })

  const set = (key, val) => setForm(current => ({ ...current, [key]: val }))

  const fetchPropertyPreview = async (place, currentForm = form) => {
    if (!place?.formattedAddress && !currentForm.address) return
    setPropertyPreviewLoading(true)
    setPropertyPreviewError('')
    setPropertyPreview(null)
    try {
      const response = await fetch('/api/property/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'preview',
          address: place?.formattedAddress || currentForm.address,
          project: {
            ...currentForm,
            address: place?.formattedAddress || currentForm.address,
            placeId: place?.placeId || currentForm.placeId,
            latitude: place?.lat ?? currentForm.latitude,
            longitude: place?.lng ?? currentForm.longitude,
            suburb: place?.suburb || currentForm.suburb,
            city: place?.city || currentForm.city,
            region: place?.region || currentForm.region,
            postalCode: place?.postalCode || currentForm.postalCode,
            country: place?.country || currentForm.country,
          },
          placeDetails: place,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Property intelligence preview failed')
      setPropertyPreview(data)
    } catch (error) {
      setPropertyPreviewError(error.message || 'Property intelligence preview failed')
    } finally {
      setPropertyPreviewLoading(false)
    }
  }

  const applyPlace = details => {
    setPlaceDetails(details)
    const nextForm = {
      ...form,
      address: details.formattedAddress,
      name: form.name || suggestedNameFromPlace(details),
      placeId: details.placeId || '',
      latitude: details.lat ?? null,
      longitude: details.lng ?? null,
      suburb: details.suburb || '',
      city: details.city || '',
      region: details.region || '',
      postalCode: details.postalCode || '',
      country: details.country || 'New Zealand',
    }
    setForm(current => ({
      ...current,
      address: details.formattedAddress,
      name: current.name || suggestedNameFromPlace(details),
      placeId: details.placeId || '',
      latitude: details.lat ?? null,
      longitude: details.lng ?? null,
      suburb: details.suburb || '',
      city: details.city || '',
      region: details.region || '',
      postalCode: details.postalCode || '',
      country: details.country || 'New Zealand',
    }))
    setStep('confirm')
    fetchPropertyPreview(details, nextForm)
  }

  useEffect(() => {
    if (!placeDetails || propertyPreview || propertyPreviewLoading) return
    fetchPropertyPreview(placeDetails)
  }, [placeDetails?.formattedAddress])

  const confirmManualAddress = () => {
    if (!form.address.trim()) {
      setErrors({ address: 'Site address is required' })
      return
    }
    applyPlace(makeManualPlace(form.address))
  }

  const addTeamMember = () => {
    const value = teamInput.trim()
    if (value && !teamMembers.includes(value)) setTeamMembers(items => [...items, value])
    setTeamInput('')
  }

  const removeTeamMember = name => setTeamMembers(items => items.filter(item => item !== name))

  const validate = () => {
    const nextErrors = {}
    if (!form.name.trim()) nextErrors.name = 'Project name is required'
    if (!form.address.trim()) nextErrors.address = 'Site address is required'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)

    const propertySnapshot = buildPropertySnapshot(placeDetails || makeManualPlace(form.address), form)
    const project = await addProject({
      ...form,
      name: form.name.trim(),
      address: form.address.trim(),
      legalDescription: form.legalDescription.trim(),
      bcNumber: form.bcNumber.trim(),
      owner: form.owner.trim(),
      ownerContactPerson: form.ownerContactPerson.trim(),
      ownerMailingAddress: form.ownerMailingAddress.trim(),
      ownerPhone: form.ownerPhone.trim(),
      ownerEmail: form.ownerEmail.trim(),
      buildingWorkDescription: form.buildingWorkDescription.trim(),
      driveFolderUrl: form.driveFolderUrl.trim(),
      description: form.description.trim(),
      teamMembers,
      propertySnapshot,
    })

    if (!project) {
      setSubmitting(false)
      return
    }

    try {
      const place = placeDetails || makeManualPlace(form.address)
      const response = await fetch('/api/property/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          address: project.address,
          project,
          placeDetails: place,
        }),
      })
      const data = await response.json()
      if (response.ok && data.profile) {
        const profile = await upsertPropertyProfile(data.profile)
        await updateProject(project.id, { propertyProfileId: profile.id })
        await Promise.all((data.sourceRuns || []).map(run => addPropertySourceRun({ ...run, projectId: project.id, profileId: profile.id })))
      }
    } catch (error) {
      console.warn('Property intelligence setup skipped:', error)
    }

    const selectedTemplateItems = scheduleTemplateItems.filter(item => item.templateId === form.scheduleTemplateId)

    await Promise.all([
      addBatchChecklistItems(
        CHECKLIST_TEMPLATE.map(item => ({
          ...item,
          projectId: project.id,
          priority: 'medium',
        }))
      ),
      addBatchMilestones(
        MILESTONE_TEMPLATE.map(milestone => ({
          ...milestone,
          projectId: project.id,
        }))
      ),
      addBatchScheduleTasks(buildScheduleTasksFromTemplateItems(project.id, project.startDate || new Date(), selectedTemplateItems)),
    ])

    logActivity(project.id, 'Project created', project.name)
    navigate(`/projects/${project.id}`)
  }

  const handleCancel = () => navigate(projects.length === 0 ? '/' : '/projects')

  return (
    <div className="min-h-full bg-offwhite">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link to="/projects" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-3">
              <ArrowLeft size={13} />
              Projects
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">New project</h1>
            <p className="text-sm text-gray-500 mt-1">Start from the property, then build the project record around it.</p>
          </div>
        </div>

        <StepBar current={step} />

        {step === 'find' && (
          <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.65fr] gap-5">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center shrink-0">
                  <Search size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Find the property</h2>
                  <p className="text-sm text-gray-500 mt-1">Search a New Zealand site address or continue with manual entry.</p>
                </div>
              </div>

              <div className="space-y-4 max-w-2xl">
                <Field label="Site address" required>
                  <AddressAutocomplete
                    value={form.address}
                    onChange={value => set('address', value)}
                    onPlaceSelect={applyPlace}
                    placeholder="e.g. 172 Dickson Road, Papamoa Beach"
                    className={`${inputCls} h-12 text-base ${errors.address ? 'border-red-300 ring-1 ring-red-300' : ''}`}
                  />
                  {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
                </Field>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
                    Cancel
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={confirmManualAddress}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 bg-white rounded-lg hover:bg-gray-50"
                    >
                      Use typed address
                      <ChevronRight size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep('setup')}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-forest-600 text-white rounded-lg hover:bg-forest-700"
                    >
                      Skip address
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-forest-600" />
                <h3 className="text-sm font-bold text-gray-900">Project key</h3>
              </div>
              <PropertyMapEmbed
                address={form.address}
                latitude={form.latitude}
                longitude={form.longitude}
                title={form.address || 'Search preview'}
                subtitle="Address preview"
                heightClass="h-[220px]"
              />
              <div className="space-y-3">
                {[
                  'Address identity and coordinates',
                  'Owner and consent details',
                  'Legal description fields',
                  'Drive folder link',
                  'Reusable property snapshot',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'confirm' && placeDetails && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center shrink-0">
                <MapPin size={22} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900">Confirm property</h2>
                <p className="text-sm text-gray-500 mt-1">This snapshot becomes the project key.</p>
              </div>
            </div>

            <PropertyMapEmbed
              address={placeDetails.formattedAddress}
              latitude={placeDetails.lat}
              longitude={placeDetails.lng}
              mapLinks={{ googleMaps: buildGoogleMapsUrl(placeDetails) }}
              title={placeDetails.formattedAddress}
              subtitle="Confirm project site"
              heightClass="h-[360px]"
            />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Suburb</div>
                <div className="mt-1 text-sm font-semibold text-gray-800">{placeDetails.suburb || 'Not captured'}</div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">City</div>
                <div className="mt-1 text-sm font-semibold text-gray-800">{placeDetails.city || 'Not captured'}</div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Region</div>
                <div className="mt-1 text-sm font-semibold text-gray-800">{placeDetails.region || 'Not captured'}</div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Postcode</div>
                <div className="mt-1 text-sm font-semibold text-gray-800">{placeDetails.postalCode || 'Not captured'}</div>
              </div>
            </div>

            <PlanningPreview preview={propertyPreview} loading={propertyPreviewLoading} error={propertyPreviewError} />

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('find')
                  setPlaceDetails(null)
                }}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Change address
              </button>
              <button
                type="button"
                onClick={() => setStep('setup')}
                className="inline-flex items-center gap-2 bg-forest-600 hover:bg-forest-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg"
              >
                Use this property
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {step === 'setup' && (
          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-5">
              <PropertySnapshot
                place={placeDetails || makeManualPlace(form.address)}
                form={form}
                propertyPreview={propertyPreview}
                propertyPreviewLoading={propertyPreviewLoading}
                propertyPreviewError={propertyPreviewError}
              />

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Project details</h2>
                  <p className="text-sm text-gray-500 mt-1">The fields below feed the project overview, documents and future intelligence pulls.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Field label="Project name" required>
                      <input
                        className={`${inputCls} ${errors.name ? 'border-red-300 ring-1 ring-red-300' : ''}`}
                        value={form.name}
                        onChange={e => set('name', e.target.value)}
                        placeholder="e.g. Beachwaters Stage 1"
                      />
                      {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                    </Field>
                  </div>

                  <Field label="Client / entity">
                    <input className={inputCls} value={form.clientEntity} onChange={e => set('clientEntity', e.target.value)} placeholder="e.g. 23 Dickson LP" />
                  </Field>
                  <Field label="Project owner">
                    <input className={inputCls} value={form.owner} onChange={e => set('owner', e.target.value)} />
                  </Field>

                  <Field label="BC / consent number">
                    <input className={inputCls} value={form.bcNumber} onChange={e => set('bcNumber', e.target.value)} placeholder="e.g. BC351905" />
                  </Field>
                  <Field label="Legal description">
                    <input className={inputCls} value={form.legalDescription} onChange={e => set('legalDescription', e.target.value)} placeholder="Lot / DP / title reference" />
                  </Field>

                  <Field label="Owner contact">
                    <input className={inputCls} value={form.ownerContactPerson} onChange={e => set('ownerContactPerson', e.target.value)} />
                  </Field>
                  <Field label="Owner email">
                    <input className={inputCls} value={form.ownerEmail} onChange={e => set('ownerEmail', e.target.value)} />
                  </Field>

                  <Field label="Owner phone">
                    <input className={inputCls} value={form.ownerPhone} onChange={e => set('ownerPhone', e.target.value)} />
                  </Field>
                  <Field label="Owner mailing address">
                    <input className={inputCls} value={form.ownerMailingAddress} onChange={e => set('ownerMailingAddress', e.target.value)} />
                  </Field>

                  <Field label="Start date">
                    <input type="date" className={inputCls} value={form.startDate} onChange={e => set('startDate', e.target.value)} />
                  </Field>
                  <Field label="Target completion">
                    <input type="date" className={inputCls} value={form.targetCompletion} onChange={e => set('targetCompletion', e.target.value)} />
                  </Field>

                  <Field label="Current stage">
                    <select className={inputCls} value={form.currentStage} onChange={e => set('currentStage', e.target.value)}>
                      {STAGES.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Status">
                    <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                      {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </Field>

                  <div className="sm:col-span-2">
                    <Field label="Schedule template" hint="Seeds the project programme. Existing templates can be imported later from the Schedule tab.">
                      <select className={inputCls} value={form.scheduleTemplateId} onChange={e => set('scheduleTemplateId', e.target.value)}>
                        {(scheduleTemplates.length ? scheduleTemplates : [{ id: 'archispace-standard-development-programme', name: 'Archispace Standard Development Programme' }]).map(template => (
                          <option key={template.id} value={template.id}>{template.name}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>

                <Field label="Google Drive project folder">
                  <div className="relative">
                    <FolderOpen size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      className={`${inputCls} pl-9`}
                      value={form.driveFolderUrl}
                      onChange={e => set('driveFolderUrl', e.target.value)}
                      placeholder="https://drive.google.com/drive/folders/..."
                    />
                  </div>
                </Field>

                <Field label="Building work">
                  <textarea className={`${inputCls} resize-none`} rows={2} value={form.buildingWorkDescription} onChange={e => set('buildingWorkDescription', e.target.value)} placeholder="Short description of the consent or building work" />
                </Field>

                <Field label="Description / notes">
                  <textarea className={`${inputCls} resize-none`} rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Development notes, acquisition context, known risks..." />
                </Field>

                <Field label="Team members">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className={inputCls}
                      placeholder="Add a team member and press Enter"
                      value={teamInput}
                      onChange={e => setTeamInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTeamMember()
                        }
                      }}
                    />
                    <button type="button" onClick={addTeamMember} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                      <Plus size={16} />
                    </button>
                  </div>
                  {teamMembers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {teamMembers.map(member => (
                        <span key={member} className="inline-flex items-center gap-1 bg-ocean-50 text-ocean-700 text-xs px-2.5 py-1 rounded-full">
                          {member}
                          <button type="button" onClick={() => removeTeamMember(member)}>
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </Field>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6">
              <button type="button" onClick={() => setStep(placeDetails ? 'confirm' : 'find')} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 bg-forest-600 hover:bg-forest-700 disabled:opacity-60 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
              >
                {submitting ? 'Creating...' : 'Create project'}
                <CalendarDays size={14} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
