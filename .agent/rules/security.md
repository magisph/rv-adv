# Security Rules

## Hard Rules
- Nunca expor segredos (.env, API keys, tokens) no client-side ou em logs.
- Chaves de LLM (Gemini, OpenRouter, DeepSeek) residem EXCLUSIVAMENTE no Supabase Vault.
- Edge Functions de webhook DEVEM validar assinatura HMAC-SHA256.
- Politicas de RLS seguem o padrao FAIL-CLOSE: negar tudo por padrao, permitir explicitamente.
- Nunca usar `service_role` em funcoes acessiveis por clientes autenticados.
- O campo `user_role` no JWT e a autoridade maxima. Nao adicionar bypass.

## Prohibited Patterns
- `SUPABASE_SERVICE_ROLE_KEY` em codigo client-side
- `FOR ALL` em politicas RLS sem restricoes granulares
- `eval()`, `new Function()`, ou `innerHTML` com dados de usuario
- Credenciais hardcodadas em qualquer arquivo versionado

## Validation Checklist
Antes de mergear codigo que toque em seguranca:
1. `pnpm security` passa sem falhas
2. Nenhum segredo novo exposto
3. RLS testado com ambos papeis (admin, secretary)
4. Edge Functions com webhook validam HMAC
