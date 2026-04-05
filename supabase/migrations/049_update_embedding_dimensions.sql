-- Migration 049: Update embedding column from 768 to 3072 dimensions
-- Reason: The correct Gemini model is gemini-embedding-001 which produces 3072-dim vectors,
--         not the deprecated embedding-001 (768 dims) originally specified.
-- Skill: supabase-postgres-best-practices

-- 1. Drop the existing HNSW index (cannot ALTER a vector column with an index)
DROP INDEX IF EXISTS public.jurisprudences_embedding_hnsw_idx;

-- 2. Drop the FTS search function that references the old embedding type
DROP FUNCTION IF EXISTS public.buscar_jurisprudencia(vector, float, int);

-- 3. Alter the embedding column to 3072 dimensions
-- Note: existing NULL embeddings are unaffected; non-NULL would need re-embedding
ALTER TABLE public.jurisprudences
  ALTER COLUMN embedding TYPE vector(3072)
  USING embedding::text::vector(3072);

-- 4. Recreate the HNSW index for 3072-dim vectors
-- m=16, ef_construction=64 are good defaults for this dimensionality
CREATE INDEX jurisprudences_embedding_hnsw_idx
  ON public.jurisprudences
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
  WHERE embedding IS NOT NULL;

-- 5. Recreate the semantic search RPC with the correct 3072-dim signature
CREATE OR REPLACE FUNCTION public.buscar_jurisprudencia(
  query_embedding   vector(3072),
  similarity_thresh float DEFAULT 0.7,
  max_results       int   DEFAULT 10
)
RETURNS TABLE (
  id               uuid,
  process_number   text,
  court            text,
  rapporteur       text,
  trial_date       date,
  summary          text,
  full_text        text,
  pdf_url          text,
  tags             text[],
  similarity        float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    j.id,
    j.process_number,
    j.court,
    j.rapporteur,
    j.trial_date,
    j.summary,
    j.full_text,
    j.pdf_url,
    j.tags,
    1 - (j.embedding <=> query_embedding) AS similarity
  FROM public.jurisprudences j
  WHERE
    j.embedding IS NOT NULL
    AND 1 - (j.embedding <=> query_embedding) >= similarity_thresh
  ORDER BY j.embedding <=> query_embedding
  LIMIT max_results;
$$;

GRANT EXECUTE ON FUNCTION public.buscar_jurisprudencia(vector(3072), float, int)
  TO authenticated;

COMMENT ON FUNCTION public.buscar_jurisprudencia IS
  'Semantic search on jurisprudences using cosine similarity. Uses gemini-embedding-001 (3072 dims).';
