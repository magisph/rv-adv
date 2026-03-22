-- Migration: 035_add_area_civel.sql
-- Description: Adiciona as colunas necessárias para suportar a área Cível na tabela clients, sem quebrar a estrutura Previdenciária legada.

ALTER TABLE IF EXISTS clients
ADD COLUMN IF NOT EXISTS area_atuacao TEXT DEFAULT 'Previdenciário' CHECK (area_atuacao IN ('Previdenciário', 'Cível')),
ADD COLUMN IF NOT EXISTS dados_civeis JSONB DEFAULT '{}'::jsonb;
