/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import { resolve } from "path";

/**
 * Configuração Vitest — RV-Adv
 *
 * Inclui:
 *  - Ambiente Node (padrão — compatível com lógica pura TypeScript das Edge Functions)
 *  - Resolução de aliases para importar módulos das Edge Functions nos testes
 *  - Cobertura via @vitest/coverage-v8
 *
 * IMPORTANTE: Os testes das Edge Functions (supabase/functions/**) testam
 * apenas a lógica matemática pura (sem Deno.env, serve() ou fetch).
 * As funções exportadas (calcularPrazo, getFeriadosMoveis, etc.) são isoladas
 * do handler HTTP e podem ser importadas diretamente pelo Vitest.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "tests/**/*.test.ts",
      "tests/**/*.test.js",
      "src/**/*.test.ts",
      "src/**/*.test.js",
    ],
    exclude: ["**/node_modules/**", "**/dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "supabase/functions/calculadora-prazos/**/*.ts",
      ],
      exclude: [
        "node_modules",
        "supabase/functions/*/index.ts", // Exclui handlers HTTP (serve()) do coverage
      ],
    },
  },
  resolve: {
    alias: {
      // Permite importar de "https://deno.land/..." e "jsr:..." sem erros
      // Os testes devem usar caminhos relativos para as funções matemáticas puras
      "@/": resolve(__dirname, "./src/"),
    },
  },
  esbuild: {
    // Permite TypeScript com decorators e imports Deno-style
    target: "es2022",
  },
});
