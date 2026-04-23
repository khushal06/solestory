import { NextRequest, NextResponse } from 'next/server'
import { getNearbyStores } from '@/lib/stores/nearbyStores'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const lat = Number(searchParams.get('lat'))
    const lon = Number(searchParams.get('lon'))

    if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
      return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 })
    }

    const stores = await getNearbyStores(lat, lon)
    return NextResponse.json({ stores })
  } catch (err) {
    console.error('[/api/nearby-stores]', err)
    return NextResponse.json({ error: 'Failed to fetch nearby stores' }, { status: 500 })
  }
}
