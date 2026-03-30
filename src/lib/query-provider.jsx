/**
 * Query Provider - Wrapper para TanStack Query
 * 
 * Configuração global do QueryClient com staleTime estratégico
 * otimizado para dados semi-estáticos do RV-Adv.
 * 
 * TanStack Query v5 Best Practices:
 * - staleTime: Tempo até dados serem considerados "stale"
 * - gcTime: Tempo até dados serem removidos do cache (era cacheTime no v4)
 * - staleTime infinito = dados que nunca mudam
 * - staleTime curto = dados que mudam frequentemente
 * 
 * @module lib/query-provider
 */
import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { toast } from "sonner";
import React from "react";

// ============================================
// Configurações de staleTime por tipo de dado
// ============================================

/**
 * Estratégias de staleTime para diferentes tipos de dados
 * 
 *| Tipo de Dado          | staleTime  | gcTime   | Quando usar                    |
 *|-----------------------|------------|----------|--------------------------------|
 *| Dados quase estáticos | 30 min     | 60 min   | Áreas, status, config          |
 *| Dados semi-estáticos  | 5 min      | 10 min   | Listas de clientes, processos  |
 *| Dados dinâmicos       | 1 min      | 5 min    | Deadlines, notificações        |
 *| Dados muito dinâmicos | 30 seg     | 2 min    | Lista de tarefas, status       |
 *| Dados em tempo real   | 0 (sempre) | 1 min    | Previews, dados de polling     |
 */
export const STALE_TIMES = {
  /** Dados quase estáticos (30 minutos) */
  STATIC: 30 * 60 * 1000,
  
  /** Dados semi-estáticos (5 minutos) */
  SEMI_STATIC: 5 * 60 * 1000,
  
  /** Dados dinâmicos (1 minuto) */
  DYNAMIC: 1 * 60 * 1000,
  
  /** Dados muito dinâmicos (30 segundos) */
  VERY_DYNAMIC: 30 * 1000,
  
  /** Sempre stale (0 = sempre refetch) */
  ALWAYS: 0,
};

/**
 * Estratégias de gcTime (garbage collection)
 */
export const GC_TIMES = {
  STATIC: 60 * 60 * 1000,      // 1 hora
  SEMI_STATIC: 10 * 60 * 1000, // 10 minutos
  DYNAMIC: 5 * 60 * 1000,      // 5 minutos
  VERY_DYNAMIC: 2 * 60 * 1000, // 2 minutos
  ALWAYS: 1 * 60 * 1000,       // 1 minuto
};

// ============================================
// Error Handler Global
// ============================================

/**
 * Handler global de erros para queries e mutations
 * Dispara toast com mensagem amigável em PT-BR
 */
const globalErrorHandler = (error, context) => {
  // Permite suprimir o toast global via meta.skipGlobalError
  if (context?.meta?.skipGlobalError) return;

  // Extrai mensagem amigável ou usa fallback
  let message = "Ocorreu um erro inesperado. Tente novamente.";
  
  if (error?.isSupabaseError) {
    // Erros já mapeados pelo BaseService
    message = error.message;
  } else if (error?.message) {
    message = error.message;
  }
  
  toast.error(message, {
    duration: 5000,
    id: `error-${Date.now()}`,
  });
};

/**
 * Handler de sucesso para mutations
 */
const globalSuccessHandler = (data, context) => {
  // Mostra toast de sucesso se configurado via meta.showSuccessToast
  if (context?.meta?.showSuccessToast) {
    const message = context.meta.successMessage || "Operação realizada com sucesso!";
    toast.success(message, { duration: 3000 });
  }
};

// ============================================
// QueryClient Instance
// ============================================

/**
 * QueryClient configurado para o RV-Adv
 * 
 * Configurações:
 * - refetchOnWindowFocus: false (evita refetch ao voltar para aba)
 * - retry: 1 (tenta 1 retry em caso de erro)
 * - staleTime e gcTime estratégicos por tipo de dado
 */
export const queryClientInstance = new QueryClient({
  queryCache: new QueryCache({
    onError: globalErrorHandler,
  }),
  mutationCache: new MutationCache({
    onError: globalErrorHandler,
    onSuccess: globalSuccessHandler,
  }),
  defaultOptions: {
    queries: {
      // Não refetch quando usuário volta para a página
      refetchOnWindowFocus: false,
      
      // Retry apenas 1 vez para não用户体验
      retry: 1,
      
      // Stale time padrão para dados semi-estáticos
      staleTime: STALE_TIMES.SEMI_STATIC,
      
      // GC time de 10 minutos
      gcTime: GC_TIMES.SEMI_STATIC,
      
      // Headers customizados para requisições
      headers: {
        'Content-Type': 'application/json',
      },
    },
    mutations: {
      // Stale time não aplicável para mutations
      staleTime: 0,
      
      // Tempo de retenção de mutations no cache
      gcTime: GC_TIMES.DYNAMIC,
    },
  },
});

// ============================================
// QueryProvider Component
// ============================================

/**
 * Provider wrapper para TanStack Query
 * 
 * @example
 * ```jsx
 * import { QueryProvider } from '@/lib/query-provider';
 * 
 * function App() {
 *   return (
 *     <QueryProvider>
 *       <YourApp />
 *     </QueryProvider>
 *   );
 * }
 * ```
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Componentes filhos
 * @param {QueryClient} [props.client=queryClientInstance] - QueryClient customizado
 */
export function QueryProvider({ children, client = queryClientInstance }) {
  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
}

// ============================================
// Hooks Helper
// ============================================

/**
 * Hook para opções de query com staleTime customizado
 * 
 * @example
 * ```js
 * const queryOptions = useQueryOptions({
 *   queryKey: ['clients'],
 *   queryFn: fetchClients,
 *   staleTime: STALE_TIMES.DYNAMIC, // 1 minuto
 * });
 * ```
 * 
 * @param {Object} options - Opções da query
 * @param {"STATIC"|"SEMI_STATIC"|"DYNAMIC"|"VERY_DYNAMIC"|"ALWAYS"|number} options.staleTime 
 * @returns {Object} Opções mescladas com staleTime configurado
 */
export function useQueryOptions({ staleTime, ...options }) {
  const finalStaleTime = typeof staleTime === 'string' 
    ? STALE_TIMES[staleTime] || STALE_TIMES.SEMI_STATIC 
    : staleTime || STALE_TIMES.SEMI_STATIC;
    
  return {
    ...options,
    staleTime: finalStaleTime,
    gcTime: finalStaleTime * 2,
  };
}

/**
 * Configurações pré-definidas para tipos de dados comuns
 */
export const QUERY_CONFIGS = {
  // Clientes - semi-estáticos (mudam pouco)
  clients: {
    staleTime: STALE_TIMES.SEMI_STATIC,
    gcTime: GC_TIMES.SEMI_STATIC,
  },
  
  // Processos - semi-estáticos
  processos: {
    staleTime: STALE_TIMES.SEMI_STATIC,
    gcTime: GC_TIMES.SEMI_STATIC,
  },
  
  // Deadlines - dinâmicos
  deadlines: {
    staleTime: STALE_TIMES.DYNAMIC,
    gcTime: GC_TIMES.DYNAMIC,
  },
  
  // Tarefas - muito dinâmicos
  tasks: {
    staleTime: STALE_TIMES.VERY_DYNAMIC,
    gcTime: GC_TIMES.VERY_DYNAMIC,
  },
  
  // Notificações - muito dinâmicos
  notifications: {
    staleTime: STALE_TIMES.DYNAMIC,
    gcTime: GC_TIMES.DYNAMIC,
  },
  
  // Configurações - quase estáticos
  settings: {
    staleTime: STALE_TIMES.STATIC,
    gcTime: GC_TIMES.STATIC,
  },
  
  // Calendário - dinâmicos
  appointments: {
    staleTime: STALE_TIMES.DYNAMIC,
    gcTime: GC_TIMES.DYNAMIC,
  },
};

// ============================================
// Re-export QueryClientProvider (necessário para QueryProvider)
// ============================================
import { QueryClientProvider } from "@tanstack/react-query";

export { QueryClientProvider };

// Re-export entidades para conveniência
export { queryClientInstance as queryClient };
