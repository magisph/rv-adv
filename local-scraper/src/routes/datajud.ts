// ============================================================================
// local-scraper/src/routes/datajud.ts
// Controlador Express isolado para as rotas DataJud/CNJ.
//
// Rotas registradas:
//   GET  /health - Sonda de diagnóstico
//   POST /       - Consulta em massa de processos (DataJud Bulk)
//
// Segurança:
//   - Middleware de autenticação por x-service-key (rejeita 401 se inválida)
//   - Validação de payload antes de repassar ao service
//   - try/catch abrangente — nunca crasha o processo Node.js
// ============================================================================

import { Router, Request, Response, NextFunction } from "express";
import { consultarBulk, ProcessoBulkInput } from "../services/datajud.js";

// ─── Instância do Router ─────────────────────────────────────────────────────
export const datajudRouter = Router();

// ─── Constante de autenticação interna ──────────────────────────────────────
// SECURITY: Carregada do ambiente — NUNCA hardcoded. Usada apenas pelo Express.
const SCRAPER_SERVICE_KEY = process.env.SCRAPER_SERVICE_KEY ?? "";

// ─── Middleware de autenticação por x-service-key ────────────────────────────
function autenticarServiceKey(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!SCRAPER_SERVICE_KEY) {
    console.error(
      "[datajud/auth] SCRAPER_SERVICE_KEY não configurada no ambiente do servidor.",
    );
    res
      .status(500)
      .json({ error: "Configuração de segurança ausente no servidor." });
    return;
  }

  const serviceKey = req.headers["x-service-key"];
  if (serviceKey !== SCRAPER_SERVICE_KEY) {
    console.warn(
      `[datajud/auth] Tentativa de acesso não autorizado. ` +
        `IP: ${req.ip} | User-ID: ${req.headers["x-user-id"] ?? "desconhecido"}`,
    );
    res.status(401).json({ error: "Não autorizado. x-service-key inválida." });
    return;
  }

  next();
}

// ─── GET /health (Diagnóstico de Rota) ───────────────────────────────────────
// Endpoint público (sem service-key) para testar conectividade.
datajudRouter.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "datajud-bulk",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── POST / (Processamento Bulk CNJ) ─────────────────────────────────────────
// Recebe lista de processos, executa consultas em paralelo e retorna os dados.
datajudRouter.post(
  "/",
  autenticarServiceKey,
  async (req: Request, res: Response): Promise<void> => {
    // ── 1. Validação do payload ──────────────────────────────────────────────
    const { processos } = req.body as { processos?: unknown };

    if (!Array.isArray(processos)) {
      res.status(400).json({
        error: 'Campo "processos" deve ser um array.',
        recebido: typeof processos,
      });
      return;
    }

    if (processos.length === 0) {
      res
        .status(400)
        .json({ error: 'Campo "processos" não pode ser um array vazio.' });
      return;
    }

    if (processos.length > 50) {
      res.status(400).json({
        error: `Máximo de 50 processos por lote. Recebido: ${processos.length}.`,
      });
      return;
    }

    // Garante que cada item é um objeto com numeroCNJ (string)
    const processosInvalidos = processos.filter(
      (p) =>
        typeof p !== "object" ||
        p === null ||
        typeof (p as Record<string, unknown>).numeroCNJ !== "string",
    );

    if (processosInvalidos.length > 0) {
      res.status(400).json({
        error:
          'Cada item do array "processos" deve ter o campo "numeroCNJ" como string.',
        itensInvalidos: processosInvalidos.slice(0, 5),
      });
      return;
    }

    const processosValidados = processos as ProcessoBulkInput[];

    // ── 2. Leitura segura da API Key do DataJud ──────────────────────────────
    const datajudApiKey = process.env.DATAJUD_API_KEY ?? "";
    if (!datajudApiKey) {
      console.error(
        "[datajud/bulk] DATAJUD_API_KEY não configurada. Abortando consulta.",
      );
      res.status(500).json({
        error: "Chave de API do DataJud não configurada no servidor.",
      });
      return;
    }

    // ── 3. Executa motor bulk (concorrência controlada + retry exponencial) ──
    try {
      const usuarioId = req.headers["x-user-id"] ?? "desconhecido";
      console.info(
        `[datajud/bulk] Iniciando consulta bulk de ${processosValidados.length} processo(s). Usuário: ${usuarioId}`,
      );

      // CHAMA A FUNÇÃO DE SCRAPING
      const resultados = await consultarBulk(processosValidados, datajudApiKey);

      // DEVOLVE OS DADOS PARA A INTERFACE
      res.status(200).json({
        success: true,
        data: resultados,
      });
    } catch (err: unknown) {
      const error = err as Error;
      console.error(
        "[datajud/bulk] Erro interno na consulta bulk:",
        error.message,
        error.stack,
      );

      // DEVOLVE O ERRO PARA NÃO TRAVAR O SISTEMA
      res.status(500).json({
        error: "Erro interno no microsserviço de scraping ao processar o lote.",
        detalhe: error.message,
      });
    }
  },
);
