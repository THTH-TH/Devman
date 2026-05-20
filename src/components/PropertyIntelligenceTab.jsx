import { useMemo, useState } from 'react'
import {
  AlertCircle,
  Building2,
  ExternalLink,
  Gauge,
  LandPlot,
  Layers,
  Loader2,
  Map,
  MapPin,
  RefreshCw,
  Save,
  School,
  ShieldAlert,
  Waves,
  Zap,
} from 'lucide-react'
import useStore from '../store/useStore'
import PropertyMapEmbed from './PropertyMapEmbed'

const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-ocean-400'

const statusClasses = {
  live: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  linked: 'bg-ocean-50 text-ocean-700 border-ocean-100',
  manual: 'bg-amber-50 text-amber-700 border-amber-100',
  'not available': 'bg-gray-100 text-gray-500 border-gray-200',
}

const sourceLabels = [
  ['Google Maps', 'googleMaps'],
  ['LINZ', 'linz'],
  ['Council GIS', 'council'],
  ['Zoning', 'zoning'],
  ['Flooding', 'hazards'],
  ['Services', 'services'],
  ['Title / ownership', 'titleOwnership'],
  ['Valuation', 'valuation'],
  ['Demographics', 'demographics'],
]

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

function QuickFact({ label, value, icon: Icon, status }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={15} className="text-forest-600" />}
          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
        </div>
        {status && <SourceBadge status={status} />}
      </div>
      <div className="text-sm font-semibold leading-5 text-gray-900">{value || 'Not captured yet'}</div>
    </div>
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

function DetailPill({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-1 text-xs font-semibold text-gray-800">{value}</div>
    </div>
  )
}

function EvidenceList({ items = [], empty = 'No returned records.', renderItem }) {
  if (!items.length) return <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">{empty}</div>
  return (
    <div className="mt-3 space-y-2">
      {items.slice(0, 6).map((item, index) => (
        <div key={`${item.layerId || item.assetType || index}-${item.compKey || item.value || index}`} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
          {renderItem(item)}
        </div>
      ))}
    </div>
  )
}

function UtilityGroup({ title, items = [] }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs font-bold text-gray-800">{title}</div>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-500">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-gray-400">No nearby assets returned.</div>
      ) : (
        <div className="space-y-1.5">
          {items.slice(0, 4).map((item, index) => (
            <div key={`${item.compKey || item.unitId || index}`} className="text-xs leading-5 text-gray-600">
              <span className="font-semibold text-gray-800">{item.assetType}</span>
              {item.diameter ? ` - ${item.diameter}mm` : ''}
              {item.material ? ` ${item.material}` : ''}
              {item.comments ? ` - ${item.comments}` : ''}
              {item.asBuiltNumber ? ` - As-built ${item.asBuiltNumber}` : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SourceStrip({ sourceStatus = {} }) {
  return (
    <section className="rounded-xl border border-gray-100 bg-white p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-gray-900">Data source status</h3>
        <span className="text-xs text-gray-400">Live where possible, manual where restricted</span>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {sourceLabels.map(([label, key]) => (
          <div key={key} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
            <div className="mb-1 truncate text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
            <SourceBadge status={sourceStatus[key]} />
          </div>
        ))}
      </div>
    </section>
  )
}

function formatDateTime(value) {
  if (!value) return 'Not refreshed yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not refreshed yet'
  return date.toLocaleString('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buildFallbackProfile(project) {
  return {
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
    titleSummary: {
      status: 'manual',
      summary: project.legalDescription || 'Title/legal evidence not captured yet.',
      legalDescription: project.legalDescription || '',
      owner: project.owner || '',
    },
    parcelSummary: { status: 'linked', summary: 'LINZ parcel/cadastral search link will be generated on refresh.' },
    councilSummary: { status: 'linked', summary: 'Council property records and GIS links will be generated on refresh.' },
    zoningSummary: { status: 'manual', summary: 'Planning and zoning notes not captured yet.' },
    hazardSummary: { status: 'linked', summary: 'Refresh to check Tauranga/BOP hazard links where available.' },
    servicesSummary: { status: 'manual', summary: 'Services notes not captured yet.' },
    valuationSummary: { status: 'not available', summary: 'Valuation/rental placeholders only.' },
    demographicsSummary: { status: 'not available', summary: 'Schools/demographics placeholders only.' },
    mapLinks: {},
  }
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
    zoningSummary: existingProfile?.zoningSummary?.manualNotes || '',
    servicesSummary: existingProfile?.servicesSummary?.manualNotes || '',
    valuationSummary: existingProfile?.valuationSummary?.summary || '',
    demographicsSummary: existingProfile?.demographicsSummary?.summary || '',
  }))

  const activeProfile = profile || existingProfile || buildFallbackProfile(project)
  const address = activeProfile.formattedAddress || activeProfile.address || project.address
  const locationLabel = [activeProfile.suburb, activeProfile.city, activeProfile.region, activeProfile.postalCode].filter(Boolean).join(', ')
  const titleOwner = activeProfile.titleSummary?.owner || project.owner || 'Manual evidence required'
  const legalDescription = activeProfile.titleSummary?.legalDescription || project.legalDescription || 'Manual evidence required'
  const hazardSummary = activeProfile.hazardSummary?.summary || 'Hazard check not captured yet.'
  const zoningDetails = activeProfile.zoningSummary?.details || {}
  const hazardItems = activeProfile.hazardSummary?.items || []
  const serviceGroups = activeProfile.servicesSummary?.groups || {}

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
      zoningSummary: {
        ...(activeProfile.zoningSummary || {}),
        manualNotes: manual.zoningSummary,
        status: activeProfile.zoningSummary?.status || 'manual',
        summary: activeProfile.zoningSummary?.summary || manual.zoningSummary,
      },
      servicesSummary: {
        ...(activeProfile.servicesSummary || {}),
        manualNotes: manual.servicesSummary,
        status: activeProfile.servicesSummary?.status || 'manual',
        summary: activeProfile.servicesSummary?.summary || manual.servicesSummary,
      },
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
          <p className="text-sm text-gray-500">Map, title evidence, council checks, hazards, services, valuation notes and due-diligence source status.</p>
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

      <PropertyMapEmbed
        address={address}
        latitude={activeProfile.latitude ?? project.latitude}
        longitude={activeProfile.longitude ?? project.longitude}
        mapLinks={activeProfile.mapLinks}
        title={address || project.name}
        subtitle="Site map"
        heightClass="h-[420px]"
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <QuickFact label="Property" icon={MapPin} value={address} status={activeProfile.sourceStatus?.googleMaps} />
        <QuickFact label="Location" icon={Map} value={locationLabel || 'Manual location'} status={activeProfile.sourceStatus?.googleMaps} />
        <QuickFact label="Legal description" icon={LandPlot} value={legalDescription} status={activeProfile.titleSummary?.status || activeProfile.sourceStatus?.titleOwnership} />
        <QuickFact label="Owner / entity" icon={Building2} value={titleOwner} status={activeProfile.sourceStatus?.titleOwnership} />
      </div>

      <SourceStrip sourceStatus={activeProfile.sourceStatus} />

      <section className="rounded-xl border border-ocean-100 bg-ocean-50/50 p-5">
        <div className="flex items-start gap-3">
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-ocean-700" />
          <div>
            <h3 className="text-sm font-bold text-gray-900">Relab-style dossier, with clear evidence levels</h3>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              DevMan now shows the map and the intelligence panels directly. Live Google coordinates and Tauranga hazard checks can be captured automatically; title ownership, valuation, services and planning conclusions remain manual or linked until the right council/LINZ/licensed feeds are connected.
            </p>
            <div className="mt-3 text-xs text-gray-500">Last refreshed: {formatDateTime(activeProfile.lastRefreshedAt)}</div>
          </div>
        </div>
      </section>

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
                <textarea className={`${inputCls} min-h-[72px] resize-none`} value={manual.titleSummary} onChange={e => set('titleSummary', e.target.value)} placeholder="Title issue date, interests, easements, covenants, solicitor notes..." />
              </Field>
            </div>
          </div>
        </InfoPanel>

        <InfoPanel title="Parcel and boundary" icon={Layers} status={activeProfile.parcelSummary?.status} summary={activeProfile.parcelSummary?.summary} sourceUrl={activeProfile.parcelSummary?.sourceUrl || activeProfile.mapLinks?.linzSearch} />

        <InfoPanel title="Council records" icon={Building2} status={activeProfile.councilSummary?.status} summary={activeProfile.councilSummary?.summary} sourceUrl={activeProfile.councilSummary?.sourceUrl || activeProfile.mapLinks?.councilMaps} />

        <InfoPanel title="Zoning and planning" icon={MapPin} status={activeProfile.zoningSummary?.status} summary={activeProfile.zoningSummary?.summary} sourceUrl={activeProfile.zoningSummary?.sourceUrl || activeProfile.mapLinks?.taurangaZoning || activeProfile.mapLinks?.councilMaps}>
          {(zoningDetails.zone || zoningDetails.description || zoningDetails.ruleId) && (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <DetailPill label="Zone" value={zoningDetails.zone} />
              <DetailPill label="Description" value={zoningDetails.description} />
              <DetailPill label="Rule" value={zoningDetails.ruleId} />
            </div>
          )}
          <Field label="Planning notes">
            <textarea className={`${inputCls} mt-3 min-h-[72px] resize-none`} value={manual.zoningSummary} onChange={e => set('zoningSummary', e.target.value)} placeholder="Zone, overlays, activity status, density constraints, setbacks..." />
          </Field>
        </InfoPanel>

        <InfoPanel title="Natural hazards / flooding" icon={Waves} status={activeProfile.hazardSummary?.status} summary={hazardSummary} sourceUrl={activeProfile.hazardSummary?.sourceUrl || activeProfile.mapLinks?.taurangaNaturalHazards}>
          <EvidenceList
            items={hazardItems}
            empty="No council flooding/hazard records returned at the selected point."
            renderItem={item => (
              <>
                <div className="text-xs font-semibold text-gray-800">{item.classification || item.value || item.layerName}</div>
                <div className="mt-0.5 text-[11px] text-gray-500">{[item.layerName, item.source, item.ruleId].filter(Boolean).join(' - ')}</div>
              </>
            )}
          />
        </InfoPanel>

        <InfoPanel title="Services and utilities" icon={Zap} status={activeProfile.servicesSummary?.status} summary={activeProfile.servicesSummary?.summary} sourceUrl={activeProfile.servicesSummary?.sourceUrl || activeProfile.mapLinks?.taurangaUtilities}>
          <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
            <UtilityGroup title="Water" items={serviceGroups.Water || []} />
            <UtilityGroup title="Stormwater" items={serviceGroups.Stormwater || []} />
            <UtilityGroup title="Wastewater" items={serviceGroups.Wastewater || []} />
          </div>
          {activeProfile.servicesSummary?.searchRadiusMeters && (
            <div className="mt-2 text-[11px] text-gray-400">Search radius: {activeProfile.servicesSummary.searchRadiusMeters}m from selected coordinates.</div>
          )}
          <Field label="Services notes">
            <textarea className={`${inputCls} mt-3 min-h-[72px] resize-none`} value={manual.servicesSummary} onChange={e => set('servicesSummary', e.target.value)} placeholder="Stormwater, wastewater, water, power, access, telecoms..." />
          </Field>
        </InfoPanel>

        <InfoPanel title="Valuation and rental" icon={Gauge} status={activeProfile.valuationSummary?.status} summary={activeProfile.valuationSummary?.summary}>
          <Field label="Manual valuation notes">
            <textarea className={`${inputCls} mt-3 min-h-[72px] resize-none`} value={manual.valuationSummary} onChange={e => set('valuationSummary', e.target.value)} placeholder="CV, land value, market estimate, rental range, source date..." />
          </Field>
        </InfoPanel>

        <InfoPanel title="Schools and demographics" icon={School} status={activeProfile.demographicsSummary?.status} summary={activeProfile.demographicsSummary?.summary}>
          <Field label="Manual demographic notes">
            <textarea className={`${inputCls} mt-3 min-h-[72px] resize-none`} value={manual.demographicsSummary} onChange={e => set('demographicsSummary', e.target.value)} placeholder="School zones, local demand, household profile, suburb notes..." />
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
