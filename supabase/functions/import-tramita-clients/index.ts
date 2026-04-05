import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getCorsHeaders } from "../_shared/cors.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";

// ============================================================================
// Edge Function: import-tramita-clients
// Descrição: Importa clientes da API da Tramitação Inteligente para o Supabase.
//            Enterprise Mode (cloud), substituindo o script local legado.
//
// Segurança:
//   - Rate Limiting: 3 req/min por IP (via _shared/rate-limit.ts)
//   - DUAL AUTH: AUTHORIZED_API_KEY (scripts) OU JWT + supabase.auth.getUser()
//   - Autenticação API externa via TRAMITA_API_KEY (Vault)
//   - Upsert idempotente via cpf_cnpj (UNIQUE constraint)
//   - Service Role Key para bypass de RLS (modo admin)
//   - Null Safety: todas as strings vazias convertidas para null
//   - Timeout de 30s por requisição à API externa
//   - Filtra somente CPFs (11 dígitos numéricos)
//   - Batch upsert em chunks de 100 registros
//
// Rota: POST /import-tramita-clients
// ============================================================================

/** Número máximo de páginas para iterar (circuit breaker) */
const MAX_PAGES = 100;

/** Timeout para chamadas à API externa em milissegundos */
const FETCH_TIMEOUT_MS = 30_000;

/** Tamanho máximo do batch para upsert (evita payload gigante) */
const UPSERT_BATCH_SIZE = 100;

// ---------------------------------------------------------------------------
// Utilitários de Saneamento (Null Safety)
// ---------------------------------------------------------------------------

/**
 * Converte string vazia ("") para null. Retorna o valor original se não for
 * string vazia. Garante Null Safety rigorosa no payload antes do upsert.
 */
function sanitize(value: unknown): unknown {
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}

/**
 * Aplica sanitização recursiva em todas as propriedades de um objeto.
 * Strings vazias viram null, arrays e tipos primitivos são preservados.
 */
function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      result[key] = sanitize(value);
    }
  }
  return result as T;
}

// ---------------------------------------------------------------------------
// Validação de CPF (Peneira Matemática)
// ---------------------------------------------------------------------------

/**
 * Valida se o documento é um CPF (somente 11 dígitos numéricos).
 * Remove TODA formatação (pontos, traços, barras) antes de contar.
 * Rejeita CNPJs (14 dígitos) e formatos inválidos matemática e deterministicamente.
 */
function isCpf(doc: string | null | undefined): boolean {
  if (!doc) return false;
  const digits = doc.replace(/\D/g, "");
  return digits.length === 11;
}

/**
 * Remove formatação do CPF, mantendo somente dígitos.
 */
function normalizeCpf(doc: string): string {
  return doc.replace(/\D/g, "");
}

// ---------------------------------------------------------------------------
// Triagem Inteligente — Área de Atuação
// ---------------------------------------------------------------------------

/**
 * Determina a área de atuação baseado nas tags do cliente TI.
 *   - Se tags conterem referência a "cível" → "Cível"
 *   - Default → "Previdenciário"
 */
function resolveAreaAtuacao(
  tags: string | string[] | null | undefined
): string {
  const tagList: string[] = Array.isArray(tags)
    ? tags
    : typeof tags === "string" && tags.trim() !== ""
      ? tags.split(",").map((t: string) => t.trim().toLowerCase())
      : [];

  const isCivel = tagList.some(
    (tag) =>
      tag.includes("cível") ||
      tag.includes("civel") ||
      tag.includes("civil")
  );

  return isCivel ? "Cível" : "Previdenciário";
}

// ---------------------------------------------------------------------------
// Interface de contrato do payload da API externa
// ---------------------------------------------------------------------------

interface TramitaClient {
  name?: string;
  nome?: string;
  cpf_cnpj?: string;
  cpf?: string;
  email?: string;
  email_exclusivo?: string;
  telefone?: string;
  phone?: string;
  endereco?: string;
  address?: string;
  cidade?: string;
  city?: string;
  estado?: string;
  state?: string;
  cep?: string;
  zip_code?: string;
  data_nascimento?: string;
  rg?: string;
  orgao_expedidor?: string;
  profissao?: string;
  estado_civil?: string;
  tags?: string | string[];
  meu_inss_pass?: string;
  observacoes?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Mapeamento: API TI → Schema public.clients
// ---------------------------------------------------------------------------

/**
 * Mapeia um cliente da Tramitação Inteligente para o schema public.clients.
 * Aplica Null Safety recursiva em todos os campos.
 *
 * Campos mapeados (De → Para):
 *   name           → full_name
 *   cpf_cnpj       → cpf_cnpj (somente dígitos)
 *   email_exclusivo → ti_email_exclusivo (OBRIGATÓRIO)
 *   tags           → area_atuacao (via resolveAreaAtuacao)
 */
function mapToClient(
  ti: TramitaClient,
  systemUserId: string
): Record<string, unknown> {
  const cpfCnpj = normalizeCpf(ti.cpf_cnpj || ti.cpf || "");
  const areaAtuacao = resolveAreaAtuacao(ti.tags);

  const mapped: Record<string, unknown> = {
    full_name: ti.name || ti.nome || null,
    cpf_cnpj: cpfCnpj,
    email: ti.email || null,
    ti_email_exclusivo: ti.email_exclusivo || null,
    phone: ti.telefone || ti.phone || null,
    address: ti.endereco || ti.address || null,
    city: ti.cidade || ti.city || null,
    state: ti.estado || ti.state || null,
    zip_code: ti.cep || ti.zip_code || null,
    data_nascimento: ti.data_nascimento || null,
    rg: ti.rg || null,
    orgao_expedidor: ti.orgao_expedidor || null,
    profissao: ti.profissao || null,
    estado_civil: ti.estado_civil || null,
    senha_meu_inss: ti.meu_inss_pass || null,
    area_atuacao: areaAtuacao,
    observations: ti.observacoes || null,
    status: "ativo",
    created_by: systemUserId,
  };

  // Null Safety final: qualquer "" residual vira null
  return sanitizeObject(mapped);
}

// ---------------------------------------------------------------------------
// Fetch com timeout (AbortController nativo Deno)
// ---------------------------------------------------------------------------

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// Logging estruturado
// ---------------------------------------------------------------------------

function log(level: "INFO" | "WARN" | "ERROR", message: string, data?: Record<string, unknown>): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function: "import-tramita-clients",
    message,
    ...data,
  };
  if (level === "ERROR") {
    console.error(JSON.stringify(entry));
  } else if (level === "WARN") {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  // -- CORS Preflight --
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // -- Somente POST --
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método não permitido. Use POST." }),
      { status: 405, headers }
    );
  }

  // -- Rate Limiting: 3 req/min --
  const rateLimitResponse = enforceRateLimit(req, origin, 3);
  if (rateLimitResponse) return rateLimitResponse;

  // ========================================================================
  // 1. Validação de variáveis de ambiente (Vault)
  // ========================================================================
  const tramitaApiKey = Deno.env.get("TRAMITA_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authorizedKey = Deno.env.get("AUTHORIZED_API_KEY");

  if (!tramitaApiKey) {
    log("ERROR", "TRAMITA_API_KEY não configurada no Vault.");
    return new Response(
      JSON.stringify({ error: "Configuração de API ausente." }),
      { status: 500, headers }
    );
  }
  if (!supabaseUrl || !supabaseServiceKey) {
    log("ERROR", "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes.");
    return new Response(
      JSON.stringify({ error: "Configuração do Supabase ausente." }),
      { status: 500, headers }
    );
  }

  // ========================================================================
  // 2. DUAL AUTHENTICATION: AUTHORIZED_API_KEY OU JWT (com RLS)
  //    
  //    Implementa autenticação dual conforme best practices Supabase:
  //    - Caminho 1: API Key (AUTHORIZED_API_KEY) → Modo admin/bypass RLS
  //    - Caminho 2: JWT + supabase.auth.getUser() → Modo usuário c/ RLS
  //
  //    IMPORTANTE: Segue rigorosamente a skill supabase-postgres-best-practices
  //    (Security & RLS - security-rls-basics.md)
  // ========================================================================
  const callerApiKey = req.headers.get("apikey") ||
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    req.headers.get("Authorization")?.replace("Bearer ", "");
  
  const authHeader = req.headers.get("authorization") || 
                     req.headers.get("Authorization") || "";

  // Track de qual modo de autenticação foi usado
  let authMode: "api_key" | "jwt" | null = null;
  let authenticatedUserId: string | null = null;
  let supabaseClient: ReturnType<typeof createClient>;
  let systemUserId: string;

  // -------------------------------------------------------------------------
  // Caminho 1: Autenticação via API Key (scripts automáticos)
  // -------------------------------------------------------------------------
  if (authorizedKey && callerApiKey === authorizedKey) {
    authMode = "api_key";
    log("INFO", "Autenticação via API Key autorizada.", {
      hasAuthorizedKey: !!authorizedKey,
    });
    
    // Modo admin: usa service role para bypass de RLS
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve usuário admin para created_by
    const { data: adminUser, error: adminError } = await supabaseClient
      .from("users")
      .select("auth_id")
      .in("role", ["admin", "dono"])
      .limit(1)
      .single();

    if (adminError || !adminUser?.auth_id) {
      log("ERROR", "Falha ao resolver admin/dono user.", {
        detail: adminError?.message,
      });
      return new Response(
        JSON.stringify({ error: "Sem usuário admin/dono para atribuir created_by." }),
        { status: 500, headers }
      );
    }
    systemUserId = adminUser.auth_id;
  } 
  // -------------------------------------------------------------------------
  // Caminho 2: Autenticação via JWT (usuários autenticados com RLS)
  // -------------------------------------------------------------------------
  else if (authHeader.startsWith("Bearer ") && supabaseAnonKey) {
    try {
      // Extrai o token JWT do header Authorization
      const jwtToken = authHeader.replace("Bearer ", "");

      // Cria cliente auth para validar o JWT
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      // Valida o JWT usando supabase.auth.getUser() - método oficial Supabase
      const { data: userData, error: authError } = await authClient.auth.getUser(jwtToken);

      if (authError || !userData?.user) {
        log("WARN", "JWT inválido ou expirado.", {
          error: authError?.message,
          ip: req.headers.get("x-forwarded-for") ?? "unknown",
        });
        return new Response(
          JSON.stringify({ error: "Token JWT inválido ou expirado." }),
          { status: 401, headers }
        );
      }

      // JWT válido: autenticação bem-sucedida
      authMode = "jwt";
      authenticatedUserId = userData.user.id;
      
      log("INFO", "Autenticação via JWT bem-sucedida.", {
        userId: authenticatedUserId,
        email: userData.user.email,
      });

      // Modo usuário: cria cliente com o JWT do usuário (respecta RLS)
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
        },
      });

      // Usa o usuário autenticado como created_by
      if (!authenticatedUserId) {
        log("ERROR", "JWT válido mas sem user ID.");
        return new Response(
          JSON.stringify({ error: "Erro ao identificar usuário autenticado." }),
          { status: 500, headers }
        );
      }
      systemUserId = authenticatedUserId;
    } catch (jwtError) {
      log("ERROR", "Erro ao processar JWT.", {
        error: jwtError instanceof Error ? jwtError.message : String(jwtError),
      });
      return new Response(
        JSON.stringify({ error: "Erro ao validar token JWT." }),
        { status: 401, headers }
      );
    }
  }
  // -------------------------------------------------------------------------
  // Nenhuma autenticação válida
  // -------------------------------------------------------------------------
  else {
    log("WARN", "Tentativa de acesso sem autenticação válida.", {
      hasCallerApiKey: !!callerApiKey,
      hasAuthorizedKey: !!authorizedKey,
      hasAuthHeader: !!authHeader,
      ip: req.headers.get("x-forwarded-for") ?? "unknown",
    });
    return new Response(
      JSON.stringify({ error: "Não autorizado. Forneça AUTHORIZED_API_KEY ou token JWT válido." }),
      { status: 401, headers }
    );
  }

  log("INFO", "Autenticação Dual Auth concluída.", {
    authMode,
    authenticatedUserId,
    systemUserId,
  });

  // ========================================================================
  // 3. Itera páginas da API Tramitação Inteligente
  // ========================================================================
  const baseUrl = "https://app.tramitacaointeligente.com.br/api/v1/clientes";
  let currentPage = 1;
  let totalImported = 0;
  let totalSkipped = 0;
  let totalPages = 0;
  const errors: Array<{ page: number; cpf?: string; error: string }> = [];

  log("INFO", "Iniciando importação de clientes TI.");

  try {
    while (currentPage <= MAX_PAGES) {
      const url = `${baseUrl}?page=${currentPage}`;

      let response: Response;
      try {
        response = await fetchWithTimeout(
          url,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${tramitaApiKey}`,
              Accept: "application/json",
            },
          },
          FETCH_TIMEOUT_MS
        );
      } catch (fetchErr) {
        const errMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        if (errMsg.includes("aborted")) {
          log("ERROR", `Timeout na página ${currentPage}.`, { timeoutMs: FETCH_TIMEOUT_MS });
          errors.push({ page: currentPage, error: `Timeout após ${FETCH_TIMEOUT_MS}ms` });
        } else {
          log("ERROR", `Erro de rede na página ${currentPage}.`, { detail: errMsg });
          errors.push({ page: currentPage, error: errMsg });
        }
        break;
      }

      if (!response.ok) {
        const statusText = `HTTP ${response.status}: ${response.statusText}`;
        log("ERROR", `API retornou erro na página ${currentPage}.`, { status: statusText });
        errors.push({ page: currentPage, error: statusText });
        break;
      }

      const body = await response.json();

      // A API pode retornar { data: [...], meta: { last_page } } ou array direto
      const clients: TramitaClient[] = Array.isArray(body)
        ? body
        : Array.isArray(body?.data)
          ? body.data
          : [];

      if (body?.meta?.last_page) {
        totalPages = body.meta.last_page;
      }

      // Página vazia = fim da paginação
      if (clients.length === 0) {
        log("INFO", `Página ${currentPage} vazia. Fim da paginação.`);
        break;
      }

      log("INFO", `Página ${currentPage}: ${clients.length} clientes recebidos.`);

      // ==================================================================
      // 4. PENEIRA CPFs: somente 11 dígitos numéricos passam
      // ==================================================================
      const cpfClients = clients.filter((c) => isCpf(c.cpf_cnpj || c.cpf));
      const skippedThisPage = clients.length - cpfClients.length;
      totalSkipped += skippedThisPage;

      if (skippedThisPage > 0) {
        log("INFO", `Página ${currentPage}: ${skippedThisPage} CNPJs/inválidos descartados.`);
      }

      if (cpfClients.length === 0) {
        log("INFO", `Página ${currentPage}: 0 CPFs válidos. Pulando.`);
        currentPage++;
        continue;
      }

      const mappedClients = cpfClients.map((c) => mapToClient(c, systemUserId));

      // ==================================================================
      // 5. Upsert idempotente em batches via cpf_cnpj
      // ==================================================================
      for (let i = 0; i < mappedClients.length; i += UPSERT_BATCH_SIZE) {
        const batch = mappedClients.slice(i, i + UPSERT_BATCH_SIZE);

        const { data: upsertData, error: upsertError } = await supabaseClient
          .from("clients")
          .upsert(batch, {
            onConflict: "cpf_cnpj",
            ignoreDuplicates: false,
          })
          .select("id");

        if (upsertError) {
          log("ERROR", `Erro no upsert da página ${currentPage}, batch ${Math.floor(i / UPSERT_BATCH_SIZE) + 1}.`, {
            detail: upsertError.message,
          });
          errors.push({ page: currentPage, error: upsertError.message });
        } else {
          const count = upsertData?.length ?? 0;
          totalImported += count;
        }
      }

      log("INFO", `Página ${currentPage}: processamento concluído.`, {
        imported: totalImported,
      });

      // Se a API informou total de páginas e já chegamos ao fim
      if (totalPages > 0 && currentPage >= totalPages) {
        log("INFO", `Última página (${totalPages}) processada.`);
        break;
      }

      currentPage++;
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log("ERROR", "Erro fatal durante importação.", { detail: errMsg });
    return new Response(
      JSON.stringify({
        error: "Erro interno durante importação.",
        detail: errMsg,
        partial_results: { imported: totalImported, skipped: totalSkipped },
      }),
      { status: 500, headers }
    );
  }

  // ========================================================================
  // 6. Relatório Final
  // ========================================================================
  const report = {
    success: errors.length === 0,
    summary: {
      total_imported: totalImported,
      total_skipped_cnpj: totalSkipped,
      pages_processed: currentPage - 1,
      errors_count: errors.length,
    },
    errors: errors.length > 0 ? errors : undefined,
  };

  log("INFO", "Importação finalizada.", report.summary as unknown as Record<string, unknown>);

  return new Response(JSON.stringify(report), {
    status: errors.length > 0 && totalImported === 0 ? 502 : 200,
    headers,
  });
});
