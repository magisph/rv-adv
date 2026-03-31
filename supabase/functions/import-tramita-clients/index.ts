import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getCorsHeaders } from "../_shared/cors.ts";

// ============================================================================
// Edge Function: import-tramita-clients
// Descrição: Importa clientes da API da Tramitação Inteligente para o Supabase.
//            Roda como Enterprise Mode (cloud), substituindo o script local.
//
// Segurança:
//   - Autenticação via TRAMITA_API_KEY (Deno.env / Vault)
//   - Upsert idempotente via cpf_cnpj (UNIQUE constraint)
//   - Service Role Key para bypass de RLS
//   - Null Safety: todas as strings vazias convertidas para null
//   - Timeout de 30s por requisição à API externa
//   - Filtra somente CPFs (11 dígitos numéricos)
//
// Rota: POST /import-tramita-clients
// ============================================================================

/** Número máximo de páginas para iterar (circuit breaker) */
const MAX_PAGES = 100;

/** Timeout para chamadas à API externa em milissegundos */
const FETCH_TIMEOUT_MS = 30_000;

/**
 * Converte string vazia ("") para null. Retorna o valor original se não for string vazia.
 * Garante Null Safety rigorosa no payload antes do upsert.
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

/**
 * Valida se o documento é um CPF (somente 11 dígitos numéricos).
 * Rejeita CNPJs e formatos inválidos.
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

/**
 * Determina a área de atuação baseado nas tags e meu_inss_pass do cliente TI.
 * Triagem Inteligente:
 *   - Se tags conterem referência a "cível" → "Cível"
 *   - Se meu_inss_pass estiver preenchido → "Previdenciário"
 *   - Default → "Previdenciário"
 */
function resolveAreaAtuacao(
  tags: string | string[] | null | undefined,
  meuInssPass: string | null | undefined
): string {
  // Normaliza tags para array
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

  if (isCivel) return "Cível";

  // Se tem senha do INSS, confirma como Previdenciário
  // Default: Previdenciário
  return "Previdenciário";
}

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

/**
 * Mapeia um cliente da Tramitação Inteligente para o schema public.clients.
 * Aplica Null Safety em todos os campos.
 */
function mapToClient(
  ti: TramitaClient,
  systemUserId: string
): Record<string, unknown> {
  const cpfCnpj = normalizeCpf(ti.cpf_cnpj || ti.cpf || "");
  const areaAtuacao = resolveAreaAtuacao(ti.tags, ti.meu_inss_pass);

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
    updated_at: new Date().toISOString(),
  };

  // Null Safety final: qualquer "" residual vira null
  return sanitizeObject(mapped);
}

/**
 * Fetch com timeout usando AbortController (Deno nativo).
 */
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

serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Somente POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método não permitido. Use POST." }),
      { status: 405, headers }
    );
  }

  // ========================================================================
  // 1. Validação de variáveis de ambiente
  // ========================================================================
  const tramitaApiKey = Deno.env.get("TRAMITA_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!tramitaApiKey) {
    console.error("[Import TI] TRAMITA_API_KEY não configurada no Vault.");
    return new Response(
      JSON.stringify({ error: "Configuração de API ausente." }),
      { status: 500, headers }
    );
  }
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[Import TI] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes.");
    return new Response(
      JSON.stringify({ error: "Configuração do Supabase ausente." }),
      { status: 500, headers }
    );
  }

  // ========================================================================
  // 2. Inicializa Supabase com Service Role (ignora RLS)
  // ========================================================================
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // ========================================================================
  // 3. Resolve o system user para created_by (NOT NULL constraint)
  // ========================================================================
  const { data: adminUser, error: adminError } = await supabase
    .from("users")
    .select("auth_id")
    .in("role", ["admin", "dono"])
    .limit(1)
    .single();

  if (adminError || !adminUser?.auth_id) {
    console.error("[Import TI] Falha ao resolver admin/dono user:", adminError);
    return new Response(
      JSON.stringify({ error: "Sem usuário admin/dono para atribuir created_by." }),
      { status: 500, headers }
    );
  }
  const systemUserId: string = adminUser.auth_id;

  // ========================================================================
  // 4. Itera páginas da API Tramitação Inteligente
  // ========================================================================
  const baseUrl = "https://app.tramitacaointeligente.com.br/api/v1/clientes";
  let currentPage = 1;
  let totalImported = 0;
  let totalSkipped = 0;
  let totalPages = 0;
  const errors: Array<{ page: number; cpf?: string; error: string }> = [];

  console.log("[Import TI] Iniciando importação...");

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
          console.error(`[Import TI] Timeout na página ${currentPage} (>${FETCH_TIMEOUT_MS}ms)`);
          errors.push({ page: currentPage, error: `Timeout após ${FETCH_TIMEOUT_MS}ms` });
        } else {
          console.error(`[Import TI] Erro de rede na página ${currentPage}:`, errMsg);
          errors.push({ page: currentPage, error: errMsg });
        }
        break;
      }

      if (!response.ok) {
        const statusText = `HTTP ${response.status}: ${response.statusText}`;
        console.error(`[Import TI] API retornou erro na página ${currentPage}: ${statusText}`);
        errors.push({ page: currentPage, error: statusText });
        break;
      }

      const body = await response.json();

      // A API pode retornar { data: [...], meta: { last_page, current_page } }
      // ou diretamente um array. Suportamos ambos os formatos.
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
        console.log(`[Import TI] Página ${currentPage} vazia. Fim da paginação.`);
        break;
      }

      console.log(`[Import TI] Página ${currentPage}: ${clients.length} clientes recebidos.`);

      // ====================================================================
      // 5. Filtra CPFs e mapeia para schema do Supabase
      // ====================================================================
      const cpfClients = clients.filter((c) => isCpf(c.cpf_cnpj || c.cpf));
      totalSkipped += clients.length - cpfClients.length;

      if (cpfClients.length === 0) {
        console.log(`[Import TI] Página ${currentPage}: 0 CPFs válidos. Pulando.`);
        currentPage++;
        continue;
      }

      const mappedClients = cpfClients.map((c) => mapToClient(c, systemUserId));

      // ====================================================================
      // 6. Upsert idempotente via cpf_cnpj (risk-zero de duplicidade)
      // ====================================================================
      const { data: upsertData, error: upsertError } = await supabase
        .from("clients")
        .upsert(mappedClients, {
          onConflict: "cpf_cnpj",
          ignoreDuplicates: false,
        })
        .select("id");

      if (upsertError) {
        console.error(
          `[Import TI] Erro no upsert da página ${currentPage}:`,
          upsertError.message
        );
        errors.push({ page: currentPage, error: upsertError.message });
      } else {
        const count = upsertData?.length ?? 0;
        totalImported += count;
        console.log(`[Import TI] Página ${currentPage}: ${count} clientes upserted.`);
      }

      // Se a API informou total de páginas e já chegamos ao fim, para
      if (totalPages > 0 && currentPage >= totalPages) {
        console.log(`[Import TI] Última página (${totalPages}) processada.`);
        break;
      }

      currentPage++;
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[Import TI] Erro fatal durante importação:", errMsg);
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
  // 7. Relatório Final
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

  console.log("[Import TI] Importação finalizada:", JSON.stringify(report.summary));

  return new Response(JSON.stringify(report), {
    status: errors.length > 0 && totalImported === 0 ? 502 : 200,
    headers,
  });
});
