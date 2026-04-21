# Workflow: Migração de Banco de Dados

## Gatilho
Necessidade de criar, alterar ou remover tabelas, colunas ou políticas RLS

## Passos

1. **Planejar** (Agente: Data Engineer)
   - Listar todas as alterações necessárias
   - Verificar dependências (views, triggers, outras tabelas)
   - Planejar RLS para cada tabela

2. **Criar Migração** (Agente: Dev)
   - Numerar arquivo sequencialmente: `NNN_descricao.sql`
   - Diretório: `supabase/migrations/`
   - SEMPRE incluir:
     - CREATE TABLE com constraints
     - ALTER TABLE (se modificação)
     - ENABLE ROW LEVEL SECURITY (se nova tabela)
     - CREATE POLICY para cada role
     - CREATE INDEX para colunas frequentemente consultadas

3. **Validar Localmente** (Agente: QA)
   - Aplicar migração local: `supabase db push`
   - Testar queries com cada role
   - Verificar que dados existentes não são afetados

4. **Deploy**
   - Push para master → Supabase CLI aplica automaticamente
   - Verificar no Dashboard que migração foi aplicada
   - Executar `scripts/054_atendimentos_rls_verification.sql` se aplicável

## Template de Migração

```sql
-- Migração: <descrição>
-- Autor: <nome>
-- Data: <data>

BEGIN;

-- 1. Criar tabela
CREATE TABLE IF NOT EXISTS nova_tabela (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE nova_tabela ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS
CREATE POLICY "admin_full_access" ON nova_tabela
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "advogado_full_access" ON nova_tabela
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'advogado')
  );

CREATE POLICY "user_own_data" ON nova_tabela
  FOR ALL USING (user_id = auth.uid());

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_nova_tabela_user_id ON nova_tabela(user_id);

-- 5. Trigger de updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER nova_tabela_updated_at
  BEFORE UPDATE ON nova_tabela
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMIT;
```
