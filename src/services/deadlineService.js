import { BaseService } from "./baseService";
import { supabase } from "@/lib/supabase";

/**
 * DeadlineService — Serviço especializado para prazos jurídicos
 * 
 * Estende o BaseService com operações específicas do Motor Híbrido de
 * Classificação IA e fluxo Human-in-the-Loop (HITL).
 * 
 * @example
 * // Aprovar classificação IA manualmente (HITL)
 * await deadlineService.approveDeadline("uuid-do-prazo");
 * 
 * // Listar prazos aguardando revisão humana
 * const pendentes = await deadlineService.listPendingHITL();
 */
class DeadlineService extends BaseService {
  constructor() {
    super("deadlines");
  }

  /**
   * Lista prazos com filtros por status e revisão HITL pendente.
   * 
   * @param {Object} options - Opções de filtro
   * @param {boolean} [options.apenasHITL=false] - Se true, retorna apenas prazos com revisão pendente
   * @param {string} [options.status] - Filtrar por status ('pendente', 'cumprido', 'cancelado')
   * @param {string} [options.processoId] - Filtrar por processo específico
   * @returns {Promise<Array>} Lista de prazos
   */
  async listPrazos({ apenasHITL = false, status = null, processoId = null } = {}) {
    let query = supabase
      .from("deadlines")
      .select("*")
      .order("due_date", { ascending: true });

    if (apenasHITL) {
      query = query.eq("revisao_humana_pendente", true);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (processoId) {
      query = query.eq("processo_id", processoId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  /**
   * Aprova a classificação IA de um prazo (ação HITL).
   * Reseta revisao_humana_pendente para false, liberando o prazo
   * para integrar a fila de prazos sem bloqueio HITL.
   * 
   * ⚠️ SEGURANÇA: Esta ação só deve ser chamada por Advogado/Admin.
   *    A validação de role é feita via RLS no banco de dados.
   * 
   * @param {string} id - UUID do prazo a aprovar
   * @returns {Promise<Object>} Prazo atualizado
   * @throws {Error} Se o prazo não for encontrado ou sem permissão
   */
  async approveDeadline(id) {
    if (!id) throw new Error("ID do prazo é obrigatório para aprovação HITL");

    const { data, error } = await supabase
      .from("deadlines")
      .update({ revisao_humana_pendente: false })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Reclassifica manualmente um prazo (override da IA pelo usuário).
   * Atualiza os campos de classificação e aprova o HITL simultaneamente.
   * 
   * @param {string} id - UUID do prazo
   * @param {Object} classificacao - Novos valores de classificação
   * @param {string} classificacao.score_urgencia - 'ALTO' | 'MÉDIO' | 'BAIXO'
   * @param {boolean} classificacao.eh_fatal - Se o prazo é peremptório
   * @returns {Promise<Object>} Prazo atualizado
   */
  async reclassificarManual(id, { score_urgencia, eh_fatal }) {
    if (!id) throw new Error("ID do prazo é obrigatório");

    const { data, error } = await supabase
      .from("deadlines")
      .update({
        score_urgencia,
        eh_fatal,
        grau_confianca: "ALTA", // Override manual sempre tem confiança ALTA
        revisao_humana_pendente: false, // Aprovação implícita
        ia_modelo_usado: "override-manual",
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Lista prazos com revisão humana pendente (fila HITL).
   * 
   * @returns {Promise<Array>} Prazos aguardando revisão
   */
  async listPendingHITL() {
    return this.listPrazos({ apenasHITL: true, status: "pendente" });
  }

  /**
   * Retorna contagem de prazos por status de confiança IA.
   * Útil para dashboards e métricas do motor híbrido.
   * 
   * @returns {Promise<Object>} Contagens por grau_confianca
   */
  async getMetricasIA() {
    const { data, error } = await supabase
      .from("deadlines")
      .select("grau_confianca, revisao_humana_pendente")
      .not("grau_confianca", "is", null);

    if (error) throw error;

    return (data || []).reduce((acc, d) => {
      const key = d.grau_confianca || "SEM_CLASSIFICACAO";
      acc[key] = (acc[key] || 0) + 1;
      if (d.revisao_humana_pendente) {
        acc.hitl_pendentes = (acc.hitl_pendentes || 0) + 1;
      }
      return acc;
    }, {});
  }
}

export const deadlineService = new DeadlineService();
