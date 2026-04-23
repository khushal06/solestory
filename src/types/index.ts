export interface Shoe {
  id: string
  name: string
  brand: string
  colorway: string
  release_year: number
  retail_price: number
  story: string
  details: ShoeDetails
  image_url: string
  tags: string[]
  created_at: string
}

export interface ShoeDetails {
  material: string
  sole: string
  upper: string
  silhouette: string
  weight?: string
  sizes?: string
  technology?: string
}

export interface RecognitionResult {
  shoe: Shoe
  confidence: number
  caption: string
}

export interface MarketPrice {
  platform: string
  price: number
  url: string
  condition: 'new' | 'used' | 'deadstock'
  logo: string
}

export interface PriceData {
  shoe_id: string
  last_updated: string
  prices: MarketPrice[]
  cheapest: MarketPrice
}

export interface NearbyStore {
  id: string
  name: string
  distance_km: number
  address: string
  lat: number
  lon: number
  type: 'sneaker' | 'department' | 'outlet' | 'general'
  maps_url: string
}

export interface ScanState {
  status: 'idle' | 'uploading' | 'analyzing' | 'fetching_prices' | 'fetching_stores' | 'complete' | 'error'
  progress: number
  message: string
}

export interface ScanResult {
  image_url: string
  recognition: RecognitionResult | null
  prices: PriceData | null
  nearby_stores: NearbyStore[]
  error?: string
}
