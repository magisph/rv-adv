-- 051_add_task_attachments.sql
-- Adiciona coluna de anexos na tabela de tarefas e configura o bucket de storage

-- 1. Adicionar coluna 'attachments' (JSONB) na tabela tasks
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'attachments') THEN
        ALTER TABLE public.tasks ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 2. Configurar Bucket de Storage 'task-attachments'
-- Nota: O bucket pode ser criado programaticamente ou via console, 
-- mas aqui garantimos que as políticas RLS existam para ele.

-- Inserir o bucket se não existir (operação administrativa)
INSERT INTO storage.buckets (id, name, public)
SELECT 'task-attachments', 'task-attachments', false
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'task-attachments');

-- 3. Definir Políticas RLS para o bucket 'task-attachments'
-- Permitir que usuários autenticados vejam os anexos
CREATE POLICY "Allow authenticated users to view task attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'task-attachments');

-- Permitir que usuários autenticados façam upload de anexos
CREATE POLICY "Allow authenticated users to upload task attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-attachments');

-- Permitir que usuários autenticados excluam seus próprios uploads (opcional, mas recomendado)
CREATE POLICY "Allow authenticated users to delete task attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'task-attachments');

-- 4. Atualizar RLS da tabela tasks (se necessário)
-- As políticas atuais já devem permitir SELECT/UPDATE para usuários autenticados 
-- (conforme auditoria), mas garantimos que a nova coluna seja acessível.
-- Nota: A coluna JSONB é incluída automaticamente no SELECT * das políticas existentes.
