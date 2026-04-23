import type { RecognitionResult, Shoe } from '@/types'

// ── Gemini Vision (primary — recognizes ANY shoe) ─────────────────────────────
async function identifyWithGemini(imageUrl: string): Promise<RecognitionResult | null> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) return null

  try {
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(10_000) })
    if (!imgRes.ok) return null
    const buffer = await imgRes.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const mimeType = (imgRes.headers.get('content-type') ?? 'image/jpeg').split(';')[0]

    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const result = await model.generateContent([
      { inlineData: { data: base64, mimeType } },
      {
        text: `You are a world-class sneaker expert. Identify the shoe in this image as precisely as possible.

Return ONLY a valid JSON object — no markdown, no code fences, no extra text:
{
  "name": "exact model name e.g. Adidas Campus 00s",
  "brand": "brand name e.g. Adidas",
  "colorway": "colorway name e.g. Core Black / Cloud White",
  "release_year": 2023,
  "retail_price": 90,
  "confidence": 85,
  "story": "2-3 sentences about this shoe's history and cultural significance",
  "details": {
    "material": "e.g. Suede upper",
    "sole": "e.g. Rubber cupsole",
    "upper": "e.g. Low-top construction",
    "silhouette": "e.g. Low-top lifestyle / tennis"
  },
  "tags": ["tag1", "tag2", "tag3"]
}

Set confidence 0-100 based on how certain you are. If you truly cannot identify the shoe, set confidence below 40.`,
      },
    ])

    const raw = result.response.text().trim()
    const jsonText = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim()
    const data = JSON.parse(jsonText)

    if (!data.name || !data.brand || (data.confidence ?? 0) < 40) return null

    const shoe: Shoe = {
      id: crypto.randomUUID(),
      name: data.name,
      brand: data.brand,
      colorway: data.colorway ?? '',
      release_year: Number(data.release_year) || new Date().getFullYear(),
      retail_price: Number(data.retail_price) || 100,
      story: data.story ?? '',
      details: data.details ?? { material: '', sole: '', upper: '', silhouette: '' },
      image_url: '', // UI falls back to the uploaded image
      tags: Array.isArray(data.tags) ? data.tags : [],
      created_at: new Date().toISOString(),
    }

    console.log(`[recognizeShoe] Gemini: ${shoe.brand} ${shoe.name} (${data.confidence}%)`)
    return { shoe, confidence: Number(data.confidence), caption: `${shoe.brand} ${shoe.name} ${shoe.colorway}`.trim() }
  } catch (err) {
    console.warn('[identifyWithGemini] failed:', (err as Error).message)
    return null
  }
}

// ── CLIP fallback (matches against catalog when Gemini is unavailable) ─────────
const MODEL_ID = 'Xenova/clip-vit-base-patch32'

let _processor: Awaited<ReturnType<typeof loadProcessor>> | null = null
let _visionModel: Awaited<ReturnType<typeof loadVisionModel>> | null = null
let _classifier: Awaited<ReturnType<typeof loadClassifier>> | null = null

const embeddingCache = new Map<string, Float32Array>()

async function loadProcessor() {
  const { AutoProcessor } = await import('@huggingface/transformers')
  return AutoProcessor.from_pretrained(MODEL_ID)
}

async function loadVisionModel() {
  const { CLIPVisionModelWithProjection } = await import('@huggingface/transformers')
  // q8 = ~22MB quantized model — much faster cold start on Vercel vs fp32 (~88MB)
  return CLIPVisionModelWithProjection.from_pretrained(MODEL_ID, { dtype: 'q8' })
}

async function loadClassifier() {
  const { pipeline } = await import('@huggingface/transformers')
  return pipeline('zero-shot-image-classification', MODEL_ID, { dtype: 'q8' })
}

async function ensureVisionModels(): Promise<boolean> {
  try {
    if (!_processor) _processor = await loadProcessor()
    if (!_visionModel) _visionModel = await loadVisionModel()
    return true
  } catch (err) {
    console.warn('[shoeRecognition] vision model load failed:', (err as Error).message)
    return false
  }
}

async function getImageEmbedding(imageUrl: string): Promise<Float32Array | null> {
  if (embeddingCache.has(imageUrl)) return embeddingCache.get(imageUrl)!
  if (!(await ensureVisionModels())) return null

  try {
    const { RawImage } = await import('@huggingface/transformers')
    const image = await RawImage.fromURL(imageUrl)
    const inputs = await _processor!(image)
    const { image_embeds } = await _visionModel!(inputs)

    const raw = image_embeds.data as Float32Array
    let norm = 0
    for (let i = 0; i < raw.length; i++) norm += raw[i] * raw[i]
    norm = Math.sqrt(norm)
    const normalized = new Float32Array(raw.length)
    for (let i = 0; i < raw.length; i++) normalized[i] = raw[i] / norm

    embeddingCache.set(imageUrl, normalized)
    return normalized
  } catch (err) {
    console.warn('[getImageEmbedding] failed for', imageUrl, (err as Error).message)
    return null
  }
}

function dotProduct(a: Float32Array, b: Float32Array): number {
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
  return dot
}

const COLORWAY_COLORS: Record<string, string> = {
  'Chicago': 'red white black', 'Royal': 'black royal blue', 'Bred': 'black red',
  'Flu Game': 'black red', 'Fire Red': 'white red', 'Carmine': 'white carmine red',
  'Concord': 'white black', 'Panda': 'white black', 'Zebra': 'white black striped',
  'White Cement': 'white grey cement', 'Triple White': 'white', 'OG Red': 'red white',
  'Infrared': 'white black red infrared', 'White Green': 'white green', 'Grey': 'grey',
  'Grey Navy': 'grey navy', 'Black White': 'black white', 'Black High Top': 'black',
  'Vintage White': 'white cream vintage', 'Royal Blue': 'royal blue',
  'Classic White Red': 'white red', 'Navy White': 'navy white',
  'Pigeon': 'grey beige pigeon', 'Yurt': 'earth green tan brown',
  'Cloud White / Royal Blue': 'white royal blue', 'White / White': 'white',
  'White / Green': 'white green',
}

function buildVisualLabel(shoe: Shoe): string {
  const d = shoe.details
  const colors = COLORWAY_COLORS[shoe.colorway] ?? shoe.colorway.toLowerCase()
  const sil = (d?.silhouette ?? '').toLowerCase()
  const height = sil.includes('high') ? 'high-top' : sil.includes('mid') ? 'mid-top' : 'low-top'
  const mat = (d?.material ?? '').toLowerCase()
  const material = mat.includes('canvas') ? 'canvas'
    : mat.includes('primeknit') || mat.includes('knit') ? 'primeknit knit'
    : mat.includes('suede') ? 'suede'
    : mat.includes('leather') ? 'leather'
    : 'mesh'
  const brand = shoe.brand.split('/')[0].trim()
  const sport = sil.includes('basketball') ? 'basketball' : sil.includes('running') ? 'running'
    : sil.includes('skate') ? 'skate' : sil.includes('tennis') ? 'tennis' : 'lifestyle'
  return `${colors} ${height} ${material} ${brand} ${sport} sneaker`.replace(/\s+/g, ' ').trim()
}

async function identifyWithCLIP(imageUrl: string, shoes: Shoe[]): Promise<RecognitionResult | null> {
  const queryEmb = await getImageEmbedding(imageUrl)

  if (queryEmb) {
    const catalogShoes = shoes.filter(s => s.image_url)
    await Promise.all(catalogShoes.map(s => getImageEmbedding(s.image_url!)))

    const scored = catalogShoes
      .filter(s => embeddingCache.has(s.image_url!))
      .map(shoe => ({ shoe, score: dotProduct(queryEmb, embeddingCache.get(shoe.image_url!)!) }))
      .sort((a, b) => b.score - a.score)

    if (scored.length && scored[0].score >= 0.45) {
      const { shoe, score } = scored[0]
      return { shoe, confidence: Math.round(score * 100), caption: buildVisualLabel(shoe) }
    }
  }

  // Text zero-shot fallback
  const labels = shoes.map(s => buildVisualLabel(s))
  try {
    if (!_classifier) _classifier = await loadClassifier()
    const result = (await _classifier(imageUrl, labels)) as Array<{ label: string; score: number }>
    if (!result?.length) return null
    const top = result[0]
    const topIdx = labels.indexOf(top.label)
    if (topIdx === -1) return null
    const confidence = Math.round(top.score * 100)
    if (confidence < 6) return null
    return { shoe: shoes[topIdx], confidence, caption: top.label }
  } catch {
    return null
  }
}

// ── Main export ────────────────────────────────────────────────────────────────
export async function recognizeShoe(imageUrl: string): Promise<RecognitionResult | null> {
  const onVercel = !!process.env.VERCEL
  const hasGeminiKey = !!process.env.GOOGLE_AI_API_KEY

  console.log(`[recognizeShoe] env — Vercel: ${onVercel}, Gemini key: ${hasGeminiKey}`)

  // 1. Try Gemini — works everywhere, identifies any shoe in the world
  if (hasGeminiKey) {
    const geminiResult = await identifyWithGemini(imageUrl)
    if (geminiResult) return geminiResult
    console.warn('[recognizeShoe] Gemini returned null')
  } else {
    console.warn('[recognizeShoe] GOOGLE_AI_API_KEY not set — add it in Vercel env vars')
  }

  // 2. CLIP catalog fallback — only works locally (ONNX needs native binaries unavailable on Vercel)
  if (onVercel) {
    console.error('[recognizeShoe] On Vercel with no Gemini result — cannot fall back to CLIP')
    return null
  }

  console.log('[recognizeShoe] falling back to CLIP catalog (local only)')
  const { createServiceClient } = await import('@/lib/supabase/server')
  const supabase = createServiceClient()

  const { data: shoes, error } = await supabase
    .from('shoes')
    .select('id,name,brand,colorway,release_year,retail_price,story,details,image_url,tags,created_at')
    .order('created_at', { ascending: true })

  if (error || !shoes?.length) {
    console.error('[recognizeShoe] catalog load failed:', error?.message)
    return null
  }

  return identifyWithCLIP(imageUrl, shoes as Shoe[])
}
