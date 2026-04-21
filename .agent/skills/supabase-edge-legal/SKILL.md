---
name: supabase-edge-legal
description: Especialista em Edge Functions do Supabase para aplicações jurídicas com foco em segurança, LGPD e autenticação JWT. Use ao criar/modificar Edge Functions do RV-Adv.
---

# Supabase Edge Functions — LegalTech

## Stack
- Deno runtime (Supabase Edge Functions)
- TypeScript
- JWT verification (ES256 JWKS + HS256 legacy)
- Rate limiting (sliding window, in-memory)

## Template de Edge Function

```typescript
import { verifyJWT } from '../_shared/auth';
import { corsHeaders, handleCors } from '../_shared/cors';
import { rateLimit } from '../_shared/rate-limit';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCors();

  try {
    // Rate limiting (públicas)
    const { success } = await rateLimit(req);
    if (!success) {
      return new Response(
        JSON.stringify({ error: 'Muitas requisições. Tente novamente em 60s.' }),
        { status: 429, headers: { ...corsHeaders, 'Retry-After': '60' } }
      );
    }

    // Autenticação (protegidas)
    const user = await verifyJWT(req);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { data, error } = await supabase
      .from('tabela')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;

    return new Response(JSON.stringify({ data }), {
      status: 200, headers: corsHeaders
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
```

## Regras
1. Usar _shared: auth.ts, cors.ts, rate-limit.ts
2. Funções com dados de usuário: SEMPRE verifyJWT
3. Funções públicas: SEMPRE rateLimit + verificação HMAC/webhook
4. Mensagens de erro em português
5. NUNCA logar dados sensíveis (CPF, senhas, tokens)
6. Respostas sempre com corsHeaders
7. NUNCA retornar SERVICE_ROLE_KEY ou segredos

## AI Proxy Pattern
Toda chamada a LLMs DEVE passar pela Edge Function `ai-proxy`:
- Centraliza API keys
- Implementa fallback chain
- Rate limiting por modelo
- Logging de uso (sem dados sensíveis)
