/**
 * Constantes de Áreas de Atuação Jurídica
 * 
 * Centraliza as hardcoded strings "Previdenciário" e "Cível"
 * para evitar duplicação e facilitar manutenção.
 * 
 * @module constants/areas
 * 
 * @example
 * ```js
 * import { AREAS_ATUACAO, AREAS_LIST, isAreaValida } from '@/lib/constants/areas';
 * 
 * // Usar em select options
 * <Select options={AREAS_LIST.map(area => ({ label: area, value: area }))} />
 * 
 * // Validar área
 * if (isAreaValida(formData.area_atuacao)) {
 *   // área válida
 * }
 * ```
 */

/**
 * Áreas de atuação jurídica disponíveis
 * @constant {Object}
 */
export const AREAS_ATUACAO = {
  /** Área de Direito INSS e Benefícios */
  PREVIDENCIARIO: "Previdenciário",
  /** Área de Direito Civil geral */
  CIVEL: "Cível",
  /** Área de Direito Trabalhista */
  TRABALHISTA: "Trabalhista",
  /** Outras áreas jurídicas */
  OUTRO: "Outro",
};

/**
 * Array com lista de áreas para uso em selects/dropdowns
 * @constant {string[]}
 */
export const AREAS_LIST = Object.values(AREAS_ATUACAO);

/**
 * Lista de áreas principais (exclui "Outro")
 * @constant {string[]}
 */
export const AREAS_PRINCIPAIS = [
  AREAS_ATUACAO.PREVIDENCIARIO,
  AREAS_ATUACAO.CIVEL,
];

/**
 * Verifica se uma string é uma área de atuação válida
 * @param {string} area - Área a verificar
 * @returns {boolean} True se a área for válida
 */
export function isAreaValida(area) {
  return AREAS_LIST.includes(area);
}

/**
 * Verifica se é área principal (Previdenciário ou Cível)
 * @param {string} area - Área a verificar
 * @returns {boolean} True se for área principal
 */
export function isAreaPrincipal(area) {
  return AREAS_PRINCIPAIS.includes(area);
}

/**
 * Obtém o label de exibição para uma área
 * @param {string} area - Área
 * @returns {string} Label formatado
 */
export function getAreaLabel(area) {
  const labels = {
    [AREAS_ATUACAO.PREVIDENCIARIO]: "Direito INSS e Benefícios",
    [AREAS_ATUACAO.CIVEL]: "Direito Civil",
    [AREAS_ATUACAO.TRABALHISTA]: "Direito do Trabalho",
    [AREAS_ATUACAO.OUTRO]: "Outras Áreas",
  };
  return labels[area] || area;
}

/**
 * Obtém ícones ou cores para cada área
 * @param {string} area - Área
 * @returns {Object} Configuração visual
 */
export function getAreaConfig(area) {
  const configs = {
    [AREAS_ATUACAO.PREVIDENCIARIO]: {
      color: "#10b981", // verde
      bgColor: "bg-emerald-100",
      textColor: "text-emerald-800",
      icon: "🛡️",
    },
    [AREAS_ATUACAO.CIVEL]: {
      color: "#3b82f6", // azul
      bgColor: "bg-blue-100",
      textColor: "text-blue-800",
      icon: "⚖️",
    },
    [AREAS_ATUACAO.TRABALHISTA]: {
      color: "#f59e0b", // amarelo/laranja
      bgColor: "bg-amber-100",
      textColor: "text-amber-800",
      icon: "💼",
    },
    [AREAS_ATUACAO.OUTRO]: {
      color: "#6b7280", // cinza
      bgColor: "bg-gray-100",
      textColor: "text-gray-800",
      icon: "📁",
    },
  };
  return configs[area] || configs[AREAS_ATUACAO.OUTRO];
}

// Alias para compatibilidade com schemas Zod
export { AREAS_ATUACAO as AREAS, AREAS_LIST as AREAS_OPTIONS };
