import { ExternalLink, Map, MapPin, MapPinned, Satellite } from 'lucide-react'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

function hasCoordinate(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
}

function formatCoordinate(value) {
  return hasCoordinate(value) ? Number(value).toFixed(6) : ''
}

function buildQuery({ latitude, longitude, address }) {
  if (hasCoordinate(latitude) && hasCoordinate(longitude)) return `${latitude},${longitude}`
  return address || ''
}

function buildEmbedUrl(query) {
  if (!query) return ''
  if (GOOGLE_MAPS_API_KEY) {
    return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(query)}`
  }
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=17&output=embed`
}

function buildMapsUrl(query) {
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : ''
}

function buildSatelliteUrl({ latitude, longitude, address }) {
  if (hasCoordinate(latitude) && hasCoordinate(longitude)) {
    return `https://www.google.com/maps/@${latitude},${longitude},18z/data=!3m1!1e3`
  }
  return buildMapsUrl(address)
}

function buildStreetViewUrl({ latitude, longitude, address }) {
  if (hasCoordinate(latitude) && hasCoordinate(longitude)) {
    return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latitude},${longitude}`
  }
  return buildMapsUrl(address)
}

function ActionLink({ href, icon: Icon, label }) {
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
    >
      <Icon size={13} />
      {label}
      <ExternalLink size={11} className="text-gray-400" />
    </a>
  )
}

export default function PropertyMapEmbed({
  address = '',
  latitude = null,
  longitude = null,
  mapLinks = {},
  title = 'Property map',
  subtitle = 'Embedded site map',
  heightClass = 'h-[360px]',
  className = '',
}) {
  const query = buildQuery({ latitude, longitude, address })
  const embedUrl = buildEmbedUrl(query)
  const mapsUrl = mapLinks.googleMaps || buildMapsUrl(query)
  const satelliteUrl = mapLinks.satellite || buildSatelliteUrl({ latitude, longitude, address: query || address })
  const streetViewUrl = mapLinks.streetView || buildStreetViewUrl({ latitude, longitude, address: query || address })
  const coordinateLabel = hasCoordinate(latitude) && hasCoordinate(longitude)
    ? `${formatCoordinate(latitude)}, ${formatCoordinate(longitude)}`
    : 'Coordinates not captured yet'

  return (
    <section className={`overflow-hidden rounded-xl border border-gray-100 bg-white ${className}`}>
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-forest-50 text-forest-700">
            <MapPin size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">{subtitle}</div>
            <div className="truncate text-sm font-bold text-gray-900">{title || address || 'No property selected'}</div>
            <div className="mt-0.5 text-xs text-gray-500">{coordinateLabel}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionLink href={mapsUrl} icon={Map} label="Map" />
          <ActionLink href={satelliteUrl} icon={Satellite} label="Satellite" />
          <ActionLink href={streetViewUrl} icon={MapPinned} label="Street View" />
        </div>
      </div>

      {embedUrl ? (
        <iframe
          title={title || 'Property map'}
          src={embedUrl}
          className={`${heightClass} w-full border-0 bg-gray-50`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <div className={`${heightClass} flex items-center justify-center bg-gray-50 px-6 text-center text-sm text-gray-500`}>
          Search or enter a property address to load the map.
        </div>
      )}
    </section>
  )
}
