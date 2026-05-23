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

const searchUrl = (site, address) =>
  `https://www.google.com/search?q=${encodeURIComponent(`${address || 'New Zealand property'} site:${site}`)}`

const homesSearchUrl = address => searchUrl('homes.co.nz', address)
const oneRoofSearchUrl = address => searchUrl('oneroof.co.nz', address)
const propertyValueSearchUrl = address => searchUrl('propertyvalue.co.nz', address)

const TAURANGA_SERVICES = {
  hazards: 'https://gis.tauranga.govt.nz/server/rest/services/Natural_Hazards__multiple_data_sources/MapServer',
  zoning: 'https://gis.tauranga.govt.nz/server/rest/services/ePlan/ePlan_DistrictPlanBase/MapServer',
  utilities: 'https://gis.tauranga.govt.nz/server/rest/services/Utilities_Multiple/MapServer',
}

const UTILITY_LAYERS = [
  { system: 'Water', assetType: 'Water main', layerId: 188 },
  { system: 'Water', assetType: 'Water service line', layerId: 192 },
  { system: 'Water', assetType: 'Water meter', layerId: 191 },
  { system: 'Water', assetType: 'Hydrant', layerId: 190 },
  { system: 'Stormwater', assetType: 'Stormwater main', layerId: 193 },
  { system: 'Stormwater', assetType: 'Stormwater manhole', layerId: 194 },
  { system: 'Stormwater', assetType: 'Stormwater sump', layerId: 195 },
  { system: 'Wastewater', assetType: 'Wastewater pipe', layerId: 58 },
  { system: 'Wastewater', assetType: 'Wastewater manhole', layerId: 56 },
]

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

const isPresent = value =>
  value !== null && value !== undefined && value !== '' && value !== 'Null' && value !== 'null'

const firstPresent = (object, keys) => {
  for (const key of keys) {
    if (isPresent(object?.[key])) return object[key]
  }
  return ''
}

const unique = values => [...new Set(values.filter(isPresent))]

const buildIdentifyUrl = ({ serviceUrl, latitude, longitude, tolerance = 5, extentDelta = 0.01 }) => {
  const geometry = encodeURIComponent(JSON.stringify({ x: Number(longitude), y: Number(latitude) }))
  const extent = encodeURIComponent(`${Number(longitude) - extentDelta},${Number(latitude) - extentDelta},${Number(longitude) + extentDelta},${Number(latitude) + extentDelta}`)
  return `${serviceUrl}/identify?f=json&tolerance=${tolerance}&returnGeometry=false&geometryType=esriGeometryPoint&sr=4326&geometry=${geometry}&mapExtent=${extent}&imageDisplay=800,600,96`
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: 'application/json' } })
  if (!response.ok) throw new Error(`ArcGIS ${response.status}`)
  return response.json()
}

async function identifyArcgis({ serviceUrl, latitude, longitude, tolerance = 5, extentDelta = 0.01 }) {
  if (!latitude || !longitude) {
    return {
      status: 'not available',
      summary: 'Coordinates are required before council GIS layers can be checked.',
      sourceUrl: serviceUrl,
      results: [],
    }
  }

  const url = buildIdentifyUrl({ serviceUrl, latitude, longitude, tolerance, extentDelta })
  const data = await fetchJson(url)
  return {
    status: 'live',
    sourceUrl: url,
    results: Array.isArray(data.results) ? data.results : [],
  }
}

function summariseHazards(results) {
  if (!results.length) return 'No Tauranga natural hazard records were returned at this point. Confirm on the council map before acquisition decisions.'

  const labels = unique(results.map(item => {
    const attributes = item.attributes || {}
    return firstPresent(attributes, [
      'FloodRiskClassification',
      'DESCRIPTION',
      'Description',
      'Hazard',
      'Name',
    ]) || item.value || item.layerName
  }))

  return labels.slice(0, 8).join('; ') || `${results.length} council hazard layer result(s) returned.`
}

function mapHazardItem(item) {
  const attributes = item.attributes || {}
  return {
    layerId: item.layerId,
    layerName: item.layerName || '',
    value: item.value || '',
    classification: firstPresent(attributes, ['FloodRiskClassification', 'DESCRIPTION', 'Description', 'Hazard', 'Name']) || item.value || '',
    source: firstPresent(attributes, ['FloodRiskSource', 'SOURCE', 'Source']) || '',
    ruleId: firstPresent(attributes, ['RuleID', 'RuleId']) || '',
  }
}

async function identifyTaurangaHazards(latitude, longitude) {
  if (!latitude || !longitude) {
    return { status: 'not available', summary: 'Coordinates are required before council hazard layers can be checked.' }
  }

  try {
    const { sourceUrl, results } = await identifyArcgis({
      serviceUrl: TAURANGA_SERVICES.hazards,
      latitude,
      longitude,
      tolerance: 5,
      extentDelta: 0.01,
    })
    return {
      status: 'live',
      summary: summariseHazards(results),
      sourceUrl,
      items: results.map(mapHazardItem),
      results: results.slice(0, 20),
    }
  } catch (error) {
    return {
      status: 'linked',
      summary: 'Tauranga hazard lookup could not be completed automatically. Use the council map link and record findings manually.',
      sourceUrl: TAURANGA_SERVICES.hazards,
      error: error.message,
    }
  }
}

async function identifyTaurangaZoning(latitude, longitude) {
  if (!latitude || !longitude) {
    return { status: 'not available', summary: 'Coordinates are required before zoning can be checked.' }
  }

  try {
    const { sourceUrl, results } = await identifyArcgis({
      serviceUrl: TAURANGA_SERVICES.zoning,
      latitude,
      longitude,
      tolerance: 3,
      extentDelta: 0.01,
    })
    const zoneResult = results.find(item => /Planning Zones/i.test(item.layerName || '')) || results[0]
    if (!zoneResult) {
      return {
        status: 'live',
        summary: 'No Tauranga planning zone was returned at this point. Confirm in ePlan before relying on it.',
        sourceUrl,
        details: {},
        results: [],
      }
    }

    const attributes = zoneResult.attributes || {}
    const zone = firstPresent(attributes, ['Zone']) || zoneResult.value || ''
    const description = firstPresent(attributes, ['Description']) || ''
    const ruleId = firstPresent(attributes, ['RuleID']) || ''
    return {
      status: 'live',
      summary: [description, zone ? `(${zone})` : '', ruleId ? `Rule: ${ruleId}` : ''].filter(Boolean).join(' '),
      sourceUrl,
      details: {
        zone,
        description,
        ruleId,
        layerName: zoneResult.layerName || '',
      },
      results: results.slice(0, 10),
    }
  } catch (error) {
    return {
      status: 'linked',
      summary: 'Tauranga zoning lookup could not be completed automatically. Use ePlan and record confirmed zoning manually.',
      sourceUrl: TAURANGA_SERVICES.zoning,
      error: error.message,
    }
  }
}

function normaliseAsset(layer, feature) {
  const attributes = feature.attributes || {}
  return {
    system: layer.system,
    assetType: layer.assetType,
    layerId: layer.layerId,
    compKey: firstPresent(attributes, ['COMPKEY']),
    unitId: firstPresent(attributes, ['UNITID']),
    status: firstPresent(attributes, ['STATUS']),
    material: firstPresent(attributes, ['MATERIAL']),
    diameter: firstPresent(attributes, ['NOM_DIA_MM', 'DIAMETER', 'METERSIZE', 'SIZE']),
    length: firstPresent(attributes, ['LENGTH', 'SHAPE.STLength()']),
    owner: firstPresent(attributes, ['OWN']),
    responsibility: firstPresent(attributes, ['MAINTENANCERESPONSIBILITY', 'ASSETMANAGER']),
    comments: firstPresent(attributes, ['COMMENTS']),
    installed: firstPresent(attributes, ['INSTALLED']),
    asBuiltNumber: firstPresent(attributes, ['ASBUILTNUMBER']),
  }
}

async function queryUtilityLayer(layer, latitude, longitude, radiusMeters) {
  const geometry = encodeURIComponent(JSON.stringify({
    x: Number(longitude),
    y: Number(latitude),
    spatialReference: { wkid: 4326 },
  }))
  const url = `${TAURANGA_SERVICES.utilities}/${layer.layerId}/query?f=json&where=1%3D1&returnGeometry=false&outFields=*&geometry=${geometry}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&distance=${radiusMeters}&units=esriSRUnit_Meter&resultRecordCount=4`
  const data = await fetchJson(url)
  const features = Array.isArray(data.features) ? data.features : []
  return {
    layer,
    sourceUrl: url,
    items: features.map(feature => normaliseAsset(layer, feature)),
  }
}

function summariseServices(groups) {
  const parts = Object.entries(groups).map(([system, items]) => {
    if (!items.length) return `${system}: no nearby assets returned`
    const counts = items.reduce((acc, item) => {
      acc[item.assetType] = (acc[item.assetType] || 0) + 1
      return acc
    }, {})
    return `${system}: ${Object.entries(counts).map(([type, count]) => `${count} ${type}${count === 1 ? '' : 's'}`).join(', ')}`
  })
  return parts.join(' | ')
}

async function identifyTaurangaUtilities(latitude, longitude) {
  if (!latitude || !longitude) {
    return { status: 'not available', summary: 'Coordinates are required before services/utilities can be checked.' }
  }

  const radiusMeters = 150
  try {
    const layerResults = await Promise.all(
      UTILITY_LAYERS.map(layer => queryUtilityLayer(layer, latitude, longitude, radiusMeters).catch(error => ({ layer, error: error.message, items: [] })))
    )
    const groups = { Water: [], Stormwater: [], Wastewater: [] }
    layerResults.forEach(result => {
      groups[result.layer.system].push(...result.items)
    })
    const total = Object.values(groups).flat().length
    return {
      status: total ? 'live' : 'linked',
      summary: total ? summariseServices(groups) : 'No council utility assets were returned within 150m. Confirm manually in the council utility map.',
      sourceUrl: TAURANGA_SERVICES.utilities,
      searchRadiusMeters: radiusMeters,
      groups,
      layerResults,
    }
  } catch (error) {
    return {
      status: 'linked',
      summary: 'Tauranga utility lookup could not be completed automatically. Use the council utility map and record services manually.',
      sourceUrl: TAURANGA_SERVICES.utilities,
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
  const legalDescription = project.legalDescription || project.propertySnapshot?.legalDescription || ''
  const owner = project.owner || project.clientEntity || ''
  const landArea = project.propertySnapshot?.landArea || project.propertySnapshot?.land_area || ''
  const zoning = project.propertySnapshot?.zoning || project.propertySnapshot?.zone || ''

  const mapLinks = {
    googleMaps: googleMapsUrl({ latitude, longitude, address: formattedAddress }),
    streetView: streetViewUrl({ latitude, longitude, address: formattedAddress }),
    homesSearch: homesSearchUrl(formattedAddress),
    oneRoofSearch: oneRoofSearchUrl(formattedAddress),
    propertyValueSearch: propertyValueSearchUrl(formattedAddress),
    linzSearch: linzSearchUrl(formattedAddress),
    councilMaps: inTaurangaBop ? taurangaMapsUrl(formattedAddress) : '',
    taurangaNaturalHazards: TAURANGA_SERVICES.hazards,
    taurangaZoning: TAURANGA_SERVICES.zoning,
    taurangaUtilities: TAURANGA_SERVICES.utilities,
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
      council: inTaurangaBop ? 'linked' : 'manual',
      zoning: zoning ? 'manual' : 'linked',
      hazards: 'linked',
      services: 'manual',
      titleOwnership: 'manual',
      valuation: 'linked',
      demographics: 'not available',
    },
    titleSummary: {
      status: 'manual',
      summary: legalDescription || 'Open Homes.co.nz, OneRoof, LINZ or council records, then save the verified legal description here.',
      legalDescription,
      owner,
      sourceUrl: mapLinks.homesSearch,
    },
    parcelSummary: {
      status: 'linked',
      summary: landArea ? `Land area: ${landArea}` : 'Use Homes.co.nz, OneRoof, PropertyValue, LINZ or council records to verify land area, then save it here.',
      landArea,
      sourceUrl: mapLinks.linzSearch,
    },
    councilSummary: {
      status: inTaurangaBop ? 'linked' : 'manual',
      summary: inTaurangaBop ? 'Tauranga council map link attached for planning, property and records checks.' : 'Add the relevant council property/GIS link manually.',
      sourceUrl: mapLinks.councilMaps,
    },
    zoningSummary: {
      status: zoning ? 'manual' : 'linked',
      summary: zoning || 'Zoning is not automatically confirmed. Check Homes.co.nz/OneRoof/council map and save the verified zone here.',
      sourceUrl: mapLinks.councilMaps || mapLinks.homesSearch,
      details: { zone: zoning },
      results: [],
    },
    hazardSummary: {
      status: 'linked',
      summary: 'Hazards/flooding are linked for manual council review only in this simplified property record.',
      sourceUrl: mapLinks.taurangaNaturalHazards,
      items: [],
      results: [],
    },
    servicesSummary: {
      status: 'manual',
      summary: 'Services are manual notes for now. Confirm stormwater, wastewater, water, power and access from council/utility evidence.',
      sourceUrl: mapLinks.taurangaUtilities,
      searchRadiusMeters: null,
      groups: {},
    },
    valuationSummary: {
      status: 'linked',
      summary: 'Use Homes.co.nz, OneRoof or PropertyValue as quick market evidence, then save the useful valuation notes here.',
      sourceUrl: mapLinks.homesSearch,
    },
    demographicsSummary: {
      status: 'not available',
      summary: 'Demographics are not connected yet.',
    },
    mapLinks,
    rawPayload: { placeDetails, sources: mapLinks },
    lastRefreshedAt: new Date().toISOString(),
  }

  return res.status(200).json({
    profile,
    sourceRuns: [
      { source: 'Google Maps', status: profile.sourceStatus.googleMaps, message: latitude && longitude ? 'Coordinates stored from address selection.' : 'Manual address without coordinates.' },
      { source: 'Homes.co.nz / OneRoof', status: 'linked', message: 'Property evidence search links generated. Save verified legal, land area and zoning details manually.' },
      { source: 'LINZ Data Service', status: 'linked', message: 'Open LINZ search link generated for parcel/title evidence checks.' },
      { source: 'Council records', status: profile.sourceStatus.council, message: profile.councilSummary.summary },
    ],
  })
}
