import { BaseService } from '@/services/baseService';
import { novaPericiaSchema, novaPericiaSchemaPartial } from '../schemas/novaPericiaSchema';
import { supabase } from '@/lib/supabase';

/**
 * Sanitiza um objeto substituindo todas as strings vazias por null.
 * Garante que o PostgREST não receba "" em colunas tipadas (uuid, date).
 *
 * @param {Record<string, unknown>} payload
 * @returns {Record<string, unknown>}
 */
function sanitizePayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      value === '' ? null : value,
    ]),
  );
}

/**
 * PericiaService — CRUD completo para a tabela `pericias`.
 * Estende BaseService para herdar mapeamento de erros PT-BR e
 * validação Zod centralizada.
 */
class PericiaService extends BaseService {
  constructor() {
    super('pericias', novaPericiaSchema);
  }

  /**
   * Lista perícias com join de cliente.
   * Substitui: base44.entities.Pericia.list("-updated_date")
   *
   * @param {{ orderBy?: string; ascending?: boolean }} [options]
   * @returns {Promise<Array>}
   */
  async list(options = {}) {
    const orderBy = options.orderBy ?? 'updated_at';
    const ascending = options.ascending ?? false;

    const { data, error } = await supabase
      .from('pericias')
      .select('*, clients(id, full_name, cpf_cnpj)')
      .order(orderBy, { ascending });

    if (error) throw error;
    return data ?? [];
  }

  /**
   * Busca perícia por ID com join de cliente.
   * Substitui: base44.entities.Pericia.filter({ id })
   *
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async getById(id) {
    const { data, error } = await supabase
      .from('pericias')
      .select('*, clients(id, full_name, cpf_cnpj)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Cria uma nova perícia com validação de tipo e sanitização de payload.
   *
   * Fail-fast: lança erro se client_id estiver ausente ou não for UUID válido.
   * Sanitização: converte todos os valores "" para null antes de enviar ao PostgREST.
   *
   * @param {Object} rawPayload - Dados vindos do formulário (podem conter strings vazias)
   * @returns {Promise<Object>} Perícia criada
   * @throws {Error} Se client_id for inválido ou a inserção falhar
   */
  async createPericia(rawPayload) {
    // Fail-fast: client_id ausente ou inválido
    if (!rawPayload?.client_id || rawPayload.client_id === '') {
      throw new Error('Cliente é obrigatório para criar uma perícia.');
    }

    // 1. Sanitiza strings vazias → null (evita erro 400 no PostgREST)
    const sanitized = sanitizePayload(rawPayload);

    // 2. Valida com schema Zod — lança erro com mensagem PT-BR se inválido
    const parsed = novaPericiaSchema.parse(sanitized);

    // 3. Remove o id se presente (banco gera automaticamente)
    // eslint-disable-next-line no-unused-vars
    const { id, ...payload } = parsed;

    const { data, error } = await supabase
      .from('pericias')
      .insert({ ...payload, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Atualiza uma perícia existente, sanitizando o payload.
   *
   * @param {string} id
   * @param {Object} rawPayload
   * @returns {Promise<Object>}
   */
  async update(id, rawPayload) {
    const sanitized = sanitizePayload(rawPayload);

    // Validação parcial — apenas campos presentes no payload
    const parsed = novaPericiaSchemaPartial.parse(sanitized);

    const { data, error } = await supabase
      .from('pericias')
      .update({ ...parsed, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Exclui uma perícia.
   * Substitui: base44.entities.Pericia.delete(id)
   *
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    const { error } = await supabase.from('pericias').delete().eq('id', id);
    if (error) throw error;
  }

  // --- Pagamentos (normalizado) ---

  /**
   * Lista pagamentos de uma perícia.
   *
   * @param {string} periciaId
   * @returns {Promise<Array>}
   */
  async getPagamentos(periciaId) {
    const { data, error } = await supabase
      .from('pericia_pagamentos')
      .select('*')
      .eq('pericia_id', periciaId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  /**
   * Atualiza pagamentos de forma atômica via RPC.
   * CRIT-02 fix: DELETE + INSERT dentro de uma única transação PostgreSQL.
   *
   * @param {string} periciaId
   * @param {Array} pagamentos
   * @returns {Promise<void>}
   */
  async upsertPagamentos(periciaId, pagamentos) {
    const { error } = await supabase.rpc('rpc_upsert_pagamentos', {
      p_pericia_id: periciaId,
      p_pagamentos: JSON.stringify(pagamentos),
    });
    if (error) throw error;
  }

  // --- Documentos ---

  /**
   * Lista documentos de uma perícia.
   *
   * @param {string} periciaId
   * @returns {Promise<Array>}
   */
  async getDocumentos(periciaId) {
    const { data, error } = await supabase
      .from('pericia_documentos')
      .select('*')
      .eq('pericia_id', periciaId)
      .order('data_upload', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }
}

// Exportação como instância singleton (padrão do projeto)
export const periciaService = new PericiaService();
