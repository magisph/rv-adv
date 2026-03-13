CREATE TABLE IF NOT EXISTS public.atendimentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_contato TEXT NOT NULL,
    telefone TEXT,
    categoria TEXT CHECK (categoria IN ('Prospecto', 'Cliente', 'Parceria', 'Outros')) DEFAULT 'Prospecto',
    assunto TEXT NOT NULL,
    detalhes TEXT,
    status TEXT CHECK (status IN ('Pendente', 'Resolvido', 'Convertido')) DEFAULT 'Pendente',
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow ALL for authenticated users" 
ON public.atendimentos 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
