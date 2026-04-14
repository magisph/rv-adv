-- Add client_id column to pericias table
ALTER TABLE public.pericias
ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE RESTRICT;

-- Attempt to link existing pericias to clients by CPF
UPDATE public.pericias p
SET client_id = c.id
FROM public.clients c
WHERE regexp_replace(p.cpf, '\D', '', 'g') = regexp_replace(c.cpf_cnpj, '\D', '', 'g');

-- We won't automatically create new clients for unmatched pericias right now
-- because creating clients might require more fields or logic (like area_atuacao etc)
-- Unmatched pericias will just have client_id = NULL for now,
-- which administrators can manually link or clean up later.

-- Do NOT make client_id NOT NULL yet to allow backwards compatibility testing
-- ALTER TABLE public.pericias ALTER COLUMN client_id SET NOT NULL;
