const googleMapsUrl = ({ latitude, longitude, address }) => {
  if (latitude && longitude) return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  return ''
}

const streetViewUrl = ({ latitude, longitude, address }) => {
  if (latitude && longitude) return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latitude},${longitude}`
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  return ''
}

const linzSearchUrl = address =>
  `https://data.linz.govt.nz/layers/?q=${encodeURIComponent(address || 'New Zealand property parcel')}`

const taurangaMapsUrl = address =>
  `https://maps.tauranga.govt.nz/?search=${encodeURIComponent(address || '')}`

const isTaurangaBop = details => {
  const text = [
    details?.address,
    details?.formattedAddress,
    details?.city,
    details?.region,
    details?.suburb,
  ].join(' ').toLowerCase()
  return /tauranga|papamoa|mount maunganui|bay of plenty|western bay/i.test(text)
}

async function identifyTaurangaHazards(latitude, longitude) {
  if (!latitude || !longitude) {
    return { status: 'not available', summary: 'Coordinates are required before council hazard layers can be checked.' }
  }

  const geometry = encodeURIComponent(JSON.stringify({ x: Number(longitude), y: Number(latitude) }))
  const extent = encodeURIComponent(`${Number(longitude) - 0.01},${Number(latitude) - 0.01},${Number(longitude) + 0.01},${Number(latitude) + 0.01}`)
  const url = `https://gis.tauranga.govt.nz/server/rest/services/Natural_Hazards__multiple_data_sources/MapServer/identify?f=json&tolerance=5&returnGeometry=false&geometryType=esriGeometryPoint&sr=4326&geometry=${geometry}&mapExtent=${extent}&imageDisplay=800,600,96`

  try {
    const response = await fetch(url, { headers: { accept: 'application/json' } })
    if (!response.ok) throw new Error(`Tauranga GIS ${response.status}`)
    const data = await response.json()
    const results = Array.isArray(data.results) ? data.results : []
    if (!results.length) {
      return {
        status: 'live',
        summary: 'No Tauranga natural hazard records were returned at this point. Confirm on the council map before acquisition decisions.',
        sourceUrl: url,
        results: [],
      }
    }
    const labels = results.slice(0, 6).map(item => item.layerName || item.value).filter(Boolean)
    return {
      status: 'live',
      summary: labels.length ? labels.join(', ') : `${results.length} council hazard layer result(s) returned.`,
      sourceUrl: url,
      results,
    }
  } catch (error) {
    return {
      status: 'linked',
      summary: 'Tauranga hazard lookup could not be completed automatically. Use the council map link and record findings manually.',
      sourceUrl: 'https://gis.tauranga.govt.nz/server/rest/services/Natural_Hazards__multiple_data_sources/MapServer',
      error: error.message,
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { projectId, address, placeDetails = {}, project = {} } = req.body || {}
  const formattedAddress = placeDetails.formattedAddress || address || project.address || ''
  const latitude = placeDetails.lat ?? placeDetails.latitude ?? project.latitude ?? null
  const longitude = placeDetails.lng ?? placeDetails.longitude ?? project.longitude ?? null
  const inTaurangaBop = isTaurangaBop({ ...placeDetails, address: formattedAddress })
  const hazard = inTaurangaBop ? await identifyTaurangaHazards(latitude, longitude) : {
    status: 'linked',
    summary: 'Outside the Tauranga/BOP-first lookup area. Link relevant council GIS evidence manually for now.',
    sourceUrl: '',
  }

  const mapLinks = {
    googleMaps: googleMapsUrl({ latitude, longitude, address: formattedAddress }),
    streetView: streetViewUrl({ latitude, longitude, address: formattedAddress }),
    linzSearch: linzSearchUrl(formattedAddress),
    councilMaps: inTaurangaBop ? taurangaMapsUrl(formattedAddress) : '',
    taurangaNaturalHazards: 'https://gis.tauranga.govt.nz/server/rest/services/Natural_Hazards__multiple_data_sources/MapServer',
  }

  const profile = {
    projectId,
    address: formattedAddress,
    formattedAddress,
    placeId: placeDetails.placeId || project.placeId || '',
    latitude,
    longitude,
    suburb: placeDetails.suburb || project.suburb || '',
    city: placeDetails.city || project.city || '',
    region: placeDetails.region || project.region || '',
    postalCode: placeDetails.postalCode || project.postalCode || '',
    country: placeDetails.country || project.country || 'New Zealand',
    sourceStatus: {
      googleMaps: latitude && longitude ? 'live' : 'manual',
      linz: 'linked',
      council: inTaurangaBop ? hazard.status : 'linked',
      titleOwnership: 'manual',
      valuation: 'not available',
      demographics: 'not available',
    },
    titleSummary: {
      status: 'manual',
      summary: project.legalDescription || 'Title and ownership evidence should be uploaded or linked. Do not treat ownership as live until licensed access is confirmed.',
      legalDescription: project.legalDescription || '',
      owner: project.owner || '',
    },
    parcelSummary: {
      status: 'linked',
      summary: 'Use LINZ parcel and cadastral layers as the open-source check, then save any verified notes here.',
      sourceUrl: mapLinks.linzSearch,
    },
    councilSummary: {
      status: inTaurangaBop ? 'linked' : 'manual',
      summary: inTaurangaBop ? 'Tauranga/BOP council map links are attached for planning and records checks.' : 'Add the relevant council property/GIS links manually.',
      sourceUrl: mapLinks.councilMaps,
    },
    zoningSummary: {
      status: 'linked',
      summary: 'Planning/zoning should be confirmed from council GIS or the district plan. Save confirmed zone and overlays manually.',
      sourceUrl: mapLinks.councilMaps,
    },
    hazardSummary: {
      status: hazard.status,
      summary: hazard.summary,
      sourceUrl: hazard.sourceUrl || mapLinks.taurangaNaturalHazards,
    },
    servicesSummary: {
      status: 'manual',
      summary: 'Record stormwater, wastewater, water, power, access and telecoms notes from council/service plans.',
    },
    valuationSummary: {
      status: 'not available',
      summary: 'Council valuation, rental estimate and market estimate are placeholders until a licensed/source feed is connected.',
    },
    demographicsSummary: {
      status: 'not available',
      summary: 'Schools and demographics are placeholders for a later data source.',
    },
    mapLinks,
    rawPayload: { placeDetails, hazard },
    lastRefreshedAt: new Date().toISOString(),
  }

  return res.status(200).json({
    profile,
    sourceRuns: [
      { source: 'Google Maps', status: profile.sourceStatus.googleMaps, message: latitude && longitude ? 'Coordinates stored from address selection.' : 'Manual address without coordinates.' },
      { source: 'LINZ Data Service', status: 'linked', message: 'Open LINZ search link generated for cadastral/title evidence checks.' },
      { source: 'Tauranga natural hazards', status: hazard.status, message: hazard.summary },
    ],
  })
}
