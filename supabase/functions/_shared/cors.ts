export const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  // Domain de producao, adicionar se houver var de ambiente (opcional via string split)
];

/**
 * Valida a Origem contra uma whitelist ou variável de ambiente ALLOWED_ORIGIN.
 * @param origin String contendo o header 'Origin' do request
 * @returns Array contendo os headers CORS apropriados e restritivos
 */
export const getCorsHeaders = (origin: string | null) => {
  const envOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [];
  const secureOrigins = new Set([...allowedOrigins, ...envOrigins]);
  
  // Decide se passa o CORS ou refuga devolvendo NULL para string vazia preenchedora 
  // do CORS.
  const isAllowed = origin && secureOrigins.has(origin);
  const allowOrigin = isAllowed ? origin : 'null';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Vary': 'Origin',
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
  };
};
