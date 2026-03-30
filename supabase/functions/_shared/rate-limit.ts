import { getCorsHeaders } from "./cors.ts";

/**
 * Limitador de taxa em memória (Isolate scoped)
 */
const rateLimits = new Map<string, { count: number; expiresAt: number }>();

/**
 * Valida o rate limit e retorna a Response de Erro HTTP 429 se exceder o limite.
 * Retorna null se for permitido prosseguir.
 */
export function enforceRateLimit(req: Request, origin: string | null = null, maxRequests: number = 5): Response | null {
  const clientIp = req.headers.get("x-forwarded-for") || "unknown";
  const now = Date.now();
  const windowMs = 60000; // 1 minuto
  const limit = rateLimits.get(clientIp);

  const corsHeaders = getCorsHeaders(origin);

  if (limit && now < limit.expiresAt) {
    if (limit.count >= maxRequests) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-RateLimit-Limit": maxRequests.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": Math.ceil(limit.expiresAt / 1000).toString(),
        },
      });
    }
    limit.count++;
  } else {
    rateLimits.set(clientIp, { count: 1, expiresAt: now + windowMs });
  }

  return null;
}

/**
 * Recupera os headers padrão do Rate Limit para incluir na Response de sucesso/erro comum
 */
export function getRateLimitHeaders(req: Request, maxRequests: number = 5): Record<string, string> {
  const clientIp = req.headers.get("x-forwarded-for") || "unknown";
  const limit = rateLimits.get(clientIp);
  const now = Date.now();
  
  const remaining = limit && now < limit.expiresAt ? Math.max(0, maxRequests - limit.count) : maxRequests;
  const resetTime = limit && now < limit.expiresAt ? Math.ceil(limit.expiresAt / 1000) : Math.ceil((now + 60000) / 1000);
  
  return {
    "X-RateLimit-Limit": maxRequests.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": resetTime.toString(),
  };
}
