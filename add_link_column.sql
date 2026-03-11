-- Adiciona a coluna 'link' à tabela notifications (caso não exista)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;
