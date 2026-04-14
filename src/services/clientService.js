/**
 * Client Service - Especializado para operações com Clientes
 * 
 * Utiliza BaseService com clientSchema injetado para validação automática
 * de DTOs nas operações create/update.
 * 
 * @module services/clientService
 */
import { BaseService } from "./baseService";
// NOTA: Schemas Zod de cliente removidos da camada de serviço.
// O clientCreateSchema usa 'nome' mas a tabela 'clients' usa 'full_name'.
// A validação de campos obrigatórios é feita pela constraint NOT NULL do banco.
// Validações de negócio (CPF, formato) devem ser feitas no formulário (ClientForm.jsx).

/**
 * ClientService - Serviço especializado para clientes
 * 
 * Recursos:
 * - Validação Zod automática em create/update
 * - Error mapper PT-BR herdado do BaseService
 * - Métodos específicos para operações comuns de cliente
 * 
 * @example
 * ```js
 * import { clientService } from '@/services/clientService';
 * 
 * // Criar cliente com validação automática
 * const novoCliente = await clientService.create({
 *   nome: "João Silva",
 *   cpf_cnpj: "123.456.789-00",
 *   email: "joao@email.com"
 * });
 * 
 * // Atualizar com validação
 * await clientService.update(id, { nome: "João Silva Santos" });
 * 
 * // Buscar por CPF
 * const cliente = await clientService.getByCPF("123.456.789-00");
 * ```
 */
class ClientService extends BaseService {
  constructor() {
    // Sem schema Zod: a tabela 'clients' usa 'full_name', mas o schema usava 'nome'
    // A validação de entrada é responsabilidade do ClientForm.jsx
    super("clients");
  }

  /**
   * Cria novo cliente com validação Zod
   * 
   * @param {Object} clientData - Dados do cliente (validados contra clientSchema)
   * @returns {Promise<Object>} Cliente criado
   * @throws {Error} Erro de validação ou erro Supabase mapeado PT-BR
   */
  async create(clientData) {
    return super.create(clientData);
  }

  /**
   * Atualiza cliente existente com validação Zod parcial
   * 
   * @param {string} id - ID do cliente
   * @param {Object} updates - Campos para atualizar
   * @returns {Promise<Object>} Cliente atualizado
   * @throws {Error} Erro de validação ou erro Supabase mapeado PT-BR
   */
  async update(id, updates) {
    return super.update(id, updates);
  }

  /**
   * Busca cliente por CPF/CNPJ
   * 
   * @param {string} cpfCnpj - CPF ou CNPJ do cliente
   * @returns {Promise<Object|null>} Cliente encontrado ou null
   * @throws {Error} Erro Supabase mapeado PT-BR
   */
  async getByCPF(cpfCnpj) {
    return this.getByField("cpf_cnpj", cpfCnpj);
  }

  /**
   * Busca cliente por e-mail
   * 
   * @param {string} email - E-mail do cliente
   * @returns {Promise<Object|null>} Cliente encontrado ou null
   * @throws {Error} Erro Supabase mapeado PT-BR
   */
  async getByEmail(email) {
    return this.getByField("email", email);
  }

  /**
   * Lista clientes ativos
   * 
   * @param {string} [orderBy='-created_at'] - Campo para ordenação
   * @param {number} [limit=100] - Limite de registros
   * @returns {Promise<Array>} Lista de clientes ativos
   * @throws {Error} Erro Supabase mapeado PT-BR
   */
  async listAtivos(orderBy = "-created_at", limit = 100) {
    return this.list(orderBy, limit, { status: "ativo" });
  }

  /**
   * Lista clientes por área de atuação
   * 
   * @param {string} area - Área de atuação (Previdenciário, Cível, etc)
   * @param {string} [orderBy='-created_at'] - Campo para ordenação
   * @returns {Promise<Array>} Lista de clientes da área
   * @throws {Error} Erro Supabase mapeado PT-BR
   */
  async listByArea(area, orderBy = "-created_at") {
    return this.filter({ area_atuacao: area }, orderBy);
  }

  /**
   * Busca clientes por nome (busca parcial)
   * 
   * @param {string} searchTerm - Termo de busca
   * @param {number} [limit=20] - Limite de resultados
   * @returns {Promise<Array>} Lista de clientes compatíveis
   * @throws {Error} Erro Supabase mapeado PT-BR
   */
  async searchByName(searchTerm, limit = 20) {
    const { supabase } = await import("@/lib/supabase");
    
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .or(`full_name.ilike.%${searchTerm}%,cpf_cnpj.ilike.%${searchTerm}%`)
      .eq('status', 'ativo')
      .limit(limit);
    
    if (error) {
      const { mapSupabaseError } = await import("./baseService");
      throw mapSupabaseError(error);
    }
    
    return data;
  }

  /**
   * Conta clientes ativos
   * 
   * @returns {Promise<number>} Contagem de clientes ativos
   * @throws {Error} Erro Supabase mapeado PT-BR
   */
  async countAtivos() {
    return this.count({ status: "ativo" });
  }

  /**
   * Desativa cliente (soft delete)
   * 
   * @param {string} id - ID do cliente
   * @returns {Promise<Object>} Cliente desativado
   * @throws {Error} Erro Supabase mapeado PT-BR
   */
  async deactivate(id) {
    return this.update(id, { status: "inativo" });
  }

  /**
   * Reativa cliente
   * 
   * @param {string} id - ID do cliente
   * @returns {Promise<Object>} Cliente reativado
   * @throws {Error} Erro Supabase mapeado PT-BR
   */
  async reactivate(id) {
    return this.update(id, { status: "ativo" });
  }
}

// Instância singleton exportada
export const clientService = new ClientService();

// Também exporta a classe para uso em testes ou especializações
export { ClientService };
