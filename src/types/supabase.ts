export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      shoes: {
        Row: {
          id: string
          name: string
          brand: string
          colorway: string | null
          release_year: number | null
          retail_price: number | null
          story: string | null
          details: Json
          image_url: string | null
          embedding: number[] | null
          tags: string[]
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['shoes']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['shoes']['Insert']>
      }
      scans: {
        Row: {
          id: string
          user_id: string | null
          shoe_id: string | null
          image_url: string
          caption: string | null
          confidence: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['scans']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['scans']['Insert']>
      }
    }
    Functions: {
      match_shoes: {
        Args: {
          query_embedding: number[]
          match_threshold?: number
          match_count?: number
        }
        Returns: Array<
          Database['public']['Tables']['shoes']['Row'] & { similarity: number }
        >
      }
    }
  }
}
