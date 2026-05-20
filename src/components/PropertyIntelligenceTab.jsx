import { useMemo, useState } from 'react'
import {
  AlertCircle,
  ExternalLink,
  LandPlot,
  Loader2,
  Map,
  MapPin,
  RefreshCw,
  Satellite,
  Save,
  Waves,
} from 'lucide-react'
import useStore from '../store/useStore'

const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-ocean-400'

const statusClasses = {
  live: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  linked: 'bg-ocean-50 text-ocean-700 border-ocean-100',
  manual: 'bg-amber-50 text-amber-700 border-amber-100',
  'not available': 'bg-gray-100 text-gray-500 border-gray-200',
}

function SourceBadge({ status }) {
  const value = status || 'not available'
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClasses[value] || statusClasses['not available']}`}>
      {value}
    </span>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-500">{label}</label>
      {children}
    </div>
  )
}

function PropertyMap({ profile, project }) {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const latitude = profile?.latitude ?? project.latitude
  const longitude = profile?.longitude ?? project.longitude
  const address = profile?.formattedAddress || profile?.address || project.address
  const query = latitude && longitude ? `${latitude},${longitude}` : address
  const embed = key && query ? `https://www.google.com/maps/embed/v1/place?key=${key}&q=${encodeURIComponent(query)}` : ''
  const mapsUrl = profile?.mapLinks?.googleMaps || (query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : '')
  const streetView = profile?.mapLinks?.streetView || (latitude && longitude ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latitude},${longitude}` : mapsUrl)

  return (
    <section className="overflow-hidden rounded-xl border border-gray-100 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-forest-50 text-forest-700">
            <MapPin size={18} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-gray-900">{address || 'No address captured'}</div>
            <div className="mt-0.5 text-xs text-gray-500">
              {latitude && longitude ? `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}` : 'Manual address needs coordinates'}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              <Map size={13} /> Maps
            </a>
          )}
          {streetView && (
            <a href={streetView} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              <Satellite size={13} /> Street
            </a>
          )}
        </div>
      </div>
      {embed ? (
        <iframe title="Property map" src={embed} className="h-[320px] w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      ) : (
        <div className="flex h-[260px] items-center justify-center bg-gray-50 px-6 text-center text-sm text-gray-500">
          Add `VITE_GOOGLE_MAPS_API_KEY` to show the embedded map here. The external Google Maps link still works.
        </div>
      )}
    </section>
  )
}

function InfoPanel({ title, icon: Icon, summary, status, sourceUrl, children }) {
  return (
    <section className="rounded-xl border border-gray-100 bg-white p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={15} className="text-forest-600" />}
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        </div>
        <SourceBadge status={status} />
      </div>
      <p className="text-sm leading-6 text-gray-600">{summary || 'No information captured yet.'}</p>
      {children}
      {sourceUrl && (
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-ocean-600 hover:underline">
          Open source <ExternalLink size={11} />
        </a>
      )}
    </section>
  )
}

export default function PropertyIntelligenceTab({ project }) {
  const {
    propertyProfiles,
    propertySourceRuns,
    upsertPropertyProfile,
    addPropertySourceRun,
    updateProject,
  } = useStore()
  const existingProfile = propertyProfiles.find(item => item.projectId === project.id)
  const [profile, setProfile] = useState(existingProfile || null)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [manual, setManual] = useState(() => ({
    legalDescription: existingProfile?.titleSummary?.legalDescription || project.legalDescription || '',
    owner: existingProfile?.titleSummary?.owner || project.owner || '',
    titleSummary: existingProfile?.titleSummary?.summary || '',
    zoningSummary: existingProfile?.zoningSummary?.summary || '',
    servicesSummary: existingProfile?.servicesSummary?.summary || '',
    valuationSummary: existingProfile?.valuationSummary?.summary || '',
    demographicsSummary: existingProfile?.demographicsSummary?.summary || '',
  }))

  const activeProfile = profile || existingProfile || {
    projectId: project.id,
    formattedAddress: project.address,
    address: project.address,
    placeId: project.placeId,
    latitude: project.latitude,
    longitude: project.longitude,
    suburb: project.suburb,
    city: project.city,
    region: project.region,
    postalCode: project.postalCode,
    country: project.country || 'New Zealand',
    sourceStatus: {
      googleMaps: project.latitude && project.longitude ? 'live' : 'manual',
      linz: 'linked',
      council: 'linked',
      titleOwnership: 'manual',
      valuation: 'not available',
      demographics: 'not available',
    },
    titleSummary: { status: 'manual', summary: project.legalDescription || 'Title/legal evidence not captured yet.', legalDescription: project.legalDescription || '', owner: project.owner || '' },
    parcelSummary: { status: 'linked', summary: 'LINZ parcel/cadastral search link will be generated on refresh.' },
    councilSummary: { status: 'linked', summary: 'Council GIS links will be generated on refresh.' },
    zoningSummary: { status: 'manual', summary: 'Planning and zoning notes not captured yet.' },
    hazardSummary: { status: 'linked', summary: 'Refresh to check Tauranga/BOP hazard links where available.' },
    servicesSummary: { status: 'manual', summary: 'Services notes not captured yet.' },
    valuationSummary: { status: 'not available', summary: 'Valuation/rental placeholders only.' },
    demographicsSummary: { status: 'not available', summary: 'Schools/demographics placeholders only.' },
    mapLinks: {},
  }

  const runs = useMemo(
    () => propertySourceRuns.filter(run => run.projectId === project.id).slice(0, 6),
    [propertySourceRuns, project.id]
  )

  const refresh = async () => {
    setRefreshing(true)
    setError('')
    try {
      const response = await fetch('/api/property/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          address: project.address,
          project,
          placeDetails: {
            formattedAddress: project.address,
            placeId: project.placeId,
            lat: project.latitude,
            lng: project.longitude,
            suburb: project.suburb,
            city: project.city,
            region: project.region,
            postalCode: project.postalCode,
            country: project.country,
          },
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Property lookup failed')
      const saved = await upsertPropertyProfile(data.profile)
      setProfile(saved)
      await Promise.all((data.sourceRuns || []).map(run => addPropertySourceRun({ ...run, projectId: project.id, profileId: saved.id })))
    } catch (err) {
      setError(err.message || 'Property lookup failed')
    } finally {
      setRefreshing(false)
    }
  }

  const saveManual = async () => {
    setSaving(true)
    const saved = await upsertPropertyProfile({
      ...activeProfile,
      projectId: project.id,
      titleSummary: {
        ...(activeProfile.titleSummary || {}),
        status: 'manual',
        legalDescription: manual.legalDescription,
        owner: manual.owner,
        summary: manual.titleSummary || manual.legalDescription || 'Manual title/legal notes saved.',
      },
      zoningSummary: { ...(activeProfile.zoningSummary || {}), status: 'manual', summary: manual.zoningSummary },
      servicesSummary: { ...(activeProfile.servicesSummary || {}), status: 'manual', summary: manual.servicesSummary },
      valuationSummary: { ...(activeProfile.valuationSummary || {}), status: manual.valuationSummary ? 'manual' : 'not available', summary: manual.valuationSummary },
      demographicsSummary: { ...(activeProfile.demographicsSummary || {}), status: manual.demographicsSummary ? 'manual' : 'not available', summary: manual.demographicsSummary },
      sourceStatus: { ...(activeProfile.sourceStatus || {}), titleOwnership: 'manual' },
    })
    await updateProject(project.id, {
      legalDescription: manual.legalDescription,
      owner: manual.owner,
      propertyProfileId: saved.id,
    })
    setProfile(saved)
    setSaving(false)
  }

  const set = (key, value) => setManual(current => ({ ...current, [key]: value }))

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Property Intelligence</h2>
          <p className="text-sm text-gray-500">Maps, source links, due-diligence notes and manual evidence for the site.</p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-700 disabled:opacity-60"
        >
          {refreshing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          Refresh intelligence
        </button>
      </div>

      {error && (
        <div className="flex gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <PropertyMap profile={activeProfile} project={project} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InfoPanel
          title="Title and ownership"
          icon={LandPlot}
          status={activeProfile.titleSummary?.status || activeProfile.sourceStatus?.titleOwnership}
          summary={activeProfile.titleSummary?.summary}
        >
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Legal description">
              <input className={inputCls} value={manual.legalDescription} onChange={e => set('legalDescription', e.target.value)} placeholder="Lot / DP / title reference" />
            </Field>
            <Field label="Owner / entity">
              <input className={inputCls} value={manual.owner} onChange={e => set('owner', e.target.value)} placeholder="Manual only until licensed" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Title notes">
                <textarea className={`${inputCls} min-h-[72px] resize-none`} value={manual.titleSummary} onChange={e => set('titleSummary', e.target.value)} />
              </Field>
            </div>
          </div>
        </InfoPanel>

        <InfoPanel title="Parcel and boundary" icon={Map} status={activeProfile.parcelSummary?.status} summary={activeProfile.parcelSummary?.summary} sourceUrl={activeProfile.parcelSummary?.sourceUrl || activeProfile.mapLinks?.linzSearch} />
        <InfoPanel title="Zoning and planning" icon={MapPin} status={activeProfile.zoningSummary?.status} summary={activeProfile.zoningSummary?.summary} sourceUrl={activeProfile.zoningSummary?.sourceUrl || activeProfile.mapLinks?.councilMaps}>
          <Field label="Planning notes">
            <textarea className={`${inputCls} mt-3 min-h-[72px] resize-none`} value={manual.zoningSummary} onChange={e => set('zoningSummary', e.target.value)} />
          </Field>
        </InfoPanel>
        <InfoPanel title="Natural hazards / flooding" icon={Waves} status={activeProfile.hazardSummary?.status} summary={activeProfile.hazardSummary?.summary} sourceUrl={activeProfile.hazardSummary?.sourceUrl || activeProfile.mapLinks?.taurangaNaturalHazards} />
        <InfoPanel title="Services and utilities" icon={LandPlot} status={activeProfile.servicesSummary?.status} summary={activeProfile.servicesSummary?.summary}>
          <Field label="Services notes">
            <textarea className={`${inputCls} mt-3 min-h-[72px] resize-none`} value={manual.servicesSummary} onChange={e => set('servicesSummary', e.target.value)} placeholder="Stormwater, wastewater, water, power, access, telecoms..." />
          </Field>
        </InfoPanel>
        <InfoPanel title="Valuation and rental" icon={LandPlot} status={activeProfile.valuationSummary?.status} summary={activeProfile.valuationSummary?.summary}>
          <Field label="Manual valuation notes">
            <textarea className={`${inputCls} mt-3 min-h-[72px] resize-none`} value={manual.valuationSummary} onChange={e => set('valuationSummary', e.target.value)} />
          </Field>
        </InfoPanel>
        <InfoPanel title="Schools and demographics" icon={MapPin} status={activeProfile.demographicsSummary?.status} summary={activeProfile.demographicsSummary?.summary}>
          <Field label="Manual demographic notes">
            <textarea className={`${inputCls} mt-3 min-h-[72px] resize-none`} value={manual.demographicsSummary} onChange={e => set('demographicsSummary', e.target.value)} />
          </Field>
        </InfoPanel>
      </div>

      <div className="flex justify-end">
        <button onClick={saveManual} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save manual evidence
        </button>
      </div>

      {runs.length > 0 && (
        <section className="rounded-xl border border-gray-100 bg-white p-5">
          <h3 className="mb-3 text-sm font-bold text-gray-900">Source activity</h3>
          <div className="space-y-2">
            {runs.map(run => (
              <div key={run.id} className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                <div>
                  <div className="text-xs font-semibold text-gray-800">{run.source}</div>
                  <div className="text-xs text-gray-500">{run.message}</div>
                </div>
                <SourceBadge status={run.status} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
