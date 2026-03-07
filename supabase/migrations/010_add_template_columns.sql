-- Migration: 010_add_template_columns
-- Description: Add category and variables columns to document_templates

ALTER TABLE public.document_templates 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'outros',
ADD COLUMN IF NOT EXISTS variables TEXT[] DEFAULT '{}';
