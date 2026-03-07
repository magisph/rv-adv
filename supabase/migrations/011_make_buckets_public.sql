-- Migration: 011_make_buckets_public
-- Description: Make document-templates and client-documents buckets public

UPDATE storage.buckets 
SET public = true 
WHERE id IN ('document-templates', 'client-documents');
