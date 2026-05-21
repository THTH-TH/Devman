import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import * as EsriLeaflet from 'esri-leaflet'
import 'leaflet/dist/leaflet.css'
import { ExternalLink, Layers, MapPin, SlidersHorizontal } from 'lucide-react'
import { buildGisLayersConfig } from '../data/gisLayers'

const toneClasses = {
  green: 'bg-emerald-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  cyan: 'bg-cyan-500',
  purple: 'bg-purple-500',
}

const hasCoordinate = value =>
  value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))

const normaliseLayerIds = value => Array.isArray(value) ? value.filter(id => id !== null && id !== undefined) : []

function normaliseServiceUrl(url = '') {
  return url.endsWith('/') ? url : `${url}/`
}

function buildArcgisExportUrl({ serviceUrl, layerIds, map }) {
  const bounds = map.getBounds()
  const size = map.getSize()
  const extent = EsriLeaflet.Util.boundsToExtent(bounds)
  const params = new URLSearchParams({
    bbox: `${extent.xmin},${extent.ymin},${extent.xmax},${extent.ymax}`,
    size: `${Math.max(1, Math.round(size.x))},${Math.max(1, Math.round(size.y))}`,
    dpi: '96',
    format: 'png32',
    transparent: 'true',
    bboxSR: '4326',
    imageSR: '3857',
    layers: `show:${layerIds.join(',')}`,
    f: 'image',
    _ts: String(Date.now()),
  })
  return `${normaliseServiceUrl(serviceUrl)}export?${params.toString()}`
}

function buildVisibleState(groups) {
  return groups.reduce((acc, group) => {
    acc[group.id] = Boolean(group.defaultVisible)
    return acc
  }, {})
}

function Toggle({ group, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2 hover:bg-gray-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-forest-600 focus:ring-forest-500"
      />
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-xs font-bold text-gray-800">
          <span className={`h-2.5 w-2.5 rounded-full ${toneClasses[group.tone] || 'bg-gray-400'}`} />
          {group.shortLabel || group.label}
        </span>
        <span className="mt-0.5 block text-[11px] leading-4 text-gray-500">{group.description}</span>
      </span>
    </label>
  )
}

function SourceLink({ group }) {
  if (!group?.sourceUrl) return null
  return (
    <a
      href={group.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50"
    >
      {group.shortLabel || group.label}
      <ExternalLink size={10} className="text-gray-400" />
    </a>
  )
}

export default function PlanningLayerMap({
  address = '',
  latitude = null,
  longitude = null,
  gisLayers = null,
  title = 'Council GIS layer map',
  subtitle = 'Toggle zoning, flooding and services directly on the map.',
  heightClass = 'h-[440px]',
  className = '',
}) {
  const mapRef = useRef(null)
  const containerRef = useRef(null)
  const layerRefs = useRef({})

  const hasCoords = hasCoordinate(latitude) && hasCoordinate(longitude)
  const config = useMemo(() => {
    if (gisLayers?.groups) return gisLayers
    return buildGisLayersConfig({ address, formattedAddress: address })
  }, [address, gisLayers])
  const groups = useMemo(() => Array.isArray(config.groups) ? config.groups : [], [config.groups])
  const supported = Boolean(config.supported && groups.length)

  const [visible, setVisible] = useState(() => buildVisibleState(groups))
  const [overlayOpacity, setOverlayOpacity] = useState(0.72)
  const [showSecondaryHazards, setShowSecondaryHazards] = useState(false)
  const [mapReady, setMapReady] = useState(0)
  const [mapRevision, setMapRevision] = useState(0)

  useEffect(() => {
    setVisible(buildVisibleState(groups))
    setShowSecondaryHazards(false)
  }, [groups])

  useEffect(() => {
    if (!hasCoords || !containerRef.current) return undefined

    const lat = Number(latitude)
    const lng = Number(longitude)
    setMapReady(0)
    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 17,
      zoomControl: true,
      attributionControl: true,
    })
    mapRef.current = map
    map.createPane('planningLayers')
    map.getPane('planningLayers').style.zIndex = 430
    map.getPane('planningLayers').style.pointerEvents = 'none'
    map.createPane('siteMarker')
    map.getPane('siteMarker').style.zIndex = 650

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    L.circleMarker([lat, lng], {
      radius: 8,
      color: '#ffffff',
      weight: 3,
      fillColor: '#d63c32',
      fillOpacity: 1,
      pane: 'siteMarker',
    })
      .bindTooltip(address || 'Selected property', { direction: 'top', offset: [0, -8] })
      .addTo(map)

    const markMoved = () => setMapRevision(value => value + 1)
    map.on('moveend zoomend resize', markMoved)

    window.setTimeout(() => {
      map.invalidateSize()
      setMapReady(value => value + 1)
    }, 80)

    return () => {
      Object.values(layerRefs.current).forEach(layer => {
        if (layer && map.hasLayer(layer)) map.removeLayer(layer)
      })
      layerRefs.current = {}
      map.off('moveend zoomend resize', markMoved)
      map.remove()
      mapRef.current = null
    }
  }, [address, hasCoords, latitude, longitude])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    Object.values(layerRefs.current).forEach(layer => {
      if (layer && map.hasLayer(layer)) map.removeLayer(layer)
    })
    layerRefs.current = {}

    if (!supported) return

    groups.forEach(group => {
      if (!visible[group.id]) return
      const baseLayerIds = normaliseLayerIds(group.layerIds)
      const secondaryLayerIds = group.id === 'flooding' && showSecondaryHazards
        ? normaliseLayerIds(group.secondaryLayerIds)
        : []
      const layerIds = [...baseLayerIds, ...secondaryLayerIds]
      if (!group.serviceUrl || !layerIds.length) return

      const opacity = Math.min(1, Math.max(0.05, Number(group.opacity || 0.7) * overlayOpacity))
      const layer = L.imageOverlay(
        buildArcgisExportUrl({ serviceUrl: group.serviceUrl, layerIds, map }),
        map.getBounds(),
        {
          opacity,
          pane: 'planningLayers',
          interactive: false,
        }
      )
      layer.addTo(map)
      layerRefs.current[group.id] = layer
    })
  }, [groups, mapReady, mapRevision, overlayOpacity, showSecondaryHazards, supported, visible])

  const statusMessage = !hasCoords
    ? 'Mapped coordinates are required before council GIS layers can be displayed.'
    : config.statusMessage || (supported ? 'Live council GIS overlays are available.' : 'Manual council layer check required.')

  return (
    <section className={`overflow-hidden rounded-xl border border-gray-100 bg-white ${className}`}>
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-forest-50 text-forest-700">
            <Layers size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-gray-900">{title}</div>
            <p className="mt-0.5 text-xs leading-5 text-gray-500">{subtitle}</p>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
              <MapPin size={12} />
              <span className="truncate">{address || 'No address selected'}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {groups.map(group => <SourceLink key={group.id} group={group} />)}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className={`${heightClass} relative w-full overflow-hidden bg-gray-50`}>
          {hasCoords ? (
            <div ref={containerRef} className="h-full w-full" />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-gray-500">
              Search or enter a mapped address to load the GIS layer map.
            </div>
          )}

          <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-white/70 bg-white/95 px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm">
            {supported ? 'Council layers live' : 'Manual layer check required'}
          </div>
        </div>

        <aside className="border-t border-gray-100 bg-offwhite/60 p-4 xl:border-l xl:border-t-0">
          <div className="mb-4 rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs leading-5 text-gray-600">
            {statusMessage}
          </div>

          {supported ? (
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-gray-900">
                  <Layers size={14} />
                  Layers
                </div>
                <div className="space-y-2">
                  {groups.map(group => (
                    <Toggle
                      key={group.id}
                      group={group}
                      checked={Boolean(visible[group.id])}
                      onChange={checked => setVisible(current => ({ ...current, [group.id]: checked }))}
                    />
                  ))}
                </div>
              </div>

              {groups.some(group => group.id === 'flooding' && group.secondaryLayerIds?.length) && (
                <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={showSecondaryHazards}
                    disabled={!visible.flooding}
                    onChange={event => setShowSecondaryHazards(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-forest-600 focus:ring-forest-500 disabled:opacity-50"
                  />
                  <span>
                    <span className="text-xs font-bold text-gray-800">Extra hazard overlays</span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-gray-500">
                      Flood plan area, depth x velocity, coastal and harbour inundation.
                    </span>
                  </span>
                </label>
              )}

              <div className="rounded-lg border border-gray-100 bg-white p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
                    <SlidersHorizontal size={14} />
                    Overlay opacity
                  </div>
                  <span className="text-xs font-semibold text-gray-500">{Math.round(overlayOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="25"
                  max="100"
                  value={Math.round(overlayOpacity * 100)}
                  onChange={event => setOverlayOpacity(Number(event.target.value) / 100)}
                  className="w-full accent-forest-600"
                />
              </div>

              <div className="rounded-lg border border-gray-100 bg-white p-3">
                <div className="mb-2 text-xs font-bold text-gray-900">Visual evidence</div>
                <p className="text-[11px] leading-5 text-gray-500">
                  Use this map for layer inspection. The summary cards below are point/nearby identify results only, not the final planning certificate.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 bg-white px-3 py-4 text-xs leading-5 text-gray-500">
              This address is outside the current Tauranga/BOP live layer setup or has no mapped coordinates. The project can still be created, but council overlays need to be checked manually.
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
