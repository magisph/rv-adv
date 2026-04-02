// ============================================================================
// useDjenComunicacoes.jsx - Hook customizado para comunicações DJEN
//
// Gerencia o fetching de intimações/comunicações do DJEN (API do CNJ)
// usando TanStack Query v5 com staleTime de 5 minutos para evitar
// sobrecarga no Rate Limit da API do CNJ.
//
// Utiliza o contexto de autenticação (useAuth) para obter os dados do advogado
// logado FORA do queryFn, garantindo:
//   1. Extração correta de user_metadata do Supabase Auth
//   2. Cache isolado por usuário via user.id na queryKey (evita colisão)
// ============================================================================

import { useQuery } from "@tanstack/react-query";
import { cnjService, sanitizarNumeroOab } from "@/services/cnjService";
import { useAuth } from "@/lib/AuthContext";

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
  nomeAdvogado: nomeAdvogadoOverride,
  dataDisponibilizacaoInicio,
  dataDisponibilizacaoFim,
  enabled = true,
} = {}) {
  // ── Fix 2: useAuth() FORA do useQuery — resolve metadados de forma síncrona
  // e permite injetar user.id na queryKey para cache isolado por usuário.
  const { user } = useAuth();

  // ── Fix 1: extração de metadados — suporte dual de contrato ──────────────
  // CONTRATO ATUAL: authService._mapUser() faz spread de user_metadata na raiz
  //   do objeto user → user.numero_oab é o caminho real no ambiente de produção.
  //
  // CONTRATO NATIVO SUPABASE: O objeto bruto de auth.getUser() armazena campos
  //   customizados em user.user_metadata.numero_oab (sem spread).
  //
  // A ordem abaixo suporta AMBOS os formatos para resiliência contra refatoração
  // futura do _mapUser:
  //   override → raiz (contrato atual) → user_metadata (contrato nativo) → default
  const numeroOabRaw = numeroOabOverride
    || user?.oab_number             // Prioridade 1: Settings.jsx (via spread)
    || user?.user_metadata?.oab_number  // Prioridade 2: Metadados nativos
    || user?.numero_oab             // Fallback 1: Chave antiga (spread)
    || user?.user_metadata?.numero_oab; // Fallback 2: Chave antiga (nativa)

  const ufOab = (
    ufOabOverride
    || user?.oab_state              // Prioridade 1: Settings.jsx (via spread)
    || user?.user_metadata?.oab_state   // Prioridade 2: Metadados nativos
    || user?.uf_oab                // Fallback 1: Chave antiga (spread)
    || user?.user_metadata?.uf_oab  // Fallback 2: Chave antiga (nativa)
    || "CE"
  ).toUpperCase();

  const nomeAdvogado = nomeAdvogadoOverride
    || user?.full_name
    || user?.name
    || user?.user_metadata?.full_name
    || user?.user_metadata?.name;
  // ──────────────────────────────────────────────────────────────────────────

  return useQuery({
    // ── Fix 2: user?.id na queryKey garante cache isolado por advogado ──────
    // Sem isso, dois advogados na mesma máquina compartilhariam o mesmo cache
    // quando ambos os overrides fossem undefined.
    queryKey: [
      "djen-comunicacoes",
      user?.id,
      numeroOabOverride,
      ufOabOverride,
      dataDisponibilizacaoInicio,
      dataDisponibilizacaoFim,
    ],
    // ──────────────────────────────────────────────────────────────────────────
    queryFn: async () => {
      // Se não houver OAB, lança erro claro antes de chamar a network
      if (!numeroOabRaw) {
        throw new Error(
          "OAB não configurada no perfil do usuário. " +
          "Configure seu número de OAB e UF nas configurações do perfil."
        );
      }

      // ── Defesa em profundidade: sanitiza OAB antes de chamar o serviço ───
      // Garante 7 dígitos numéricos mesmo que o dado do perfil venha com letras
      // ou formatos impuros (ex: "CE36219", "36.219", "OAB/CE 36219", etc.).
      // O cnjService.djenBuscaPublica() também sanitiza internamente (camada dupla).
      const numeroOab = sanitizarNumeroOab(numeroOabRaw);

      // Chama o serviço com os parâmetros já resolvidos
      const result = await cnjService.djenBuscaPublica({
        numeroOab,
        numeroOabRaw, // repassa o original para o campo oabExibicao
        ufOab,
        nomeAdvogado: nomeAdvogado || null,
        dataDisponibilizacaoInicio,
        dataDisponibilizacaoFim,
      });

      return result;
    },
    // StaleTime de 5 minutos para evitar Rate Limit do CNJ
    staleTime: DJEN_STALE_TIME,
    // Habilita a query apenas se enabled for true e houver usuário autenticado
    enabled: enabled && !!user,
    // Retry logic: retry 2 vezes com delay exponencial
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Não refetch em window focus para evitar Rate Limit
    refetchOnWindowFocus: false,
  });
}

export default useDjenComunicacoes;