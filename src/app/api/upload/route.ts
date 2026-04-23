import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const MAX_SIZE = 15 * 1024 * 1024 // 15 MB (after browser compression)
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif']

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type. Use JPG, PNG, or WebP.' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Image must be under 10 MB.' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // ── 1. Upload to Supabase Storage ──────────────────────────────────────
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const arrayBuffer = await file.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from('shoe-uploads')
      .upload(filename, Buffer.from(arrayBuffer), {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[/api/upload] storage error:', uploadError.message)
      return NextResponse.json({ error: 'Storage upload failed.' }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from('shoe-uploads')
      .getPublicUrl(filename)

    const publicUrl = urlData.publicUrl

    // ── 2. Create scan record (shoe_id + confidence filled in by /api/recognize) ──
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .insert({ image_url: publicUrl })
      .select('id')
      .single()

    if (scanError) {
      // Non-fatal — we still return the URL so recognition can proceed
      console.warn('[/api/upload] scan insert error:', scanError.message)
    }

    return NextResponse.json({
      url: publicUrl,
      scan_id: scan?.id ?? null,
    })
  } catch (err) {
    console.error('[/api/upload]', err)
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 })
  }
}
