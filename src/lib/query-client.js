import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * IMP-03: Global onError handler.
 * Dispara toast genérico quando uma query/mutation falha e não possui
 * onError local (meta.skipGlobalError = true para suprimir).
 */
const globalErrorHandler = (error, context) => {
  // Permite suprimir o toast global via meta
  if (context?.meta?.skipGlobalError) return;

  const message =
    error?.message || "Ocorreu um erro inesperado. Tente novamente.";
  toast.error(message);
};

export const queryClientInstance = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => globalErrorHandler(error, query),
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) =>
      globalErrorHandler(error, mutation),
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
