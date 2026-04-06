-- Migration 050: Adiciona categoria 'comprovacao' ao CHECK constraint da tabela documents
--
-- Contexto:
--   O módulo de documentos para clientes Cíveis exibe a categoria 'Comprovação'
--   (key: 'comprovacao') no componente ClientDocumentsSection.jsx.
--   Porém o CHECK constraint original não incluía 'comprovacao', causando falha
--   silenciosa (violação de constraint) ao tentar fazer upload de documentos
--   nessa categoria para clientes Cíveis.
--
-- Correção:
--   Recria o CHECK constraint incluindo 'comprovacao' na lista de valores permitidos.

ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_category_check;

ALTER TABLE documents
  ADD CONSTRAINT documents_category_check
  CHECK (category = ANY (ARRAY[
    'pessoais'::text,
    'inss'::text,
    'medicos'::text,
    'judicial'::text,
    'rurais'::text,
    'analises'::text,
    'outros'::text,
    'comprovacao'::text
  ]));
