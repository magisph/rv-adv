-- 1. Adicionar coluna email_inss na tabela clients
ALTER TABLE clients ADD COLUMN email_inss TEXT UNIQUE;

-- 2. Criar a nova tabela para armazenar os e-mails recebidos
CREATE TABLE client_inss_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    sender_address TEXT,
    subject TEXT,
    body_text TEXT,
    extracted_date TIMESTAMPTZ,
    extracted_location TEXT,
    status TEXT CHECK (status IN ('pendente', 'processado', 'erro')) DEFAULT 'pendente',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Habilitar o Row Level Security (RLS)
ALTER TABLE client_inss_emails ENABLE ROW LEVEL SECURITY;

-- 4. Criar política de segurança (ALL para authenticated)
CREATE POLICY "Allow full access for authenticated users on client_inss_emails"
ON client_inss_emails
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Criar índice para buscas rápidas
CREATE INDEX idx_client_inss_emails_client_id ON client_inss_emails(client_id);
