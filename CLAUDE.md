# SoleStory — Project Memory

## Project Name
SoleStory

## Product Overview
AI-powered shoe recognition and price intelligence app. User uploads or photographs a shoe — the system identifies it, surfaces its full history and product details, shows current market prices, and finds nearby stores using geolocation. Zero friction, mobile-first, premium UX.

## Target Users
- Sneakerheads who spot a shoe in the wild and need to identify it
- Casual shoppers comparing prices before buying
- Resellers checking market value before flipping
- Collectors researching release history and authenticity context

## Value Proposition
One flow: see a shoe → know everything about it → buy it at the best price → find it near you. No competitor combines AI recognition + price aggregation + local store discovery in one seamless experience.

## Core Features (Full Vision)
- Image upload or camera capture
- AI shoe identification: name, brand, colorway, release year, retail price, story, product details
- Current market price comparison across marketplaces (cheapest highlighted)
- Nearby shoe stores via geolocation
- Scan history (logged-in users)
- Price alerts
- Save / wishlist
- Social sharing

## MVP Scope (v1 — Build This First)

### IN scope:
- Homepage with hero CTA (Upload / Take Photo)
- Image upload + camera capture (mobile)
- Supabase Storage upload
- AI shoe recognition pipeline:
  - BLIP image captioning (HuggingFace Inference API)
  - MiniLM text embedding (HuggingFace Inference API)
  - pgvector cosine similarity search against shoe catalog
- Results page showing: shoe image, name, brand, release year, retail price, story, product details
- Market price display (mocked v1, structured for real API swap)
- Nearby shoe stores via Overpass API (OpenStreetMap — free, no key needed)
- Mobile-first, premium dark UI

### NOT in v1:
- User auth, accounts, scan history
- Price alerts or notifications
- Wishlists / saving
- Social / sharing
- Multi-shoe comparison
- AR try-on
- Real-time live price scraping

## Tech Stack

### Frontend
- Framework: Next.js 14 (App Router)
- Language: TypeScript
- Styling: Tailwind CSS + shadcn/ui
- Animation: Framer Motion
- Icons: Lucide React
- Image handling: next/image

### Backend
- Next.js API Routes (serverless functions)
- All backend logic lives in `src/app/api/`

### Database
- Supabase (PostgreSQL)
- pgvector extension enabled (for shoe embedding similarity search)
- Supabase Storage (for uploaded shoe images)
- Tables: `shoes` (catalog), `scans` (future)

### AI Layer
- BLIP image captioning: `Salesforce/blip-image-captioning-large` via HuggingFace Inference API
- Text embeddings: `sentence-transformers/all-MiniLM-L6-v2` via HuggingFace Inference API
- Both are open-source models, free tier on HuggingFace
- NO paid AI APIs (no OpenAI, no Gemini, no Claude API)

### External Integrations
- HuggingFace Inference API (free, open-source models)
- Overpass API / OpenStreetMap (nearby stores, free, no key needed)
- Price data: mocked in v1, structure ready for RapidAPI Sneaker DB or SerpAPI

### Deployment
- Vercel (frontend + API routes)
- Supabase (hosted PostgreSQL + storage)

## System Architecture Overview

```
User (Browser/Mobile)
      │
      ▼
Next.js Frontend (Vercel)
      │
      ├─► Supabase Storage (image upload)
      │
      ├─► /api/recognize → HuggingFace (BLIP + MiniLM) → Supabase pgvector search
      │
      ├─► /api/prices → Mock data (v1) / Real API (v2)
      │
      └─► /api/nearby-stores → Overpass API (OpenStreetMap)
```

## Database Overview

### Table: `shoes` (catalog — seeded manually)
```sql
id              uuid PRIMARY KEY
name            text NOT NULL          -- "Air Jordan 1 Retro High OG"
brand           text NOT NULL          -- "Nike / Jordan Brand"
colorway        text                   -- "Chicago"
release_year    integer                -- 1985
retail_price    integer                -- 160 (USD)
story           text                   -- full narrative/history
details         jsonb                  -- { material, sole, upper, sizes, weight }
image_url       text                   -- canonical product image
embedding       vector(384)            -- MiniLM embedding of name+brand+colorway
tags            text[]                 -- ["basketball", "retro", "og"]
created_at      timestamptz DEFAULT now()
```

### Table: `scans` (future — v2)
```sql
id              uuid PRIMARY KEY
user_id         uuid REFERENCES auth.users
shoe_id         uuid REFERENCES shoes
image_url       text
created_at      timestamptz DEFAULT now()
```

### Supabase Storage
- Bucket: `shoe-uploads` (public)
- Stores user-uploaded images for AI processing

## AI System Overview

### Recognition Pipeline
1. User uploads image → stored in Supabase Storage
2. `/api/recognize` receives the public image URL
3. BLIP model generates a text caption from the image
   - Input: image URL
   - Output: "a pair of red and white nike air jordan 1 high top sneakers"
4. MiniLM converts caption to 384-dim vector embedding
5. pgvector cosine similarity search finds closest match in `shoes` table
6. Return top match (or "not found" if similarity < threshold)

### Key decisions
- BLIP → MiniLM pipeline chosen over raw CLIP because:
  - Better shoe-specific language understanding
  - More debuggable (caption is human-readable)
  - Works well with text-based catalog matching
- Similarity threshold: 0.75 (tunable)
- Return top 3 candidates, display top 1 with confidence

## Data Flow (Step by Step)

```
1. User selects or photographs shoe on homepage
2. Image sent to Supabase Storage → returns public_url
3. public_url sent to POST /api/recognize
4. BLIP generates caption from image
5. MiniLM converts caption to vector
6. Supabase pgvector: SELECT * FROM shoes ORDER BY embedding <=> $vector LIMIT 3
7. Top result returned as identified shoe
8. Frontend renders: image, name, brand, year, retail price, story, details
9. POST /api/prices?shoe_id=X → returns market prices array
10. Frontend renders price comparison table, highlights cheapest
11. Browser requests geolocation permission
12. Coords sent to GET /api/nearby-stores?lat=X&lon=Y
13. Overpass API returns shoe stores within 10km radius
14. Frontend renders store list with distance + map link
```

## Design & UX Direction

- **Theme**: Dark background (#0a0a0a), white text, accent: electric blue (#3b82f6) or sneaker gold (#f59e0b)
- **Feel**: Premium, minimal, editorial — think Nike SNKRS app meets a luxury magazine
- **Mobile-first**: All layouts designed for 375px+ first, then responsive to desktop
- **Typography**: Inter or Geist (clean, modern)
- **Animations**: Framer Motion — smooth page transitions, loading states, card reveals
- **Image treatment**: Full-bleed hero images, subtle shadows, clean product cards
- **No clutter**: One action per screen, progressive disclosure of information
- **Loading states**: Animated scanning effect while AI processes (not a spinner — make it feel alive)

## Engineering Rules

1. **No paid AI APIs** — only HuggingFace Inference API free tier (open-source models)
2. **Supabase only** for database, auth, and storage
3. **TypeScript everywhere** — no `any` types
4. **Mobile-first CSS** — write for 375px, scale up
5. **No over-engineering** — no complex abstractions until needed
6. **API routes stay thin** — business logic in `src/lib/`
7. **Environment variables** — all secrets in `.env.local`, never hardcoded
8. **Error boundaries** — all async operations have user-friendly fallbacks
9. **Mock clearly labeled** — any mocked data marked with `// MOCK — replace in v2`
10. **Seed data** lives in `src/lib/data/seed-shoes.ts`

## Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
HUGGINGFACE_API_TOKEN=        # Free at huggingface.co
```

## Current Build Phase
**Phase 1 — MVP**
- [ ] Next.js project scaffold
- [ ] Supabase schema + pgvector setup
- [ ] Shoe catalog seed data (200 shoes)
- [ ] AI recognition pipeline
- [ ] Homepage UI
- [ ] Upload + scan flow
- [ ] Results page
- [ ] Price display (mocked)
- [ ] Nearby stores
- [ ] Mobile polish + animations

## Next Steps (v2 — After MVP)
- Supabase Auth (email + Google OAuth)
- Scan history per user
- Live price data via Sneaker Database API (RapidAPI free tier)
- Price alerts via Supabase Edge Functions + email
- Wishlist / saved shoes
- Expand catalog to 1000+ shoes
- Self-hosted AI model on Hugging Face Spaces (eliminate cold starts)
