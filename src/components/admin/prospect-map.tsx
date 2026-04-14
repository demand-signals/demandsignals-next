'use client'

import { useEffect, useState, useRef } from 'react'
import { ExternalLink, MapPin } from 'lucide-react'

interface ProspectMapProps {
  address: string | null
  businessName: string
}

function getGoogleMapsUrl(businessName: string, address: string | null) {
  const query = address ? `${businessName}, ${address}` : businessName
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

/** Dynamically imported Leaflet map — avoids SSR issues */
function LeafletMap({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [cssLoaded, setCssLoaded] = useState(false)

  // Load Leaflet CSS before initializing the map
  useEffect(() => {
    if (document.querySelector('link[href*="leaflet@1.9.4"]')) {
      setCssLoaded(true)
      return
    }
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    link.onload = () => setCssLoaded(true)
    document.head.appendChild(link)
  }, [])

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || !cssLoaded) return

    import('leaflet').then((L) => {
      if (!mapRef.current) return

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!, {
        scrollWheelZoom: false,
        zoomControl: true,
      }).setView([lat, lng], 15)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)

      L.marker([lat, lng]).addTo(map).bindPopup(label)

      mapInstanceRef.current = map

      // Use ResizeObserver to invalidate on any container size change
      const ro = new ResizeObserver(() => map.invalidateSize())
      ro.observe(mapRef.current!)

      // Also invalidate after short delays for initial render
      requestAnimationFrame(() => map.invalidateSize())
      setTimeout(() => map.invalidateSize(), 300)

      return () => ro.disconnect()
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [lat, lng, label, cssLoaded])

  return <div ref={mapRef} style={{ width: '100%', height: '220px' }} />
}

export function ProspectMap({ address, businessName }: ProspectMapProps) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!address) return

    setLoading(true)

    // Deduplicate address parts — prospect.address may already contain city/state/zip
    // which then gets appended again by the parent component
    const parts = address.split(',').map(s => s.trim()).filter(Boolean)
    const seen = new Set<string>()
    const unique: string[] = []
    for (const p of parts) {
      const key = p.toLowerCase().replace(/\s+/g, ' ')
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(p)
      }
    }
    const cleanAddress = unique.join(', ')

    async function tryGeocode() {
      // Strategy 1: structured Nominatim query (most reliable)
      // Parse out street vs city/state/zip
      const streetMatch = cleanAddress.match(/^(.+?),\s*(.+?),\s*([A-Z]{2})\s*,?\s*(\d{5})?/)
      if (streetMatch) {
        try {
          const params = new URLSearchParams({
            format: 'json',
            street: streetMatch[1],
            city: streetMatch[2],
            state: streetMatch[3],
            country: 'us',
            limit: '1',
          })
          if (streetMatch[4]) params.set('postalcode', streetMatch[4])
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?${params}`,
            { headers: { 'User-Agent': 'DemandSignals-Admin/1.0' } }
          )
          const results = await res.json()
          if (results.length > 0) {
            setCoords({ lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) })
            return
          }
        } catch { /* try next */ }
      }

      // Strategy 2: free-form query with deduplicated address
      const queries = [
        cleanAddress,
        `${businessName}, ${cleanAddress}`,
      ]
      for (const query of queries) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=us`,
            { headers: { 'User-Agent': 'DemandSignals-Admin/1.0' } }
          )
          const results = await res.json()
          if (results.length > 0) {
            setCoords({ lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) })
            return
          }
        } catch { /* try next query */ }
      }
      setError(true)
    }

    tryGeocode().finally(() => setLoading(false))
  }, [address, businessName])

  const mapsUrl = getGoogleMapsUrl(businessName, address)

  if (!address) {
    return (
      <div className="text-center py-4">
        <MapPin className="w-8 h-8 text-slate-200 mx-auto mb-2" />
        <p className="text-slate-400 text-sm">No address on file</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Map container */}
      <div className="rounded-lg overflow-hidden bg-slate-100 border border-slate-200" style={{ height: 220 }}>
        {loading && (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
            Loading map…
          </div>
        )}
        {!loading && coords && (
          <LeafletMap lat={coords.lat} lng={coords.lng} label={businessName} />
        )}
        {!loading && error && (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
            <MapPin className="w-5 h-5 mr-2" />
            Could not geocode address
          </div>
        )}
      </div>

      {/* Google Maps link */}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 text-xs text-[var(--teal-dark)] hover:underline py-1"
      >
        <ExternalLink className="w-3 h-3" />
        Open in Google Maps
      </a>
    </div>
  )
}
