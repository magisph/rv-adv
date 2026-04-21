# Supabase Patterns & Conventions

## Edge Functions
- Local: supabase/functions/<nome>/index.ts
- Compartilhar _shared/auth.ts (JWKS ES256) e _shared/cors.ts
- Funcoes publicas (sem JWT): djen-bypass, datajud-bypass, ai-proxy,
  generate-embedding, chat-jurisprudencia, ocr-classify-document,
  scrape-tnu, sync-google-calendar, delete-google-calendar
- Funcoes protegidas (JWT required): ti-webhook-receiver, inss-webhook,
  import-tramita-clients
- Rate limiting via _shared/rate-limit.ts para funcoes publicas

## Database Migrations
- Diretorio: supabase/migrations/
- Numeracao: sequencial com timestamp (ex: 20260415000000_fix_rls.sql)
- Nunca deletar migracoes existentes. Criar novas para correcoes.
- Toda mudanca de schema exige migracao correspondente.

## RLS Patterns
- Ler user_role do JWT: auth.jwt() ->> 'user_role'
- Padrao: CREATE POLICY ... FOR SELECT USING (auth.jwt() ->> 'user_role' IN ('admin','secretary'))
- Tabelas financeiras: acesso restrito a 'admin' e 'financeiro'
- Tabelas de documentos: proprietario ou admin pode acessar

## Query Patterns
- Transacoes multi-tabela: sempre usar try/catch com rollback
- Upserts: usar onConflict para prevenir race conditions
- JSONB fields: validar com Zod no client-side antes de insert
- Paginacao: usar .range(from, to) do Supabase client