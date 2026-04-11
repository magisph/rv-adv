-- 056_add_diversos_category.sql
-- Adiciona a categoria 'diversos' ao CHECK constraint da tabela documents
-- E garante que o bucket 'client-documents' aceite arquivos .docx

-- 1. Atualizar o CHECK constraint da tabela documents
ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_category_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_category_check
  CHECK (category = ANY (ARRAY[
    'pessoais'::text,
    'inss'::text,
    'medicos'::text,
    'judicial'::text,
    'rurais'::text,
    'analises'::text,
    'outros'::text,
    'comprovacao'::text,
    'diversos'::text
  ]));

-- 2. Atualizar a configuração do bucket 'client-documents' no Supabase Storage
-- Adiciona suporte explícito a .docx (MIME: application/vnd.openxmlformats-officedocument.wordprocessingml.document)
-- Além dos tipos já suportados (PDF, imagens, etc)
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
WHERE id = 'client-documents';

-- Nota: Se o bucket for público ou privado, as políticas RLS existentes 
-- (definidas em migrações anteriores como 009) já devem permitir o acesso.
