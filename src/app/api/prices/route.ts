import { NextRequest, NextResponse } from 'next/server'
import { getPrices } from '@/lib/prices/priceIntelligence'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const shoeId = searchParams.get('shoe_id')
    const rawRetailPrice = Number(searchParams.get('retail_price'))
    const retailPrice = isNaN(rawRetailPrice) || rawRetailPrice <= 0 ? 150 : rawRetailPrice
    const shoeName = searchParams.get('name') ?? ''
    const colorway = searchParams.get('colorway') ?? ''

    if (!shoeId) {
      return NextResponse.json({ error: 'shoe_id is required' }, { status: 400 })
    }

    const data = await getPrices(shoeId, retailPrice, shoeName, colorway)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[/api/prices]', err)
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 })
  }
}
