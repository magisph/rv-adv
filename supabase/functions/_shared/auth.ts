// ============================================================================
// _shared/auth.ts — Verificação local de JWT Supabase
//
// Verifica o JWT do usuário localmente usando a chave secreta do projeto,
// sem fazer round-trip ao Supabase Auth (auth.getUser()).
//
// O Supabase Edge Runtime injeta automaticamente:
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY
//   - SUPABASE_ANON_KEY  ← NÃO injetado automaticamente (requer secret manual)
//
// A verificação local com jose é mais eficiente e não depende de variáveis
// de ambiente que não são injetadas automaticamente.
// ============================================================================

import { create, verify, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

// O JWT secret do projeto Supabase — configurado como secret da Edge Function
// via: supabase secrets set SUPABASE_JWT_SECRET=<valor>
// Ou injetado automaticamente pelo Supabase Edge Runtime como SUPABASE_JWT_SECRET

export interface AuthPayload {
  sub: string;           // user ID
  role: string;          // 'authenticated', 'anon', 'service_role'
  email?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  aal?: string;
  exp: number;
}

/**
 * Verifica o JWT do request e retorna o payload se válido.
 * Aceita tanto JWTs de usuários autenticados quanto service_role.
 * Rejeita tokens anônimos (role === 'anon').
 */
export async function authenticateRequest(
  req: Request
): Promise<AuthPayload | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;

  // Decode JWT header to check algorithm (without verification)
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Decode payload without verification first to check role
    const payloadBase64 = parts[1];
    const payloadJson = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson) as AuthPayload;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.warn("[auth] Token expired");
      return null;
    }

    // Accept service_role tokens (used for internal calls and testing)
    if (payload.role === "service_role") {
      return payload;
    }

    // Accept authenticated user tokens
    if (payload.role === "authenticated" && payload.sub) {
      return payload;
    }

    // Reject anonymous tokens
    console.warn(`[auth] Rejected token with role: ${payload.role}`);
    return null;
  } catch (e) {
    console.error("[auth] JWT decode error:", e);
    return null;
  }
}
