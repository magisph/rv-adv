import { supabase } from "@/lib/supabase";
import { z } from "zod";

/**
 * Boundary Mapper - Traduz erros do Supabase para mensagens PT-BR
 * 
 * Códigos de erro PostgreSQL:
 * - 23505: unique_violation - Registro duplicado
 * - 23503: foreign_key_violation - Referência inválida
 * - 23502: not_null_violation - Campo obrigatório
 * - 42501: insufficient_privilege - Sem permissão
 * - 42P01: undefined_table - Tabela não existe
 * - 42703: undefined_column - Coluna não existe
 * 
 * Códigos PostgREST:
 * - PGRST116: The result contains 0 rows (registro não encontrado)
 * - PGRST204: The result contains more than 1 row (múltiplos registros)
 */
const SUPABASE_ERROR_MAP = {
  // Erros PostgreSQL nativos
  '23505': 'Registro duplicado. Este valor já existe no sistema.',
  '23503': 'Referência inválida. O registro relacionado não existe.',
  '23502': 'Campo obrigatório não preenchido.',
  '42501': 'Sem permissão para esta operação. Verifique suas credenciais.',
  '42P01': 'Operação inválida. Tabela não encontrada.',
  '42703': 'Campo inválido. Coluna não existe na tabela.',
  '42P07': 'Tabela já existe.',
  '42712': 'Alias duplicado na consulta.',
  '42P16': 'Detalhe de índice array mal formado.',
  '42P17': 'Sequência não existe.',
  '42P18': 'Detalhe de sequência indefinido.',
  // Erros PostgREST
  'PGRST116': 'Registro não encontrado.',
  'PGRST204': 'Operação retornou múltiplos registros. Use filtro mais específico.',
  // Erros genéricos
  'NETWORK_ERROR': 'Erro de conexão. Verifique sua internet.',
  'TIMEOUT': 'Tempo limite excedido. Tente novamente.',
  'UNKNOWN': 'Erro inesperado. Tente novamente.',
};

/**
 * Mapeia erro Supabase para mensagem PT-BR amigável
 * @param {Object} error - Erro do Supabase
 * @returns {Error} Erro com mensagem em português
 */
function mapSupabaseError(error) {
  // Extrai o código do erro
  let errorCode = error?.code || error?.details?.code || 'UNKNOWN';
  let errorMessage = error?.message || 'Ocorreu um erro inesperado.';
  
  // Tenta extrair código numérico do details se existir
  if (error?.details && typeof error.details === 'string') {
    const codeMatch = error.details.match(/ERROR:\s*(\d+)/);
    if (codeMatch) {
      errorCode = codeMatch[1];
    }
  }
  
  // Verifica se é erro de rede
  if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
    errorCode = 'NETWORK_ERROR';
  }
  
  // Verifica timeout
  if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
    errorCode = 'TIMEOUT';
  }
  
  // Retorna mensagem mapeada ou genérica
  const mappedMessage = SUPABASE_ERROR_MAP[errorCode] || errorMessage;
  
  // Cria erro com mensagem amigável
  const mappedError = new Error(mappedMessage);
  mappedError.supabaseCode = errorCode;
  mappedError.originalError = error;
  mappedError.isSupabaseError = true;
  
  return mappedError;
}

/**
 * Valida dados usando schema Zod antes de enviar ao Supabase
 * @param {Object} data - Dados a validar
 * @param {Object} schema - Schema Zod
 * @param {string} operation - Nome da operação para erro
 * @returns {Object} Dados validados
 * @throws {Error} Se validação falhar
 */
function validateWithZod(data, schema, operation) {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => {
        const path = e.path.join('.');
        return path ? `${path}: ${e.message}` : e.message;
      }).join('; ');
      
      const validationError = new Error(`Dados inválidos (${operation}): ${messages}`);
      validationError.isValidationError = true;
      validationError.zodErrors = error.errors;
      throw validationError;
    }
    throw error;
  }
}

/**
 * BaseService - Classe base para operações CRUD com Supabase
 * 
 * Recursos:
 * - Validação opcional de DTO com Zod
 * - Mapeamento de erros para PT-BR
 * - Suporte a ordenação com prefixo "-" para descendente
 * 
 * @example
 * ```js
 * const userService = new BaseService('users', userSchema);
 * const users = await userService.list('-created_at');
 * ```
 */
export class BaseService {
  /**
   * @param {string} tableName - Nome da tabela no Supabase
   * @param {Object} [schema] - Schema Zod opcional para validação
   */
  constructor(tableName, schema = null) {
    this.table = tableName;
    this.schema = schema;
  }

  /**
   * Lista registros com ordenação opcional
   * 
   * @param {string} [orderBy='created_at'] - Campo para ordenação (prefixar com "-" para descendente)
   * @param {number} [limit=100] - Limite de registros
   * @param {Object} [filters] - Filtros adicionais { campo: valor }
   * @returns {Promise<Array>} Lista de registros
   * @throws {Error} Erro mapeado para PT-BR
   */
  async list(orderBy = "created_at", limit = 100, filters = null) {
    let ascending = true;
    let column = orderBy;
    
    // Handle "-field" syntax for descending sort
    if (orderBy && orderBy.startsWith("-")) {
      ascending = false;
      column = orderBy.substring(1);
    }
    
    let query = supabase
      .from(this.table)
      .select("*")
      .order(column, { ascending })
      .limit(limit);
    
    // Apply additional filters if provided
    if (filters && typeof filters === 'object') {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }
    
    const { data, error } = await query;
    
    if (error) throw mapSupabaseError(error);
    return data;
  }

  /**
   * Cria novo registro
   * 
   * @param {Object} recordData - Dados do registro
   * @returns {Promise<Object>} Registro criado
   * @throws {Error} Erro de validação ou mapeado para PT-BR
   */
  async create(recordData) {
    // Validar com Zod se schema existir
    const validatedData = this.schema 
      ? validateWithZod(recordData, this.schema, 'criar')
      : recordData;
    
    // Remove ID se presente (deixa o DB gerar)
    const { id, ...payload } = validatedData;
    
    const { data, error } = await supabase
      .from(this.table)
      .insert(payload)
      .select()
      .single();
      
    if (error) throw mapSupabaseError(error);
    return data;
  }
  
  /**
   * Atualiza registro existente
   * 
   * @param {string} id - ID do registro
   * @param {Object} updates - Campos para atualizar
   * @returns {Promise<Object>} Registro atualizado
   * @throws {Error} Erro de validação ou mapeado para PT-BR
   */
  async update(id, updates) {
    // Validar com Zod parcial se schema existir
    if (this.schema) {
      const partialSchema = this.schema.partial();
      validateWithZod(updates, partialSchema, 'atualizar');
    }
    
    const { data, error } = await supabase
      .from(this.table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw mapSupabaseError(error);
    return data;
  }
  
  /**
   * Remove registro
   * 
   * @param {string} id - ID do registro
   * @returns {Promise<void>}
   * @throws {Error} Erro mapeado para PT-BR
   */
  async delete(id) {
    const { error } = await supabase.from(this.table).delete().eq('id', id);
    if (error) throw mapSupabaseError(error);
  }
  
  /**
   * Busca registro por ID
   * 
   * @param {string} id - ID do registro
   * @returns {Promise<Object>} Registro encontrado
   * @throws {Error} Erro mapeado para PT-BR
   */
  async getById(id) {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq('id', id)
      .single();
      
    if (error) throw mapSupabaseError(error);
    return data;
  }
  
  /**
   * Busca registro por campo específico
   * 
   * @param {string} field - Nome do campo
   * @param {*} value - Valor do campo
   * @returns {Promise<Object|null>} Registro encontrado ou null
   * @throws {Error} Erro mapeado para PT-BR
   */
  async getByField(field, value) {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq(field, value)
      .maybeSingle();
      
    if (error) throw mapSupabaseError(error);
    return data;
  }
  
  /**
   * Busca múltiplos registros por campo
   * 
   * @param {string} field - Nome do campo
   * @param {*} value - Valor do campo
   * @param {string} [orderBy='created_at'] - Campo para ordenação
   * @returns {Promise<Array>} Lista de registros
   * @throws {Error} Erro mapeado para PT-BR
   */
  async getAllByField(field, value, orderBy = "created_at") {
    let ascending = true;
    let column = orderBy;
    
    if (orderBy && orderBy.startsWith("-")) {
      ascending = false;
      column = orderBy.substring(1);
    }
    
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq(field, value)
      .order(column, { ascending });
      
    if (error) throw mapSupabaseError(error);
    return data;
  }
  
  /**
   * Método genérico de filtro
   * 
   * @param {Object} filters - Objeto com filtros { campo: valor }
   * @param {string} [orderBy='created_at'] - Campo para ordenação
   * @param {number} [limit=100] - Limite de registros
   * @returns {Promise<Array>} Lista de registros filtrados
   * @throws {Error} Erro mapeado para PT-BR
   */
  async filter(filters, orderBy = "created_at", limit = 100) {
    let query = supabase.from(this.table).select("*");
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });
    
    let ascending = true;
    let column = orderBy;
    if (orderBy && orderBy.startsWith("-")) {
      ascending = false;
      column = orderBy.substring(1);
    }
    
    if (column) {
      query = query.order(column, { ascending });
    }
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
    if (error) throw mapSupabaseError(error);
    return data;
  }

  /**
   * Conta registros com filtros opcionais
   * 
   * @param {Object} [filters] - Filtros opcionais
   * @returns {Promise<number>} Contagem de registros
   * @throws {Error} Erro mapeado para PT-BR
   */
  async count(filters = null) {
    let query = supabase.from(this.table).select('*', { count: 'exact', head: true });
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }
    
    const { count, error } = await query;
    
    if (error) throw mapSupabaseError(error);
    return count || 0;
  }
}

// Exporta o mapper para uso externo se necessário
export { mapSupabaseError, SUPABASE_ERROR_MAP };
