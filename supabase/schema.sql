-- SoleStory Database Schema
-- Paste this entire file into Supabase SQL Editor and click Run

-- ─────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- Shoes catalog
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shoes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  brand         text        NOT NULL,
  colorway      text,
  release_year  integer,
  retail_price  integer,
  story         text,
  details       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  image_url     text,
  embedding     vector(384),
  tags          text[]      NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ivfflat index: required for <=> cosine similarity at scale
-- lists = 50 is appropriate for up to ~50k rows; increase for larger catalogs
CREATE INDEX IF NOT EXISTS shoes_embedding_idx
  ON shoes USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- ─────────────────────────────────────────
-- Scans — one row per user upload
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scans (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        REFERENCES auth.users ON DELETE SET NULL,
  shoe_id       uuid        REFERENCES shoes(id)  ON DELETE SET NULL,
  image_url     text        NOT NULL,
  caption       text,                        -- BLIP-generated caption for debugging
  confidence    integer,                     -- 0–100 similarity score
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scans_user_id_idx ON scans(user_id);
CREATE INDEX IF NOT EXISTS scans_shoe_id_idx ON scans(shoe_id);

-- ─────────────────────────────────────────
-- pgvector similarity search function
-- Called from /api/recognize with the MiniLM embedding of the BLIP caption
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION match_shoes(
  query_embedding  vector(384),
  match_threshold  float   DEFAULT 0.45,
  match_count      integer DEFAULT 3
)
RETURNS TABLE (
  id           uuid,
  name         text,
  brand        text,
  colorway     text,
  release_year integer,
  retail_price integer,
  story        text,
  details      jsonb,
  image_url    text,
  tags         text[],
  created_at   timestamptz,
  similarity   float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    name,
    brand,
    colorway,
    release_year,
    retail_price,
    story,
    details,
    image_url,
    tags,
    created_at,
    1 - (embedding <=> query_embedding) AS similarity
  FROM shoes
  WHERE embedding IS NOT NULL
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ─────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────
ALTER TABLE shoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- Shoes: anyone can read, only service role can write
CREATE POLICY "shoes_public_read"
  ON shoes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "shoes_service_write"
  ON shoes FOR ALL
  TO service_role
  USING (true);

-- Scans: anyone can insert (anonymous scans allowed in MVP)
--        only the owner can read their own scans
CREATE POLICY "scans_public_insert"
  ON scans FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "scans_owner_select"
  ON scans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "scans_service_all"
  ON scans FOR ALL
  TO service_role
  USING (true);

-- ─────────────────────────────────────────
-- Storage bucket  (run once, safe to re-run)
-- ─────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shoe-uploads',
  'shoe-uploads',
  true,
  10485760,                              -- 10 MB
  ARRAY['image/jpeg','image/png','image/webp','image/heic','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload to the bucket
CREATE POLICY "shoe_uploads_public_insert"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'shoe-uploads');

-- Allow anyone to read from the bucket (needed for BLIP to fetch the image)
CREATE POLICY "shoe_uploads_public_select"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'shoe-uploads');
