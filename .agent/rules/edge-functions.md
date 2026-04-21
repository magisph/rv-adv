# Rule: Padrão de Edge Functions

## Estrutura Obrigatória

```
supabase/functions/<nome>/
└── index.ts
```

## Template Base

```typescript
import { verifyJWT } from '../_shared/auth';
import { corsHeaders, handleCors } from '../_shared/cors';
import { rateLimit } from '../_shared/rate-limit';

Deno.serve(async (req) => {
  // 1. CORS preflight
  if (req.method === 'OPTIONS') return handleCors();

  try {
    // 2. Rate limiting (funções públicas)
    const { success, remaining } = await rateLimit(req);
    if (!success) {
      return new Response(JSON.stringify({ error: 'Muitas requisições' }), {
        status: 429,
        headers: { ...corsHeaders, 'Retry-After': '60' }
      });
    }

    // 3. Autenticação (funções protegidas)
    const user = await verifyJWT(req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: corsHeaders
      });
    }

    // 4. Lógica de negócio
    // ...

    return new Response(JSON.stringify({ data: result }), {
      status: 200, headers: corsHeaders
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: corsHeaders
    });
  }
});
```

## Regras
- Usar SEMPRE `_shared/auth.ts`, `_shared/cors.ts`, `_shared/rate-limit.ts`
- Linguagem: TypeScript
- Erros: mensagens em português
- Respostas: sempre JSON com `corsHeaders`
- Logging: `console.error()` para erros, NUNCA logar dados sensíveis
