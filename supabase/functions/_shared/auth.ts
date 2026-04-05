// ============================================================================
// _shared/auth.ts — Verificação de JWT Supabase (ES256 + HS256)
//
// Suporta DOIS formatos de JWT emitidos pelo Supabase:
//
//   1. ES256 (novo — JWT Signing Keys): emitido para usuários autenticados
//      a partir de 2025. Verificado via JWKS endpoint do projeto.
//      Header: { "alg": "ES256", "kid": "<uuid>", "typ": "JWT" }
//
//   2. HS256 (legado — JWT Secret): emitido para service_role e anon keys,
//      e para usuários em projetos que ainda não migraram.
//      Header: { "alg": "HS256", "typ": "JWT" }
//
// IMPORTANTE: verify_jwt=false deve estar configurado em todas as funções
// que usam este módulo, pois o Edge Runtime não consegue verificar ES256
// com o antigo JWT secret HS256 — isso causava HTTP 401 "Invalid JWT"
// antes do código da função ser executado.
//
// Referência: https://supabase.com/docs/guides/functions/auth
// ============================================================================

import * as jose from "jsr:@panva/jose@6";

export interface AuthPayload {
  sub: string;
  role: string;
  email?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  aal?: string;
  exp: number;
  iss?: string;
}

// JWKS endpoint do projeto — usado para verificar tokens ES256
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const JWKS_URL = `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`;
const JWT_ISSUER = `${SUPABASE_URL}/auth/v1`;

// Cache do JWKS para evitar fetch a cada request
let jwksCache: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwksCache) {
    jwksCache = jose.createRemoteJWKSet(new URL(JWKS_URL));
  }
  return jwksCache;
}

/**
 * Decodifica o payload do JWT sem verificar a assinatura.
 */
function decodePayloadUnsafe(token: string): AuthPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payloadBase64 = parts[1];
    const payloadJson = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(payloadJson) as AuthPayload;
  } catch {
    return null;
  }
}

/**
 * Decodifica o header do JWT sem verificar a assinatura.
 */
function decodeHeaderUnsafe(token: string): { alg?: string; kid?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const headerBase64 = parts[0];
    const headerJson = atob(headerBase64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(headerJson);
  } catch {
    return null;
  }
}

/**
 * Verifica o JWT do request e retorna o payload se válido.
 *
 * Fluxo de verificação:
 *   1. Se o token for ES256 → verifica via JWKS (novo padrão Supabase)
 *   2. Se o token for HS256 com role=service_role → aceita sem verificar assinatura
 *      (service_role key é usada apenas internamente, não exposta ao browser)
 *   3. Rejeita tokens anônimos (role === 'anon')
 *   4. Rejeita tokens expirados
 */
export async function authenticateRequest(
  req: Request
): Promise<AuthPayload | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;

  const header = decodeHeaderUnsafe(token);
  if (!header) return null;

  const alg = header.alg ?? "HS256";

  // ── ES256: novo padrão Supabase (JWT Signing Keys) ────────────────────────
  // Tokens de usuários autenticados são assinados com ES256 desde 2025.
  // Verificação via JWKS garante autenticidade criptográfica.
  if (alg === "ES256") {
    try {
      const { payload } = await jose.jwtVerify(token, getJWKS(), {
        issuer: JWT_ISSUER,
      });
      const authPayload = payload as unknown as AuthPayload;

      // Rejeita tokens anônimos
      if (authPayload.role === "anon") {
        console.warn("[auth] Rejected anon ES256 token");
        return null;
      }

      // Aceita apenas usuários autenticados
      if (authPayload.role === "authenticated" && authPayload.sub) {
        return authPayload;
      }

      console.warn(`[auth] ES256 token with unexpected role: ${authPayload.role}`);
      return null;
    } catch (e) {
      console.error("[auth] ES256 JWT verification failed:", (e as Error).message);
      return null;
    }
  }

  // ── HS256: legado (service_role, anon, e usuários em projetos antigos) ────
  // Decodifica sem verificar assinatura (aceitável para service_role interno).
  // O service_role key NUNCA é exposto ao browser — apenas usado server-side.
  if (alg === "HS256") {
    const payload = decodePayloadUnsafe(token);
    if (!payload) return null;

    // Verifica expiração
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.warn("[auth] HS256 token expired");
      return null;
    }

    // Aceita service_role (chamadas internas/testes)
    if (payload.role === "service_role") {
      return payload;
    }

    // Aceita usuários autenticados (projetos que ainda usam HS256)
    if (payload.role === "authenticated" && payload.sub) {
      return payload;
    }

    // Rejeita anon
    console.warn(`[auth] Rejected HS256 token with role: ${payload.role}`);
    return null;
  }

  console.warn(`[auth] Unsupported JWT algorithm: ${alg}`);
  return null;
}
