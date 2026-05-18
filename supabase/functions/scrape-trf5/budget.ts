export type ScrapeMode = "initial_import" | "daily_sync" | "manual_range";

export interface RunBudgetInput {
  mode: ScrapeMode;
  maxItemsPerRun?: number;
  maxPortalRequests?: number;
  maxRuntimeMs?: number;
  maxPagesPerTerm?: number;
}

export interface RunBudget {
  maxItemsPerRun: number | null;
  maxPortalRequests: number | null;
  maxRuntimeMs: number | null;
  maxPagesPerTerm: number;
}

export type StopReason = "max_items" | "max_portal_requests" | "max_runtime_ms";

export interface StopState {
  processedItems: number;
  portalRequests: number;
  elapsedMs: number;
}

export interface ScrapeWorkMetrics {
  inserted: number;
  updated: number;
  ignored: number;
  ignoredExistingProcess: number;
  ignoredDuplicateProcess: number;
}

export interface ScrapeErrorMetrics extends ScrapeWorkMetrics {
  errors: number;
}

export type PersistenceAction = "inserted" | "insert_similar" | "updated";

export interface PersistenceActionInput {
  inserted: boolean;
  duplicateReason: string | null;
}

export function resolveRunBudget(input: RunBudgetInput): RunBudget {
  const isDailySync = input.mode === "daily_sync";

  return {
    maxItemsPerRun: input.maxItemsPerRun ?? (isDailySync ? 20 : null),
    maxPortalRequests: input.maxPortalRequests ?? (isDailySync ? 36 : null),
    maxRuntimeMs: input.maxRuntimeMs ?? (isDailySync ? 100_000 : null),
    maxPagesPerTerm: input.maxPagesPerTerm ?? (isDailySync ? 1 : 20),
  };
}

export function shouldStopRun(state: StopState, budget: RunBudget): StopReason | null {
  if (budget.maxItemsPerRun !== null && state.processedItems >= budget.maxItemsPerRun) {
    return "max_items";
  }

  if (budget.maxPortalRequests !== null && state.portalRequests >= budget.maxPortalRequests) {
    return "max_portal_requests";
  }

  if (budget.maxRuntimeMs !== null && state.elapsedMs >= budget.maxRuntimeMs) {
    return "max_runtime_ms";
  }

  return null;
}

export function hasSuccessfulScrapeWork(metrics: ScrapeWorkMetrics): boolean {
  const usefulWork =
    metrics.inserted +
    metrics.updated +
    metrics.ignored +
    metrics.ignoredExistingProcess +
    metrics.ignoredDuplicateProcess;

  return usefulWork > 0;
}

export function shouldFailForItemErrors(metrics: ScrapeErrorMetrics): boolean {
  return metrics.errors > 0 && !hasSuccessfulScrapeWork(metrics);
}

export function shouldRetryEmbeddingStatus(status: number, attempt: number, maxAttempts: number): boolean {
  if (attempt >= maxAttempts - 1) return false;

  return [408, 409, 425, 429, 500, 502, 503, 504].includes(status);
}

export function resolvePersistenceAction(input: PersistenceActionInput): PersistenceAction {
  if (input.inserted) return "inserted";
  if (input.duplicateReason === "similarity") return "insert_similar";

  return "updated";
}
