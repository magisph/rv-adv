# Workflow: Deploy de Edge Function

## Gatilho
Criação ou modificação de Edge Function em `supabase/functions/`

## Passos

1. **Desenvolvimento Local** (Agente: Dev)
   - Usar Supabase CLI: `supabase functions serve`
   - Testar com `supabase test db` + curl local

2. **Deploy** (Agente: DevOps)
   - Automático via push para `master` (GitHub Actions)
   - Ou manual: `supabase functions deploy <nome> [--no-verify-jwt]` (apenas públicas)

3. **Verificação Pós-Deploy**
   - Supabase Dashboard → Edge Functions → Logs
   - Testar chamada real com JWT válido
   - Verificar rate limiting (se público)
   - Verificar CORS (origens permitidas)

## Funções com JWT obrigatório (ES256 JWKS)
- ai-proxy, chat-jurisprudencia, generate-embedding
- scrape-tnu, import-tramita-clients
- ocr-classify-document, sync-google-calendar, delete-google-calendar

## Funções SEM JWT (públicas com rate limit)
- djen-bypass, datajud-bypass
- ti-webhook-receiver (HMAC), inss-webhook (validação origem)
