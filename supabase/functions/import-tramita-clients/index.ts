import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// ══════════════════════════════════════════════════════════════
//  CAMINHÃO NA NUVEM — Edge Function: import-tramita-clients
//  Importa clientes da API Tramitação Inteligente e faz upsert
//  na tabela `clients` do Supabase (via service role key).
//
//  Secrets necessários (supabase secrets set ...):
//    SUPABASE_URL              — injetado automaticamente
//    SUPABASE_SERVICE_ROLE_KEY — injetado automaticamente
//    TRAMITA_API_KEY           — Bearer token da API TI
//
//  Ativação: POST /functions/v1/import-tramita-clients
// ══════════════════════════════════════════════════════════════

const TI_BASE_URL = "https://planilha.tramitacaointeligente.com.br/api/v1/clientes";
const BATCH_SIZE = 100;

// ── Tipos ────────────────────────────────────────────────────

interface TiTag {
  nome?: string;
  name?: string;
}

interface TiCliente {
  name?: string;
  cpf?: string;
  cpf_cnpj?: string;
  email?: string;
  email_exclusivo?: string;
  celular?: string;
  phone?: string;
  data_nascimento?: string;
  profissao?: string;
  observacoes?: string;
  endereco?: string;
  address?: string;
  cidade?: string;
  city?: string;
  estado?: string;
  state?: string;
  cep?: string;
  zip_code?: string;
  meu_inss_pass?: string;
  numero_beneficio?: string;
  tags?: TiTag[];
  [key: string]: unknown;
}

// ── 1. Sanitização — strings vazias → null ───────────────────

function sanitizeNulls(
  obj: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key,
      value === "" ? null : value,
    ])
  );
}

// ── 2. Triagem — Determinar área de atuação ──────────────────

function determinarArea(
  tags: TiTag[] = [],
  meuInssPass?: string
): "Cível" | "Previdenciário" | null {
  const tagList = Array.isArray(tags) ? tags : [];
  const temCivel = tagList.some((tag) => {
    const nome = (tag?.nome || tag?.name || "").toLowerCase();
    return nome.includes("cível") || nome.includes("civel");
  });

  if (temCivel) return "Cível";
  if (meuInssPass && String(meuInssPass).trim() !== "") return "Previdenciário";
  return null;
}

// ── 3. Mapeamento De-Para — TI → tabela clients ──────────────

function mapearCliente(tiCliente: TiCliente): Record<string, unknown> {
  const areaDeAtuacao = determinarArea(
    tiCliente.tags,
    tiCliente.meu_inss_pass
  );

  const mapped: Record<string, unknown> = {
    // Identificação
    full_name: tiCliente.name ?? null,
    cpf: tiCliente.cpf ?? tiCliente.cpf_cnpj ?? null,

    // Contato
    email: tiCliente.email ?? null,

    // E-mail exclusivo TI → SEMPRE vai para ti_email_exclusivo
    ti_email_exclusivo: tiCliente.email_exclusivo ?? null,

    // Dados pessoais
    phone: tiCliente.celular ?? tiCliente.phone ?? null,
    data_nascimento: tiCliente.data_nascimento ?? null,
    profissao: tiCliente.profissao ?? null,
    observacoes_processos_anteriores: tiCliente.observacoes ?? null,

    // Localização
    address: tiCliente.endereco ?? tiCliente.address ?? null,
    city: tiCliente.cidade ?? tiCliente.city ?? null,
    state: tiCliente.estado ?? tiCliente.state ?? null,
    zip_code: tiCliente.cep ?? tiCliente.zip_code ?? null,

    // INSS / Previdenciário
    senha_meu_inss: tiCliente.meu_inss_pass ?? null,
    numero_processo_administrativo: tiCliente.numero_beneficio ?? null,

    // Triagem — área de atuação
    area_atuacao: areaDeAtuacao,

    // Status padrão para importações
    status: "prospecto",
  };

  return sanitizeNulls(mapped);
}

// ── 4. Fetch paginado — busca todos os clientes da API TI ────

async function buscarTodosClientes(
  apiKey: string
): Promise<TiCliente[]> {
  const clientes: TiCliente[] = [];
  let paginaAtual = 1;
  let totalPaginas = 1;

  console.log("[IMPORT] Iniciando coleta paginada da API TI...");

  while (paginaAtual <= totalPaginas) {
    const url = `${TI_BASE_URL}?page=${paginaAtual}`;
    console.log(`[IMPORT] Buscando página ${paginaAtual}/${totalPaginas}...`);

    const resposta = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!resposta.ok) {
      const corpo = await resposta.text();
      throw new Error(
        `[TI API] HTTP ${resposta.status} na página ${paginaAtual}: ${corpo}`
      );
    }

    const json = await resposta.json();

    // Suporte a diferentes formatos de resposta
    const registros: TiCliente[] =
      json.data ?? json.clientes ?? json.results ?? [];
    const paginacao = json.pagination ?? json.meta ?? {};
    totalPaginas =
      paginacao.pages ??
      paginacao.last_page ??
      paginacao.total_pages ??
      1;

    clientes.push(...registros);
    console.log(
      `  → ${registros.length} clientes recebidos (acumulado: ${clientes.length})`
    );

    paginaAtual++;
  }

  console.log(`[IMPORT] Coleta concluída. Total: ${clientes.length} clientes.`);
  return clientes;
}

// ── 5. Upsert em lotes — insere/atualiza no Supabase ─────────

async function upsertClientes(
  supabase: ReturnType<typeof createClient>,
  clientesMapeados: Record<string, unknown>[]
): Promise<{ upserted: number; skipped: number; errors: number }> {
  // Filtrar registros sem CPF (chave de conflito obrigatória)
  const validos = clientesMapeados.filter((c) => {
    if (!c.cpf) {
      console.warn(`[DB] Ignorado (sem CPF): ${c.full_name ?? "SEM NOME"}`);
      return false;
    }
    return true;
  });

  const skipped = clientesMapeados.length - validos.length;
  let upserted = 0;
  let errors = 0;

  console.log(
    `\n[DB] Iniciando upsert de ${validos.length} clientes válidos (lotes de ${BATCH_SIZE})...`
  );

  for (let i = 0; i < validos.length; i += BATCH_SIZE) {
    const lote = validos.slice(i, i + BATCH_SIZE);
    const numLote = Math.floor(i / BATCH_SIZE) + 1;

    const { error } = await supabase
      .from("clients")
      .upsert(lote, {
        onConflict: "cpf",
        ignoreDuplicates: false, // atualiza os registros existentes
      });

    if (error) {
      console.error(`[DB] Erro no lote ${numLote}:`, error.message);
      errors += lote.length;
    } else {
      upserted += lote.length;
      console.log(
        `[DB] Lote ${numLote} OK — ${lote.length} registros inseridos/atualizados.`
      );
    }
  }

  return { upserted, skipped, errors };
}

// ── Handler principal ─────────────────────────────────────────

serve(async (req: Request) => {
  // Aceitar apenas POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método não permitido. Use POST." }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  const startedAt = new Date().toISOString();
  console.log(`\n${"═".repeat(56)}`);
  console.log(`  CAMINHÃO NA NUVEM — import-tramita-clients`);
  console.log(`  Iniciado: ${startedAt}`);
  console.log(`${"═".repeat(56)}\n`);

  try {
    // ── Leitura de segredos do cofre ──────────────────────────
    const tramitaApiKey = Deno.env.get("TRAMITA_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!tramitaApiKey || !supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          error:
            "Secrets ausentes. Verifique: TRAMITA_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── Inicializar Supabase com service role (ignora RLS) ────
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // ── 1. Buscar todos os clientes da API TI ─────────────────
    const clientesBrutos = await buscarTodosClientes(tramitaApiKey);

    if (clientesBrutos.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Nenhum cliente retornado pela API TI.",
          summary: { total_api: 0, upserted: 0, skipped: 0, errors: 0 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── 2. Mapeamento + Null Safety ───────────────────────────
    console.log("\n[ALFÂNDEGA] Mapeando e sanitizando clientes...");
    const clientesSaneados = clientesBrutos.map(mapearCliente);
    console.log(`  → ${clientesSaneados.length} clientes mapeados e saneados.`);

    // ── 3. Upsert no Supabase ─────────────────────────────────
    const { upserted, skipped, errors } = await upsertClientes(
      supabase,
      clientesSaneados
    );

    // ── 4. Relatório final ────────────────────────────────────
    const summary = {
      total_api: clientesBrutos.length,
      upserted,
      skipped,
      errors,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    };

    console.log(`\n${"═".repeat(56)}`);
    console.log(`  RELATÓRIO FINAL`);
    console.log(`${"═".repeat(56)}`);
    console.log(`  Total recebidos da API : ${summary.total_api}`);
    console.log(`  Inseridos/Atualizados  : ${summary.upserted}`);
    console.log(`  Ignorados (sem CPF)    : ${summary.skipped}`);
    console.log(`  Erros                  : ${summary.errors}`);
    console.log(`${"═".repeat(56)}\n`);

    return new Response(
      JSON.stringify({ success: errors === 0, summary }),
      {
        status: errors === 0 ? 200 : 207,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[FATAL]", message);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", detail: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
