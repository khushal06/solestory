import type { RecognitionResult, Shoe } from '@/types'

const MODEL_ID = 'Xenova/clip-vit-base-patch32'

// Lazy-loaded model instances
let _processor: Awaited<ReturnType<typeof loadProcessor>> | null = null
let _visionModel: Awaited<ReturnType<typeof loadVisionModel>> | null = null
let _classifier: Awaited<ReturnType<typeof loadClassifier>> | null = null

// In-memory embedding cache — persists for the lifetime of the server process
const embeddingCache = new Map<string, Float32Array>()

async function loadProcessor() {
  const { AutoProcessor } = await import('@huggingface/transformers')
  return AutoProcessor.from_pretrained(MODEL_ID)
}

async function loadVisionModel() {
  const { CLIPVisionModelWithProjection } = await import('@huggingface/transformers')
  return CLIPVisionModelWithProjection.from_pretrained(MODEL_ID, { dtype: 'fp32' })
}

async function loadClassifier() {
  const { pipeline } = await import('@huggingface/transformers')
  return pipeline('zero-shot-image-classification', MODEL_ID, { dtype: 'fp32' })
}

async function ensureVisionModels(): Promise<boolean> {
  try {
    if (!_processor) _processor = await loadProcessor()
    if (!_visionModel) _visionModel = await loadVisionModel()
    return true
  } catch (err) {
    console.warn('[shoeRecognition] vision model load failed, will use text fallback:', (err as Error).message)
    return false
  }
}

async function getImageEmbedding(imageUrl: string): Promise<Float32Array | null> {
  if (embeddingCache.has(imageUrl)) return embeddingCache.get(imageUrl)!

  const ready = await ensureVisionModels()
  if (!ready) return null

  try {
    const { RawImage } = await import('@huggingface/transformers')
    const image = await RawImage.fromURL(imageUrl)
    const inputs = await _processor!(image)
    const { image_embeds } = await _visionModel!(inputs)

    // L2-normalize the embedding so dot product = cosine similarity
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

// Maps colorway names to visual color descriptions CLIP understands
const COLORWAY_COLORS: Record<string, string> = {
  'Chicago': 'red white black',
  'Royal': 'black royal blue',
  'Bred': 'black red',
  'Flu Game': 'black red',
  'Fire Red': 'white red',
  'Carmine': 'white carmine red',
  'Concord': 'white black',
  'Panda': 'white black',
  'Zebra': 'white black striped',
  'White Cement': 'white grey cement',
  'Triple White': 'white',
  'OG Red': 'red white',
  'Infrared': 'white black red infrared',
  'White Green': 'white green',
  'Grey': 'grey',
  'Grey Navy': 'grey navy',
  'Black White': 'black white',
  'Black High Top': 'black',
  'Vintage White': 'white cream vintage',
  'Royal Blue': 'royal blue',
  'Classic White Red': 'white red',
  'Navy White': 'navy white',
  'Pigeon': 'grey beige pigeon',
  'Yurt': 'earth green tan brown',
  'Cloud White / Royal Blue': 'white royal blue',
  'White / White': 'white',
  'White / Green': 'white green',
}

function buildVisualLabel(shoe: Shoe): string {
  const d = shoe.details

  const colors = COLORWAY_COLORS[shoe.colorway] ?? shoe.colorway.toLowerCase()

  const sil = (d?.silhouette ?? '').toLowerCase()
  const height = sil.includes('high') ? 'high-top' : sil.includes('mid') ? 'mid-top' : 'low-top'

  const mat = (d?.material ?? '').toLowerCase()
  const material = mat.includes('canvas')
    ? 'canvas'
    : mat.includes('primeknit') || mat.includes('knit')
    ? 'primeknit knit'
    : mat.includes('suede')
    ? 'suede'
    : mat.includes('leather')
    ? 'leather'
    : 'mesh'

  const brand = shoe.brand.split('/')[0].trim()

  const sport = sil.includes('basketball')
    ? 'basketball'
    : sil.includes('running')
    ? 'running'
    : sil.includes('skate')
    ? 'skate'
    : sil.includes('tennis')
    ? 'tennis'
    : 'lifestyle'

  return `${colors} ${height} ${material} ${brand} ${sport} sneaker`
    .replace(/\s+/g, ' ')
    .trim()
}

export async function recognizeShoe(imageUrl: string): Promise<RecognitionResult | null> {
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

  // ── Primary: image-to-image CLIP similarity ────────────────────────────────
  // Compares the uploaded shoe photo directly against catalog product images.
  // Far more accurate than text label matching because visual features are
  // compared in the same embedding space.
  const queryEmb = await getImageEmbedding(imageUrl)

  if (queryEmb) {
    // Load all catalog embeddings concurrently (cached after first call)
    const catalogShoes = shoes.filter(s => s.image_url)
    await Promise.all(catalogShoes.map(s => getImageEmbedding(s.image_url!)))

    const scored = catalogShoes
      .filter(s => embeddingCache.has(s.image_url!))
      .map(shoe => ({
        shoe: shoe as Shoe,
        score: dotProduct(queryEmb, embeddingCache.get(shoe.image_url!)!),
      }))
      .sort((a, b) => b.score - a.score)

    if (scored.length && scored[0].score >= 0.5) {
      const { shoe, score } = scored[0]
      console.log(`[recognizeShoe] image match: ${shoe.brand} ${shoe.name} (${Math.round(score * 100)}%)`)
      return {
        shoe,
        confidence: Math.round(score * 100),
        caption: buildVisualLabel(shoe),
      }
    }
    console.log('[recognizeShoe] image match below threshold, falling back to text')
  }

  // ── Fallback: zero-shot text classification with visual labels ─────────────
  // Uses descriptive visual labels instead of model names so CLIP has visual
  // language to match against ("red white black high-top leather Nike basketball sneaker").
  const labels = shoes.map(s => buildVisualLabel(s as Shoe))

  try {
    if (!_classifier) _classifier = await loadClassifier()
    const result = (await _classifier(imageUrl, labels)) as Array<{ label: string; score: number }>
    if (!result?.length) return null

    const top = result[0]
    const topIdx = labels.indexOf(top.label)
    if (topIdx === -1) return null

    const topShoe = shoes[topIdx] as Shoe
    const confidence = Math.round(top.score * 100)

    // 28 labels → random baseline ≈ 3.6%; require meaningful signal
    if (confidence < 6) return null

    console.log(`[recognizeShoe] text match: ${topShoe.brand} ${topShoe.name} (${confidence}%)`)
    return { shoe: topShoe, confidence, caption: top.label }
  } catch (err) {
    console.error('[recognizeShoe] zero-shot fallback failed:', err)
    return null
  }
}
