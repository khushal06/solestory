import type { NearbyStore } from '@/types'

interface OverpassElement {
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: {
    name?: string
    'addr:full'?: string
    'addr:street'?: string
    'addr:housenumber'?: string
    'addr:city'?: string
    shop?: string
  }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatAddress(tags: OverpassElement['tags']): string {
  if (!tags) return 'Address unavailable'
  if (tags['addr:full']) return tags['addr:full']
  const parts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:city'],
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : 'Address unavailable'
}

function classifyStore(tags: OverpassElement['tags']): NearbyStore['type'] {
  const shop = tags?.shop?.toLowerCase() ?? ''
  if (shop === 'shoes' || shop === 'sneakers') return 'sneaker'
  if (shop === 'department_store') return 'department'
  if (shop === 'outlet') return 'outlet'
  return 'general'
}

export async function getNearbyStores(
  lat: number,
  lon: number,
  radiusKm = 10
): Promise<NearbyStore[]> {
  const radiusM = radiusKm * 1000
  const query = `
    [out:json][timeout:15];
    (
      node["shop"="shoes"](around:${radiusM},${lat},${lon});
      node["shop"="sneakers"](around:${radiusM},${lat},${lon});
      node["shop"="sports"](around:${radiusM},${lat},${lon});
      way["shop"="shoes"](around:${radiusM},${lat},${lon});
      way["shop"="sneakers"](around:${radiusM},${lat},${lon});
    );
    out center 20;
  `

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query,
    headers: { 'Content-Type': 'text/plain' },
    signal: AbortSignal.timeout(18000),
  })

  if (!res.ok) return []

  const data = await res.json()
  const elements: OverpassElement[] = data.elements ?? []

  return elements
    .filter((el) => el.tags?.name)
    .map((el) => {
      const storeLat = el.lat ?? el.center?.lat ?? lat
      const storeLon = el.lon ?? el.center?.lon ?? lon
      const distance = haversineKm(lat, lon, storeLat, storeLon)
      return {
        id: String(el.id),
        name: el.tags!.name!,
        distance_km: Math.round(distance * 10) / 10,
        address: formatAddress(el.tags),
        lat: storeLat,
        lon: storeLon,
        type: classifyStore(el.tags),
        maps_url: `https://www.openstreetmap.org/?mlat=${storeLat}&mlon=${storeLon}&zoom=17`,
      }
    })
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, 10)
}
