#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_START_DATE = '2025-01-01';
const DEFAULT_END_DATE = '2026-05-05';
const DEFAULT_MODE = 'initial_import';
const ALLOWED_CHUNK_MODES = new Set(['monthly', 'quarterly', 'single']);

function parseArgs(argv) {
  const args = {
    startDate: DEFAULT_START_DATE,
    endDate: DEFAULT_END_DATE,
    mode: DEFAULT_MODE,
    chunk: 'quarterly',
    reportDir: 'reports/trf5-ce-import',
    maxPagesPerTerm: undefined,
    terms: undefined,
    orgaosJulgadores: undefined,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--start-date' && next) {
      args.startDate = next;
      index += 1;
    } else if (arg === '--end-date' && next) {
      args.endDate = next;
      index += 1;
    } else if (arg === '--mode' && next) {
      args.mode = next;
      index += 1;
    } else if (arg === '--chunk' && next) {
      args.chunk = next;
      index += 1;
    } else if (arg === '--report-dir' && next) {
      args.reportDir = next;
      index += 1;
    } else if (arg === '--max-pages-per-term' && next) {
      args.maxPagesPerTerm = Number(next);
      index += 1;
    } else if (arg === '--terms' && next) {
      args.terms = next.split(';').map((term) => term.trim()).filter(Boolean);
      index += 1;
    } else if (arg === '--orgaos-julgadores' && next) {
      args.orgaosJulgadores = next.split(';').map((orgao) => orgao.trim()).filter(Boolean);
      index += 1;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else {
      throw new Error(`Argumento nao reconhecido: ${arg}`);
    }
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(args.endDate)) {
    throw new Error('Datas devem usar o formato YYYY-MM-DD.');
  }

  if (Date.parse(`${args.startDate}T00:00:00Z`) > Date.parse(`${args.endDate}T00:00:00Z`)) {
    throw new Error('startDate deve ser menor ou igual a endDate.');
  }

  if (!ALLOWED_CHUNK_MODES.has(args.chunk)) {
    throw new Error('chunk deve ser monthly, quarterly ou single.');
  }

  if (
    args.maxPagesPerTerm !== undefined
    && (!Number.isInteger(args.maxPagesPerTerm) || args.maxPagesPerTerm < 1 || args.maxPagesPerTerm > 50)
  ) {
    throw new Error('max-pages-per-term deve ser inteiro entre 1 e 50.');
  }

  return args;
}

function addMonths(date, months) {
  const copy = new Date(date.getTime());
  copy.setUTCMonth(copy.getUTCMonth() + months);
  return copy;
}

function toIso(date) {
  return date.toISOString().slice(0, 10);
}

function buildIntervals(startDate, endDate, chunk) {
  if (chunk === 'single') return [{ startDate, endDate }];

  const months = chunk === 'monthly' ? 1 : 3;
  const end = new Date(`${endDate}T00:00:00Z`);
  const intervals = [];
  let cursor = new Date(`${startDate}T00:00:00Z`);

  while (cursor <= end) {
    const intervalStart = toIso(cursor);
    const next = addMonths(cursor, months);
    next.setUTCDate(next.getUTCDate() - 1);
    const intervalEnd = next > end ? endDate : toIso(next);
    intervals.push({ startDate: intervalStart, endDate: intervalEnd });
    cursor = addMonths(cursor, months);
  }

  return intervals;
}

function sanitizeReport(result, interval, payload) {
  const metrics = result?.metrics ?? {};

  return {
    timestamp: new Date().toISOString(),
    interval,
    request: {
      mode: payload.mode,
      startDate: payload.startDate,
      endDate: payload.endDate,
      terms: Array.isArray(payload.terms) ? payload.terms.length : 'default',
      orgaosJulgadores: Array.isArray(payload.orgaosJulgadores) ? payload.orgaosJulgadores.length : 'default',
      maxPagesPerTerm: payload.maxPagesPerTerm ?? 'edge-default',
    },
    success: Boolean(result?.success),
    found: metrics.found ?? 0,
    normalized: metrics.normalized ?? 0,
    inserted: metrics.inserted ?? 0,
    updated: metrics.updated ?? 0,
    ignored: metrics.ignored ?? 0,
    duplicateExact: metrics.duplicateExact ?? 0,
    duplicateSimilarity: metrics.duplicateSimilarity ?? 0,
    unique: metrics.unique ?? 0,
    errors: metrics.errors ?? 0,
    portalRequests: metrics.portalRequests ?? 0,
    truncated: Boolean(metrics.truncated),
    errorSamples: Array.isArray(result?.errorSamples) ? result.errorSamples.slice(0, 5) : [],
    observations: metrics.truncated ? 'Intervalo truncado pelo limite de paginas; retome com janela menor.' : '',
  };
}

async function callScrapeTrf5(payload) {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl?.startsWith('https://')) {
    throw new Error('SUPABASE_URL ausente ou invalida.');
  }
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente.');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/scrape-trf5`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      'x-region': 'sa-east-1',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { success: false, error: 'Resposta nao JSON da Edge Function.' };
  }

  if (!response.ok || !data?.success) {
    throw new Error(`scrape-trf5 HTTP ${response.status}: ${data?.error ?? 'falha sem mensagem'}`);
  }

  return data;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const intervals = buildIntervals(args.startDate, args.endDate, args.chunk);
  const reports = [];

  if (args.dryRun) {
    console.log(JSON.stringify({ dryRun: true, intervals }, null, 2));
    return;
  }

  await mkdir(args.reportDir, { recursive: true });

  for (const interval of intervals) {
    const payload = {
      mode: args.mode,
      startDate: interval.startDate,
      endDate: interval.endDate,
    };

    if (args.maxPagesPerTerm !== undefined) payload.maxPagesPerTerm = args.maxPagesPerTerm;
    if (args.terms?.length) payload.terms = args.terms;
    if (args.orgaosJulgadores?.length) payload.orgaosJulgadores = args.orgaosJulgadores;

    const result = await callScrapeTrf5(payload);
    const report = sanitizeReport(result, interval, payload);
    reports.push(report);

    const fileName = `trf5-ce-${interval.startDate}_${interval.endDate}.json`;
    await writeFile(path.join(args.reportDir, fileName), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));

    if (report.errors > 0 || report.truncated) {
      throw new Error(`Intervalo ${interval.startDate} a ${interval.endDate} exige revisao antes de prosseguir.`);
    }
  }

  const summary = {
    timestamp: new Date().toISOString(),
    startDate: args.startDate,
    endDate: args.endDate,
    chunk: args.chunk,
    batches: reports.length,
    totals: reports.reduce((acc, report) => {
      for (const key of [
        'found',
        'normalized',
        'inserted',
        'updated',
        'ignored',
        'duplicateExact',
        'duplicateSimilarity',
        'unique',
        'errors',
        'portalRequests',
      ]) {
        acc[key] = (acc[key] ?? 0) + report[key];
      }
      acc.truncated = Boolean(acc.truncated || report.truncated);
      return acc;
    }, {}),
  };

  await writeFile(path.join(args.reportDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(`FATAL: ${error.message}`);
  process.exit(1);
});
