import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60 // seconds — CLIP model needs time on cold start
import { recognizeShoe } from '@/lib/ai/shoeRecognition'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { image_url, scan_id } = await req.json()

    if (!image_url || typeof image_url !== 'string') {
      return NextResponse.json({ error: 'image_url is required' }, { status: 400 })
    }

    // Log env state so Vercel logs show exactly what's available
    console.log('[/api/recognize] GOOGLE_AI_API_KEY set:', !!process.env.GOOGLE_AI_API_KEY)
    console.log('[/api/recognize] SUPABASE URL set:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)

    const result = await recognizeShoe(image_url)

    if (!result) {
      return NextResponse.json(
        { error: 'Could not identify this shoe. Try a clearer photo with good lighting.' },
        { status: 404 }
      )
    }

    // Attach shoe_id + confidence to the scan record created during upload
    if (scan_id) {
      const supabase = createServiceClient()
      await supabase
        .from('scans')
        .update({
          shoe_id:    result.shoe.id,
          caption:    result.caption,
          confidence: result.confidence,
        })
        .eq('id', scan_id)
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[/api/recognize]', err)
    return NextResponse.json(
      { error: 'Recognition service temporarily unavailable. Please try again.' },
      { status: 500 }
    )
  }
}
