import { useCallback, useEffect, useRef, useState } from 'react'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-places-sdk'

let mapsLoadPromise = null

function loadGoogleMaps() {
  if (!GOOGLE_MAPS_API_KEY) return Promise.reject(new Error('Google Maps API key is not configured'))
  if (window.google?.maps?.places) return Promise.resolve()
  if (mapsLoadPromise) return mapsLoadPromise

  mapsLoadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_MAPS_SCRIPT_ID)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps')))
      return
    }

    const script = document.createElement('script')
    script.id = GOOGLE_MAPS_SCRIPT_ID
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Maps'))
    document.head.appendChild(script)
  })

  return mapsLoadPromise
}

function component(place, type, short = false) {
  const match = place.address_components?.find(c => c.types.includes(type))
  return short ? match?.short_name : match?.long_name
}

export function mapPlaceToDetails(place) {
  const location = place.geometry?.location
  return {
    formattedAddress: place.formatted_address || '',
    lat: location?.lat?.() ?? null,
    lng: location?.lng?.() ?? null,
    streetNumber: component(place, 'street_number'),
    route: component(place, 'route'),
    suburb: component(place, 'sublocality_level_1') || component(place, 'locality'),
    city: component(place, 'locality') || component(place, 'administrative_area_level_2'),
    region: component(place, 'administrative_area_level_1'),
    postalCode: component(place, 'postal_code'),
    country: component(place, 'country'),
    countryCode: component(place, 'country', true),
    placeId: place.place_id || '',
  }
}

export function buildGoogleMapsUrl(details) {
  if (details?.lat && details?.lng) {
    return `https://www.google.com/maps/search/?api=1&query=${details.lat},${details.lng}`
  }
  if (details?.formattedAddress) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(details.formattedAddress)}`
  }
  return ''
}

export default function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  className = '',
  placeholder = 'Start typing an address',
}) {
  const inputRef = useRef(null)
  const autocompleteRef = useRef(null)
  const [ready, setReady] = useState(false)

  const handlePlaceChanged = useCallback(() => {
    const autocomplete = autocompleteRef.current
    if (!autocomplete) return

    const place = autocomplete.getPlace()
    if (!place?.formatted_address) return

    const details = mapPlaceToDetails(place)
    onChange(details.formattedAddress)
    onPlaceSelect?.(details)
  }, [onChange, onPlaceSelect])

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return
    loadGoogleMaps()
      .then(() => setReady(true))
      .catch(() => setReady(false))
  }, [])

  useEffect(() => {
    if (!ready || !inputRef.current || autocompleteRef.current || !window.google?.maps?.places) return

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'nz' },
      fields: ['formatted_address', 'geometry', 'address_components', 'place_id'],
    })

    autocomplete.addListener('place_changed', handlePlaceChanged)
    autocompleteRef.current = autocomplete
  }, [ready, handlePlaceChanged])

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
    />
  )
}
