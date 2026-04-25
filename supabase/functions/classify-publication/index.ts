import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { authenticateRequest } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { extrairTeorPuro } from "../_shared/textProcessing.ts";

// =============================================================================
// classify-publication — Worker Assíncrono de Classificação Jurídica IA
// =============================================================================
//
// Arquitetura: ativado via trigger pg_net (AFTER INSERT em process_moves)
// ou diretamente via HTTP com service_role JWT (retry manual).
//
// Fluxo:
//   1. Verifica autorização (service_role ou admin/advogado via _shared/auth.ts)
//   2. Busca o teor da movimentação no banco
//   3. Atualiza classification_queue: pending → processing
//   4. Gera embedding (768d) via generate-embedding
//   5. RAG: busca semântica no Ground Truth (match_ground_truth RPC)
//   6. Classificação LLM: Groq Llama 3.1 8B via ai-proxy
//   7. UPDATE em process_moves e deadlines com métricas IA
//   8. Atualiza classification_queue: processing → done
//
// Security:
//   - verify_jwt=false (chamado via pg_net com service_role key)
//   - Valida manualmente via authenticateRequest (service_role ou staff autenticado)
//   - Nunca expõe dados sensíveis em logs
// =============================================================================

interface ClassificacaoIA {
  score_urgencia: "ALTO" | "MÉDIO" | "BAIXO";
  grau_confianca: "ALTA" | "MÉDIA" | "BAIXA";
  eh_fatal: boolean;
  justificativa: string;
}

interface GroundTruthResult {
  id: string;
  regra_juridica: string;
  area: string;
  eh_fatal: boolean;
  score_urgencia: string;
  similarity: number;
}

const FALLBACK_CLASSIFICACAO: ClassificacaoIA = {
  score_urgencia: "MÉDIO",
  grau_confianca: "BAIXA",
  eh_fatal: false,
  justificativa: "Falha na classificação IA — revisão humana obrigatória",
};

// ============================================================================
// Geração de Embedding via generate-embedding
// ============================================================================
async function gerarEmbedding(supabaseUrl: string, serviceKey: string, texto: string): Promise<number[] | null> {
  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/generate-embedding`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
        "apikey": serviceKey,
      },
      body: JSON.stringify({ text: texto }),
    });
    if (!resp.ok) {
      console.error(`[classify-pub] Embedding error: ${resp.status}`);
      return null;
    }
    const data = await resp.json();
    return data?.embedding || data?.data?.[0]?.embedding || null;
  } catch (err) {
    console.error("[classify-pub] Embedding fetch failed:", err);
    return null;
  }
}

// ============================================================================
// Classificação via Groq Llama 3.1 8B através do ai-proxy
// ============================================================================
async function classificarViaLLM(
  supabaseUrl: string,
  serviceKey: string,
  teorPuro: string,
  regrasTop3: GroundTruthResult[]
): Promise<ClassificacaoIA> {
  try {
    const regrasTxt = regrasTop3
      .map((r, i) =>
        `[Regra ${i + 1}] Similaridade: ${(r.similarity * 100).toFixed(1)}%\n` +
        `Área: ${r.area} | Fatal: ${r.eh_fatal ? "SIM" : "NÃO"} | Urgência base: ${r.score_urgencia}\n` +
        `Regra: ${r.regra_juridica}`
      )
      .join("\n\n");

    const systemPrompt = `Você é um classificador jurídico especializado em direito previdenciário e cível brasileiro.
Analise a intimação e as regras de referência para determinar:
1. score_urgencia: ALTO, MÉDIO ou BAIXO
2. grau_confianca: ALTA (similaridade >70%, texto claro), MÉDIA (40-70%), BAIXA (<40% ou ambíguo)
3. eh_fatal: true se o prazo é peremptório (perda do direito se descumprido)

Responda EXCLUSIVAMENTE em JSON válido, sem markdown.`;

    const userPrompt = `TEOR DA INTIMAÇÃO (sanitizado):
${teorPuro}

REGRAS JURÍDICAS DE REFERÊNCIA (Top 3 por similaridade):
${regrasTxt || "Nenhuma regra similar encontrada."}

Retorne JSON:
{
  "score_urgencia": "ALTO" | "MÉDIO" | "BAIXO",
  "grau_confianca": "ALTA" | "MÉDIA" | "BAIXA",
  "eh_fatal": true | false,
  "justificativa": "Explicação (máx 200 chars)"
}`;

    const resp = await fetch(`${supabaseUrl}/functions/v1/ai-proxy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
        "apikey": serviceKey,
      },
      body: JSON.stringify({
        action: "invoke_llm",
        prompt: userPrompt,
        system_prompt: systemPrompt,
        options: {
          model: "llama-3.1-8b-instant", // Groq — latência ~300-600ms
          temperature: 0.1,
          max_tokens: 256,
        },
        response_json_schema: {
          type: "object",
          properties: {
            score_urgencia: { type: "string", enum: ["ALTO", "MÉDIO", "BAIXO"] },
            grau_confianca: { type: "string", enum: ["ALTA", "MÉDIA", "BAIXA"] },
            eh_fatal: { type: "boolean" },
            justificativa: { type: "string" },
          },
          required: ["score_urgencia", "grau_confianca", "eh_fatal"],
        },
      }),
    });

    if (!resp.ok) {
      console.error(`[classify-pub] ai-proxy error: ${resp.status}`);
      return FALLBACK_CLASSIFICACAO;
    }

    const proxyData = await resp.json();
    const resultado = proxyData?.data;

    if (
      resultado &&
      ["ALTO", "MÉDIO", "BAIXO"].includes(resultado.score_urgencia) &&
      ["ALTA", "MÉDIA", "BAIXA"].includes(resultado.grau_confianca) &&
      typeof resultado.eh_fatal === "boolean"
    ) {
      return resultado as ClassificacaoIA;
    }

    console.warn("[classify-pub] LLM response fora do schema:", resultado);
    return FALLBACK_CLASSIFICACAO;
  } catch (err) {
    console.error("[classify-pub] LLM classification failed:", err);
    return FALLBACK_CLASSIFICACAO;
  }
}

// ============================================================================
// Handler Principal
// ============================================================================
serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = { ...getCorsHeaders(origin), "Content-Type": "application/json" };

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), { status: 405, headers });
  }

  // ── Autenticação: aceita service_role (pg_net/trigger) ou staff autenticado ──
  const authPayload = await authenticateRequest(req);

  // Verifica se é service_role (chamada interna do banco via pg_net)
  const isServiceRole = authPayload?.role === "service_role";
  const isStaff = authPayload &&
    authPayload.role === "authenticated" &&
    ["admin", "advogado"].includes((authPayload.app_metadata?.user_role as string) ?? "");

  if (!isServiceRole && !isStaff) {
    console.warn("[classify-pub] Acesso não autorizado. Role:", authPayload?.role);
    return new Response(
      JSON.stringify({ error: "Acesso restrito ao serviço interno ou staff autorizado" }),
      { status: 403, headers }
    );
  }

  try {
    const body = await req.json();
    const { process_move_id, queue_id } = body;

    if (!process_move_id) {
      return new Response(JSON.stringify({ error: "process_move_id obrigatório" }), { status: 400, headers });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    // ── 1. Atualiza fila: pending → processing (evita processamento duplo) ──
    const { error: queueUpdateError } = await supabase
      .from("classification_queue")
      .update({ status: "processing", tentativas: supabase.rpc as unknown as number })
      .eq("process_move_id", process_move_id)
      .eq("status", "pending");

    // Usa upsert direto para incrementar tentativas de forma atômica
    await supabase.rpc("increment_classification_attempts", {
      p_move_id: process_move_id,
    }).catch(() => null); // Não crítico

    if (queueUpdateError) {
      console.warn("[classify-pub] Fila já em processamento ou concluída:", process_move_id);
      return new Response(JSON.stringify({ message: "Já processado ou em processamento" }), { status: 200, headers });
    }

    // ── 2. Busca o teor da movimentação ──
    const { data: move, error: moveError } = await supabase
      .from("process_moves")
      .select("id, description, process_id")
      .eq("id", process_move_id)
      .single();

    if (moveError || !move) {
      console.error("[classify-pub] Movimentação não encontrada:", process_move_id, moveError);
      await supabase
        .from("classification_queue")
        .update({ status: "failed", erro: "Movimentação não encontrada" })
        .eq("process_move_id", process_move_id);
      return new Response(JSON.stringify({ error: "Movimentação não encontrada" }), { status: 404, headers });
    }

    const teorPuro = extrairTeorPuro(move.description || "");
    console.log(`[classify-pub] Classificando move_id=${process_move_id} (${teorPuro.length} chars)`);

    // ── 3. Fallback seguro para teor muito curto ──
    if (teorPuro.length < 20) {
      console.warn("[classify-pub] Teor insuficiente — aplicando fallback HITL");
      await atualizarComClassificacao(supabase, move, FALLBACK_CLASSIFICACAO, true);
      await supabase
        .from("classification_queue")
        .update({ status: "done", processado_em: new Date().toISOString() })
        .eq("process_move_id", process_move_id);
      return new Response(JSON.stringify({ success: true, fallback: true }), { status: 200, headers });
    }

    // ── 4. Geração de Embedding (768d via Gemini) ──
    console.log("[classify-pub] Gerando embedding...");
    const embedding = await gerarEmbedding(supabaseUrl, serviceKey, teorPuro);

    let regrasTop3: GroundTruthResult[] = [];

    if (embedding && embedding.length === 768) {
      // ── 5. RAG: Busca Semântica no Ground Truth ──
      console.log("[classify-pub] Executando RAG (match_ground_truth)...");
      const { data: regras, error: rpcError } = await supabase.rpc("match_ground_truth", {
        query_embedding: embedding,
        match_count: 3,
        filter_area: null,
      });

      if (rpcError) {
        console.error("[classify-pub] Erro no RAG:", rpcError);
      } else {
        regrasTop3 = (regras as GroundTruthResult[]) || [];
        if (regrasTop3.length > 0) {
          console.log(`[classify-pub] RAG: ${regrasTop3.length} regras | melhor=${(regrasTop3[0].similarity * 100).toFixed(1)}%`);
        }
      }
    } else {
      console.warn("[classify-pub] Embedding inválido ou dimensão incorreta");
    }

    // ── 6. Classificação LLM: Groq Llama 3.1 8B ──
    console.log("[classify-pub] Classificando via LLM...");
    const classificacao = await classificarViaLLM(supabaseUrl, serviceKey, teorPuro, regrasTop3);
    console.log(`[classify-pub] Resultado: urgencia=${classificacao.score_urgencia} confiança=${classificacao.grau_confianca} fatal=${classificacao.eh_fatal}`);

    // Regra de negócio HITL: baixa/média confiança → revisão humana obrigatória
    const revisaoHumanaPendente = classificacao.grau_confianca !== "ALTA";

    // ── 7. UPDATE nas tabelas com métricas IA ──
    await atualizarComClassificacao(supabase, move, classificacao, revisaoHumanaPendente);

    // ── 8. Fila: processing → done ──
    await supabase
      .from("classification_queue")
      .update({ status: "done", processado_em: new Date().toISOString() })
      .eq("process_move_id", process_move_id);

    console.log(`[classify-pub] ✅ Concluído: move_id=${process_move_id} HITL=${revisaoHumanaPendente}`);

    return new Response(
      JSON.stringify({
        success: true,
        classificacao: {
          score_urgencia: classificacao.score_urgencia,
          grau_confianca: classificacao.grau_confianca,
          eh_fatal: classificacao.eh_fatal,
          revisao_humana_pendente: revisaoHumanaPendente,
        },
      }),
      { status: 200, headers }
    );

  } catch (error) {
    console.error("[classify-pub] Erro interno:", error);

    // Marca fila como failed para retry
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.process_move_id) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        await supabase
          .from("classification_queue")
          .update({ status: "failed", erro: String(error).substring(0, 500) })
          .eq("process_move_id", body.process_move_id);
      }
    } catch { /* ignora erro no cleanup */ }

    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers });
  }
});

// ============================================================================
// Utilitário: atualiza process_moves e deadlines com métricas IA
// ============================================================================
async function atualizarComClassificacao(
  supabase: ReturnType<typeof createClient>,
  move: { id: string; process_id: string },
  classificacao: ClassificacaoIA,
  revisaoHumanaPendente: boolean
): Promise<void> {
  const prioridade =
    classificacao.score_urgencia === "ALTO" ? "urgente" :
    classificacao.score_urgencia === "MÉDIO" ? "alta" : "media";

  // Atualiza a movimentação (log da classificação)
  const { error: moveUpdateError } = await supabase
    .from("process_moves")
    .update({
      ia_classificacao_at: new Date().toISOString(),
    })
    .eq("id", move.id);

  if (moveUpdateError) {
    console.warn("[classify-pub] Erro ao atualizar process_moves:", moveUpdateError);
  }

  // Atualiza o prazo mais recente do processo com as métricas IA
  const { error: deadlineError } = await supabase
    .from("deadlines")
    .update({
      prioridade,
      eh_fatal: classificacao.eh_fatal,
      score_urgencia: classificacao.score_urgencia,
      grau_confianca: classificacao.grau_confianca,
      revisao_humana_pendente: revisaoHumanaPendente,
      ia_classificacao_at: new Date().toISOString(),
      ia_modelo_usado: "groq-llama-3.1-8b-rag-v2",
    })
    .eq("processo_id", move.process_id)
    .eq("ia_modelo_usado", "aguardando-classify-publication"); // Apenas prazos deste fluxo

  if (deadlineError) {
    console.error("[classify-pub] Erro ao atualizar deadline:", deadlineError);
  }
}
