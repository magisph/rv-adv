-- Migração: 071_jurisprudencia_trf5
-- Autor: Antigravity
-- Data: 2026-04-30

BEGIN;

-- 1. Habilitar extensão pgvector (se não existir)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Criar tabela jurisprudencia_trf5
CREATE TABLE IF NOT EXISTS public.jurisprudencia_trf5 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  process_number TEXT UNIQUE NOT NULL,
  trial_date DATE NOT NULL,
  relator TEXT NOT NULL,
  orgao_julgador TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  source TEXT DEFAULT 'trf5' NOT NULL,
  jurisdicao TEXT DEFAULT 'CE' NOT NULL,
  embedding vector(768),
  is_unique_teor BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Habilitar RLS
ALTER TABLE public.jurisprudencia_trf5 ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS (Fail-Close - apenas authenticated)
CREATE POLICY "authenticated_select_jurisprudencia_trf5"
  ON public.jurisprudencia_trf5
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_insert_jurisprudencia_trf5"
  ON public.jurisprudencia_trf5
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_update_jurisprudencia_trf5"
  ON public.jurisprudencia_trf5
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "authenticated_delete_jurisprudencia_trf5"
  ON public.jurisprudencia_trf5
  FOR DELETE
  TO authenticated
  USING (true);

-- 5. Índices
-- HNSW index para busca de similaridade (Cosine distance)
CREATE INDEX IF NOT EXISTS idx_jurisprudencia_trf5_embedding
  ON public.jurisprudencia_trf5 USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
  WHERE embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jurisprudencia_trf5_trial_date
  ON public.jurisprudencia_trf5 (trial_date DESC);

-- 6. Função RPC para verificar e inserir (Deduplicação)
CREATE OR REPLACE FUNCTION public.verificar_inserir_jurisprudencia_trf5(
  p_process_number TEXT,
  p_trial_date DATE,
  p_relator TEXT,
  p_orgao_julgador TEXT,
  p_excerpt TEXT,
  p_embedding vector(768),
  p_similarity_threshold FLOAT DEFAULT 0.85
)
RETURNS TABLE (
  inserted_id UUID,
  was_unique BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_unique BOOLEAN := true;
  v_new_id UUID;
  v_existing_process UUID;
BEGIN
  -- Checar duplicação exata pelo número do processo
  SELECT id INTO v_existing_process
  FROM public.jurisprudencia_trf5
  WHERE process_number = p_process_number;

  IF v_existing_process IS NOT NULL THEN
    -- Se já existe, apenas atualizamos e retornamos (upsert lógico)
    -- Mas como process_number é UNIQUE, não queremos violar.
    -- Vamos assumir que process_number duplicado = unique false
    v_is_unique := false;
    UPDATE public.jurisprudencia_trf5
    SET trial_date = p_trial_date,
        relator = p_relator,
        orgao_julgador = p_orgao_julgador,
        excerpt = p_excerpt,
        embedding = p_embedding,
        is_unique_teor = v_is_unique
    WHERE id = v_existing_process
    RETURNING id INTO v_new_id;
    
    RETURN QUERY SELECT v_new_id, v_is_unique;
    RETURN;
  END IF;

  -- Checar similaridade semântica
  IF p_embedding IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.jurisprudencia_trf5
      WHERE embedding IS NOT NULL
        AND (1 - (embedding <=> p_embedding)) >= p_similarity_threshold
    ) THEN
      v_is_unique := false;
    END IF;
  END IF;

  -- Inserir novo registro
  INSERT INTO public.jurisprudencia_trf5 (
    process_number,
    trial_date,
    relator,
    orgao_julgador,
    excerpt,
    embedding,
    is_unique_teor
  ) VALUES (
    p_process_number,
    p_trial_date,
    p_relator,
    p_orgao_julgador,
    p_excerpt,
    p_embedding,
    v_is_unique
  ) RETURNING id INTO v_new_id;

  RETURN QUERY SELECT v_new_id, v_is_unique;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verificar_inserir_jurisprudencia_trf5 TO authenticated;

COMMIT;
