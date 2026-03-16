-- Migration 026: Add JSONB columns to beneficios_bpc_idoso for new Portaria 34/2025 guidelines

ALTER TABLE beneficios_bpc_idoso 
ADD COLUMN IF NOT EXISTS triagem_elegibilidade JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS cif_pcd JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS renda_detalhada JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS estrategia_conclusao JSONB DEFAULT '{}'::jsonb;
