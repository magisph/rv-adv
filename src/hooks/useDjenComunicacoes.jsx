// ============================================================================
// useDjenComunicacoes.jsx - Hook customizado para comunicações DJEN
// 
// Gerencia o fetching de intimações/comunicações do DJEN (API do CNJ)
// usando TanStack Query v5 com staleTime de 5 minutos para evitar
// sobrecarga no Rate Limit da API do CNJ.
//
// Utiliza o authService para obter os dados do advogado logado.
// ============================================================================

import { useQuery } from "@tanstack/react-query";
import { cnjService, sanitizarNumeroOab } from "@/services/cnjService";
import { authService } from "@/services/authService";

// StaleTime: 5 minutos (300000ms) para evitar Rate Limit do CNJ
const DJEN_STALE_TIME = 5 * 60 * 1000; // 5 * 60 * 1000 = 300000

/**
 * Hook customizado para buscar comunicações do DJEN
 * 
 * @param {Object} options - Opções do hook
 * @param {string} [options.numeroOab] - Número da OAB (opcional, sobrescreve dados do usuário)
 * @param {string} [options.ufOab] - UF da OAB (opcional, sobrescreve dados do usuário)
 * @param {string} [options.nomeAdvogado] - Nome do advogado (opcional)
 * @param {string} [options.dataDisponibilizacaoInicio] - Data inicial (YYYY-MM-DD)
 * @param {string} [options.dataDisponibilizacaoFim] - Data final (YYYY-MM-DD)
 * @param {boolean} [options.enabled=true] - Se a query está habilitada
 * 
 * @returns {Object} Objeto com dados do TanStack Query { data, isLoading, error, refetch }
 */
export function useDjenComunicacoes({
  numeroOab: numeroOabOverride,
  ufOab: ufOabOverride,
  nomeAdvogado,
  dataDisponibilizacaoInicio,
  dataDisponibilizacaoFim,
  enabled = true,
} = {}) {
  return useQuery({
    // Query key: inclui parâmetros para invalidação correta
    queryKey: [
      "djen-comunicacoes",
      numeroOabOverride,
      ufOabOverride,
      dataDisponibilizacaoInicio,
      dataDisponibilizacaoFim,
    ],
    queryFn: async () => {
      // Tenta obter dados do advogado logado
      const user = await authService.getCurrentUser();
      
      // Usa dados do override ou do usuário logado
      const numeroOabRaw = numeroOabOverride || user?.numero_oab || user?.oab;
      const ufOab = (ufOabOverride || user?.uf_oab || user?.ufOab || "CE").toUpperCase();
      
      // Se não houver OAB, lança erro claro
      if (!numeroOabRaw) {
        throw new Error(
          "OAB não configurada no perfil do usuário. " +
          "Configure seu número de OAB e UF nas configurações do perfil."
        );
      }

      // ── Defesa em profundidade: sanitiza OAB aqui também, antes de chamar o serviço ──
      // Garante 7 dígitos numéricos mesmo que o dado do perfil venha com letras ou 
      // formatos impuros (ex: "CE36219", "36.219", "OAB/CE 36219", etc.).
      // O cnjService.djenBuscaPublica() também sanitiza internamente (camada dupla).
      const numeroOab = sanitizarNumeroOab(numeroOabRaw);
      
      // Chama o serviço com os parâmetros
      const result = await cnjService.djenBuscaPublica({
        numeroOab,
        ufOab,
        nomeAdvogado: nomeAdvogado || user?.name || user?.nome || null,
        dataDisponibilizacaoInicio,
        dataDisponibilizacaoFim,
      });
      
      return result;
    },
    // StaleTime de 5 minutos para evitar Rate Limit do CNJ
    staleTime: DJEN_STALE_TIME,
    // Habilita a query apenas se enabled for true
    enabled,
    // Retry logic: retry 2 vezes com delay exponencial
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Não refetch em window focus para evitar Rate Limit
    refetchOnWindowFocus: false,
  });
}

export default useDjenComunicacoes;