-- Migration: 013_jurisprudencias_schema
-- Description: Create courts and jurisprudences tables with Full-Text Search

-- 1. Create courts table
CREATE TABLE IF NOT EXISTS public.courts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    acronym TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create jurisprudences table
CREATE TABLE IF NOT EXISTS public.jurisprudences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    court_id UUID REFERENCES public.courts(id) ON DELETE CASCADE,
    process_number TEXT,
    publication_date DATE,
    trial_date DATE,
    excerpt TEXT,
    full_text TEXT,
    relevance_score TEXT,
    fts_vector TSVECTOR,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create function for FTS trigger
CREATE OR REPLACE FUNCTION public.update_jurisprudence_fts()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fts_vector := to_tsvector('portuguese', coalesce(NEW.excerpt, '') || ' ' || coalesce(NEW.full_text, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to intercept inserts/updates
DROP TRIGGER IF EXISTS trg_jurisprudences_fts_update ON public.jurisprudences;
CREATE TRIGGER trg_jurisprudences_fts_update
BEFORE INSERT OR UPDATE OF excerpt, full_text ON public.jurisprudences
FOR EACH ROW
EXECUTE FUNCTION public.update_jurisprudence_fts();

-- 5. Create GIN index for ultra-fast searches
CREATE INDEX IF NOT EXISTS idx_jurisprudences_fts ON public.jurisprudences USING GIN (fts_vector);

-- 6. Enable RLS
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurisprudences ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS Policies for authenticated users
CREATE POLICY "Enable ALL for authenticated users on courts"
ON public.courts
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable ALL for authenticated users on jurisprudences"
ON public.jurisprudences
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);
