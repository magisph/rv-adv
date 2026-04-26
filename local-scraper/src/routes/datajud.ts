// ============================================================================
// local-scraper/src/routes/datajud.ts
// Controlador Express isolado para as rotas DataJud/CNJ.
//
// Rotas registradas:
//   POST /api/datajud/bulk — Consulta em massa de processos via Elasticsearch
//
// Segurança:
//   - Middleware de autenticação por x-service-key (rejeita 401 se inválida)
//   - Validação de payload antes de repassar ao service
//   - try/catch abrangente — nunca crasha o processo Node.js
//
// Padrão de arquitetura: Router (HTTP) → Service (datajud.ts) → API CNJ
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { consultarBulk, ProcessoBulkInput } from '../services/datajud.js';

// ─── Instância do Router ─────────────────────────────────────────────────────

export const datajudRouter = Router();

// ─── Constante de autenticação interna ──────────────────────────────────────
// SECURITY: Carregada do ambiente — NUNCA hardcoded. Usada apenas pelo Express
// para validar que o chamador é a Edge Function datajud-bulk-proxy (Supabase).

const SCRAPER_SERVICE_KEY = process.env.SCRAPER_SERVICE_KEY ?? '';

// ─── Middleware de autenticação por x-service-key ────────────────────────────

function autenticarServiceKey(req: Request, res: Response, next: NextFunction): void {
  if (!SCRAPER_SERVICE_KEY) {
    console.error('[datajud/auth] SCRAPER_SERVICE_KEY não configurada no ambiente do servidor.');
    res.status(500).json({ error: 'Configuração de segurança ausente no servidor.' });
    return;
  }

  const serviceKey = req.headers['x-service-key'];
  if (serviceKey !== SCRAPER_SERVICE_KEY) {
    console.warn(
      `[datajud/auth] Tentativa de acesso não autorizado. ` +
      `IP: ${req.ip} | User-ID: ${req.headers['x-user-id'] ?? 'desconhecido'}`
    );
    res.status(401).json({ error: 'Não autorizado. x-service-key inválida.' });
    return;
  }

  next();
}

// ─── POST /api/datajud/bulk ──────────────────────────────────────────────────
// Recebe lista de processos CNJ da Edge Function datajud-bulk-proxy, executa
// consultas em paralelo no Elasticsearch do DataJud e retorna os dados
// enriquecidos (classe, assunto, juízo, movimentos, etc.).

datajudRouter.post('/bulk', autenticarServiceKey, async (req: Request, res: Response): Promise<void> => {
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
    res.status(400).json({ error: 'Campo "processos" não pode ser um array vazio.' });
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
    (p) => typeof p !== 'object' || p === null || typeof (p as Record<string, unknown>).numeroCNJ !== 'string'
  );
  if (processosInvalidos.length > 0) {
    res.status(400).json({
      error: 'Cada item do array "processos" deve ter o campo "numeroCNJ" como string.',
      itensInvalidos: processosInvalidos.slice(0, 5), // Retorna até 5 exemplos para diagnóstico
    });
    return;
  }

  const processosValidados = processos as ProcessoBulkInput[];

  // ── 2. Leitura segura da API Key do DataJud ──────────────────────────────
  const datajudApiKey = process.env.DATAJUD_API_KEY ?? '';
  if (!datajudApiKey) {
    console.error('[datajud/bulk] DATAJUD_API_KEY não configurada. Abortando consulta.');
    res.status(500).json({ error: 'Chave de API do DataJud não configurada no servidor.' });
    return;
  }

  // ── 3. Executa motor bulk (concorrência controlada + retry exponencial) ──
  try {
    const usuarioId = req.headers['x-user-id'] ?? 'desconhecido';
    console.info(
      `[datajud/bulk] Iniciando consulta bulk de ${processosValidados.length} processo(s). ` +
      `Usuário: ${usuarioId}`
    );

    const resultado = await consultarBulk(processosValidados, datajudApiKey);

    console.info(
      `[datajud/bulk] ✅ Concluído: ${resultado.encontrados}/${resultado.total} encontrados ` +
      `em ${resultado.duracao_ms}ms. Erros: ${resultado.erros.length}`
    );

    res.status(200).json(resultado);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[datajud/bulk] Erro interno na consulta bulk:', error.message, error.stack);

    // CRÍTICO: Retorna JSON estruturado — nunca deixa a Edge Function receber
    // texto puro ou HTML de erro, o que causaria falha de parse no Deno.
    res.status(500).json({
      error: 'Erro interno ao processar consulta bulk no DataJud.',
      detalhe: error.message ?? 'Erro desconhecido',
      total: 0,
      encontrados: 0,
      resultados: [],
      erros: [],
      duracao_ms: 0,
    });
  }
});
