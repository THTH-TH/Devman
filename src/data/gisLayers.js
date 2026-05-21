export const TAURANGA_GIS_SERVICES = {
  hazards: 'https://gis.tauranga.govt.nz/server/rest/services/Natural_Hazards__multiple_data_sources/MapServer',
  zoning: 'https://gis.tauranga.govt.nz/server/rest/services/ePlan/ePlan_DistrictPlanBase/MapServer',
  utilities: 'https://gis.tauranga.govt.nz/server/rest/services/Utilities_Multiple/MapServer',
}

export const DEFAULT_GIS_LAYER_GROUPS = [
  {
    id: 'zoning',
    label: 'Zoning',
    shortLabel: 'Zoning',
    description: 'Tauranga ePlan Planning Zones Operative',
    serviceUrl: TAURANGA_GIS_SERVICES.zoning,
    sourceUrl: TAURANGA_GIS_SERVICES.zoning,
    layerIds: [0],
    defaultVisible: true,
    opacity: 0.48,
    tone: 'green',
  },
  {
    id: 'flooding',
    label: 'Flooding / hazards',
    shortLabel: 'Flooding',
    description: 'Tauranga Flood Risk, with optional flood and coastal hazard overlays',
    serviceUrl: TAURANGA_GIS_SERVICES.hazards,
    sourceUrl: TAURANGA_GIS_SERVICES.hazards,
    layerIds: [30],
    secondaryLayerIds: [6, 31, 4, 5],
    secondaryLabel: 'Flood hazard plan area, depth x velocity, coastal and harbour inundation',
    defaultVisible: true,
    opacity: 0.58,
    tone: 'red',
  },
  {
    id: 'water',
    label: 'Water',
    shortLabel: 'Water',
    description: 'Water mains, service lines, meters and hydrants',
    serviceUrl: TAURANGA_GIS_SERVICES.utilities,
    sourceUrl: TAURANGA_GIS_SERVICES.utilities,
    layerIds: [188, 190, 191, 192],
    defaultVisible: false,
    opacity: 0.88,
    tone: 'blue',
  },
  {
    id: 'stormwater',
    label: 'Stormwater',
    shortLabel: 'Stormwater',
    description: 'Stormwater pipes, manholes and sumps',
    serviceUrl: TAURANGA_GIS_SERVICES.utilities,
    sourceUrl: TAURANGA_GIS_SERVICES.utilities,
    layerIds: [193, 194, 195],
    defaultVisible: false,
    opacity: 0.88,
    tone: 'cyan',
  },
  {
    id: 'wastewater',
    label: 'Wastewater',
    shortLabel: 'Wastewater',
    description: 'Wastewater pipes and manholes',
    serviceUrl: TAURANGA_GIS_SERVICES.utilities,
    sourceUrl: TAURANGA_GIS_SERVICES.utilities,
    layerIds: [56, 58],
    defaultVisible: false,
    opacity: 0.88,
    tone: 'purple',
  },
]

export function isTaurangaBopAddress(details = {}) {
  const text = [
    details.address,
    details.formattedAddress,
    details.city,
    details.region,
    details.suburb,
  ].filter(Boolean).join(' ').toLowerCase()
  return /tauranga|papamoa|mount maunganui|bay of plenty|western bay/i.test(text)
}

export function buildGisLayersConfig(details = {}) {
  const supported = isTaurangaBopAddress(details)
  return {
    supported,
    provider: 'Tauranga City Council ArcGIS',
    areaLabel: 'Tauranga / Bay of Plenty',
    statusMessage: supported
      ? 'Live Tauranga council layers are available for visual planning checks.'
      : 'No live Tauranga council overlays for this address. Complete a manual council layer check.',
    groups: supported ? DEFAULT_GIS_LAYER_GROUPS : [],
  }
}
