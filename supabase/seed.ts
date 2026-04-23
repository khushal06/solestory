/**
 * Seed the shoes catalog.
 * Run: npx ts-node --esm supabase/seed.ts
 *
 * With the CLIP pipeline, shoe matching is done at query time (no pre-stored embeddings needed).
 * This script just inserts the shoe catalog rows.
 */

import { createClient } from '@supabase/supabase-js'
import { SEED_SHOES } from '../src/lib/data/seed-shoes'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log(`Seeding ${SEED_SHOES.length} shoes into Supabase…\n`)

  for (const shoe of SEED_SHOES) {
    const { error } = await supabase.from('shoes').insert(shoe)
    if (error) {
      console.error(`  ✗ ${shoe.name}:`, error.message)
    } else {
      console.log(`  ✓ ${shoe.brand} — ${shoe.name}`)
    }
  }

  console.log('\nDone. No embeddings needed — recognition uses CLIP at query time.')
}

main().catch(console.error)
