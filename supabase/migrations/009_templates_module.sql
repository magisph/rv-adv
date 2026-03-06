-- Migration: 009_templates_module
-- Description: Create templates and office settings tables, configure storage buckets

-- Create office_settings table
CREATE TABLE IF NOT EXISTS public.office_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    letterhead_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure only one row can exist in office_settings
CREATE UNIQUE INDEX IF NOT EXISTS office_settings_singleton_idx ON public.office_settings ((true));

-- Create document_templates table
CREATE TABLE IF NOT EXISTS public.document_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.office_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- Security rules for office_settings (Requires authenticated user)
CREATE POLICY "Enable read access for all authenticated users" ON public.office_settings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for all authenticated users" ON public.office_settings
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for all authenticated users" ON public.office_settings
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for all authenticated users" ON public.office_settings
    FOR DELETE TO authenticated USING (true);

-- Security rules for document_templates (Requires authenticated user)
CREATE POLICY "Enable read access for all authenticated users" ON public.document_templates
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for all authenticated users" ON public.document_templates
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for all authenticated users" ON public.document_templates
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for all authenticated users" ON public.document_templates
    FOR DELETE TO authenticated USING (true);


-- Configure Storage Buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('document-templates', 'document-templates', false),
  ('client-documents', 'client-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Set up Storage RLS for document-templates
CREATE POLICY "Allow authenticated read access to document-templates"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'document-templates');

CREATE POLICY "Allow authenticated insert access to document-templates"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'document-templates');

CREATE POLICY "Allow authenticated update access to document-templates"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'document-templates');

CREATE POLICY "Allow authenticated delete access to document-templates"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'document-templates');

-- Set up Storage RLS for client-documents
CREATE POLICY "Allow authenticated read access to client-documents"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'client-documents');

CREATE POLICY "Allow authenticated insert access to client-documents"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'client-documents');

CREATE POLICY "Allow authenticated update access to client-documents"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'client-documents');

CREATE POLICY "Allow authenticated delete access to client-documents"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'client-documents');
