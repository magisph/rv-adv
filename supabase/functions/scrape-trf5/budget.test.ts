import { describe, expect, test } from "vitest";
import {
  hasSuccessfulScrapeWork,
  resolvePersistenceAction,
  resolveRunBudget,
  shouldFailForItemErrors,
  shouldRetryEmbeddingStatus,
  shouldStopRun,
} from "./budget";

describe("scrape-trf5 run budget", () => {
  test("uses conservative daily sync defaults", () => {
    const budget = resolveRunBudget({ mode: "daily_sync" });

    expect(budget.maxItemsPerRun).toBe(20);
    expect(budget.maxPortalRequests).toBe(36);
    expect(budget.maxRuntimeMs).toBe(100_000);
    expect(budget.maxPagesPerTerm).toBe(1);
  });

  test("keeps broader limits for manual range jobs", () => {
    const budget = resolveRunBudget({ mode: "manual_range" });

    expect(budget.maxItemsPerRun).toBeNull();
    expect(budget.maxPortalRequests).toBeNull();
    expect(budget.maxRuntimeMs).toBeNull();
    expect(budget.maxPagesPerTerm).toBe(20);
  });

  test("stops when any configured budget is reached", () => {
    const budget = resolveRunBudget({
      mode: "daily_sync",
      maxItemsPerRun: 2,
      maxPortalRequests: 3,
      maxRuntimeMs: 10_000,
    });

    expect(shouldStopRun({ processedItems: 2, portalRequests: 0, elapsedMs: 0 }, budget)).toBe("max_items");
    expect(shouldStopRun({ processedItems: 0, portalRequests: 3, elapsedMs: 0 }, budget)).toBe("max_portal_requests");
    expect(shouldStopRun({ processedItems: 0, portalRequests: 0, elapsedMs: 10_000 }, budget)).toBe("max_runtime_ms");
  });

  test("fails item errors only when the run did no useful work", () => {
    expect(shouldFailForItemErrors({
      errors: 1,
      inserted: 0,
      updated: 0,
      ignored: 0,
      ignoredExistingProcess: 0,
      ignoredDuplicateProcess: 0,
    })).toBe(true);

    expect(shouldFailForItemErrors({
      errors: 1,
      inserted: 0,
      updated: 1,
      ignored: 0,
      ignoredExistingProcess: 0,
      ignoredDuplicateProcess: 0,
    })).toBe(false);
  });

  test("counts skipped existing processes as successful work", () => {
    expect(hasSuccessfulScrapeWork({
      inserted: 0,
      updated: 0,
      ignored: 0,
      ignoredExistingProcess: 1,
      ignoredDuplicateProcess: 0,
    })).toBe(true);
  });

  test("retries transient embedding provider failures before giving up", () => {
    expect(shouldRetryEmbeddingStatus(429, 0, 5)).toBe(true);
    expect(shouldRetryEmbeddingStatus(500, 1, 5)).toBe(true);
    expect(shouldRetryEmbeddingStatus(503, 3, 5)).toBe(true);
    expect(shouldRetryEmbeddingStatus(400, 0, 5)).toBe(false);
    expect(shouldRetryEmbeddingStatus(500, 4, 5)).toBe(false);
  });

  test("treats similar new jurisprudence as an insert action", () => {
    expect(resolvePersistenceAction({ inserted: true, duplicateReason: null })).toBe("inserted");
    expect(resolvePersistenceAction({ inserted: false, duplicateReason: "similarity" })).toBe("insert_similar");
    expect(resolvePersistenceAction({ inserted: false, duplicateReason: "process_number" })).toBe("updated");
  });
});
