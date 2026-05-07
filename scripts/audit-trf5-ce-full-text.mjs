#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_OUTPUT_DIR = 'reports/trf5-ce-full-text-audit';
const PAGE_SIZE = 1000;

function parseArgs(argv) {
  const args = {
    startDate: undefined,
    endDate: undefined,
    orgaosJulgadores: undefined,
    outputDir: DEFAULT_OUTPUT_DIR,
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
    } else if (arg === '--orgaos-julgadores' && next) {
      args.orgaosJulgadores = next.split(';').map((value) => value.trim()).filter(Boolean);
      index += 1;
    } else if (arg === '--output-dir' && next) {
      args.outputDir = next;
      index += 1;
    } else {
      throw new Error(`Argumento nao reconhecido: ${arg}`);
    }
  }

  if (!args.startDate || !args.endDate) {
    throw new Error('Informe --start-date e --end-date no formato YYYY-MM-DD.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(args.endDate)) {
    throw new Error('Datas devem usar o formato YYYY-MM-DD.');
  }
  if (Date.parse(`${args.startDate}T00:00:00Z`) > Date.parse(`${args.endDate}T00:00:00Z`)) {
    throw new Error('startDate deve ser menor ou igual a endDate.');
  }

  return args;
}

function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl?.startsWith('https://')) {
    throw new Error('SUPABASE_URL ausente ou invalida.');
  }
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente.');
  }

  return { supabaseUrl, serviceRoleKey };
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(rows, columns) {
  return [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(',')),
  ].join('\n');
}

async function fetchPage({ supabaseUrl, serviceRoleKey, args, from, to, includeCollectionMetadata }) {
  const selectColumns = [
    'id',
    'process_number',
    'process_number_raw',
    'source_url',
    'orgao_julgador',
    'trial_date',
    'excerpt',
    'full_text',
    ...(includeCollectionMetadata ? ['collection_metadata'] : []),
  ].join(',');

  const params = new URLSearchParams();
  params.set('select', selectColumns);
  params.set('source', 'eq.trf5');
  params.set('jurisdicao', 'eq.CE');
  params.set('trial_date', `gte.${args.startDate}`);
  params.append('trial_date', `lte.${args.endDate}`);
  params.set('order', 'trial_date.asc.nullslast,orgao_julgador.asc');

  const response = await fetch(`${supabaseUrl}/rest/v1/jurisprudences?${params}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Range: `${from}-${to}`,
      Prefer: 'count=exact',
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase REST ${response.status}: ${text.slice(0, 300)}`);
  }

  return {
    rows: text ? JSON.parse(text) : [],
    contentRange: response.headers.get('content-range'),
  };
}

async function fetchAllRows(config, args) {
  let includeCollectionMetadata = true;
  const rows = [];
  let from = 0;

  while (true) {
    let result;
    try {
      result = await fetchPage({
        ...config,
        args,
        from,
        to: from + PAGE_SIZE - 1,
        includeCollectionMetadata,
      });
    } catch (error) {
      if (includeCollectionMetadata && /collection_metadata/i.test(error.message)) {
        includeCollectionMetadata = false;
        continue;
      }
      throw error;
    }

    rows.push(...result.rows);
    if (result.rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const filteredRows = args.orgaosJulgadores?.length
    ? rows.filter((row) => args.orgaosJulgadores.includes(row.orgao_julgador))
    : rows;

  return { rows: filteredRows, includeCollectionMetadata };
}

function analyzeRow(row) {
  const excerpt = typeof row.excerpt === 'string' ? row.excerpt.trim() : '';
  const fullText = typeof row.full_text === 'string' ? row.full_text.trim() : '';
  const excerptLength = excerpt.length;
  const fullTextLength = fullText.length;
  const semFullText = fullTextLength === 0;
  const hasVoto = /\bVOTO\b/i.test(fullText);
  const semVoto = !semFullText && !hasVoto;
  const lengthDiff = Math.abs(fullTextLength - excerptLength);
  const closeThreshold = Math.max(120, Math.ceil(excerptLength * 0.15));
  const provavelApenasEmenta = !semFullText && excerptLength > 0 && lengthDiff <= closeThreshold;

  return {
    id: row.id,
    process_number: row.process_number,
    process_number_raw: row.process_number_raw,
    trial_date: row.trial_date,
    orgao_julgador: row.orgao_julgador,
    source_url: row.source_url,
    excerpt_length: excerptLength,
    full_text_length: fullTextLength,
    has_full_text: !semFullText,
    has_voto: hasVoto,
    sem_full_text: semFullText,
    sem_voto: semVoto,
    provavel_apenas_ementa: provavelApenasEmenta,
    full_text_excerpt_ratio: excerptLength > 0 ? Number((fullTextLength / excerptLength).toFixed(2)) : null,
    collection_metadata: row.collection_metadata ?? null,
  };
}

function buildDistribution(rows) {
  const byOrgao = new Map();

  for (const row of rows) {
    const key = row.orgao_julgador || 'Nao informado';
    const current = byOrgao.get(key) ?? {
      orgao_julgador: key,
      total: 0,
      com_full_text: 0,
      com_voto: 0,
      sem_full_text: 0,
      sem_voto: 0,
      provavel_apenas_ementa: 0,
    };

    current.total += 1;
    if (row.has_full_text) current.com_full_text += 1;
    if (row.has_voto) current.com_voto += 1;
    if (row.sem_full_text) current.sem_full_text += 1;
    if (row.sem_voto) current.sem_voto += 1;
    if (row.provavel_apenas_ementa) current.provavel_apenas_ementa += 1;
    byOrgao.set(key, current);
  }

  return [...byOrgao.values()].sort((a, b) => b.total - a.total || a.orgao_julgador.localeCompare(b.orgao_julgador));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = getSupabaseConfig();
  const { rows, includeCollectionMetadata } = await fetchAllRows(config, args);
  const analyzed = rows.map(analyzeRow);
  const distributionByOrgao = buildDistribution(analyzed);
  const problematic = analyzed
    .filter((row) => row.sem_full_text || row.sem_voto || row.provavel_apenas_ementa)
    .slice(0, 30);

  const timestamp = new Date().toISOString();
  const safeTimestamp = timestamp.replace(/[:.]/g, '-');
  const outputDir = path.resolve(args.outputDir);
  await mkdir(outputDir, { recursive: true });

  const detailColumns = [
    'process_number',
    'process_number_raw',
    'trial_date',
    'orgao_julgador',
    'excerpt_length',
    'full_text_length',
    'has_full_text',
    'has_voto',
    'sem_full_text',
    'sem_voto',
    'provavel_apenas_ementa',
    'full_text_excerpt_ratio',
    'source_url',
  ];
  const distributionColumns = [
    'orgao_julgador',
    'total',
    'com_full_text',
    'com_voto',
    'sem_full_text',
    'sem_voto',
    'provavel_apenas_ementa',
  ];

  const detailCsvPath = path.join(outputDir, `trf5-ce-full-text-audit-${safeTimestamp}.csv`);
  const distributionCsvPath = path.join(outputDir, `trf5-ce-full-text-audit-by-orgao-${safeTimestamp}.csv`);
  const jsonPath = path.join(outputDir, `trf5-ce-full-text-audit-${safeTimestamp}.json`);

  const summary = {
    timestamp,
    period: {
      startDate: args.startDate,
      endDate: args.endDate,
    },
    filters: {
      orgaosJulgadores: args.orgaosJulgadores ?? 'todos',
    },
    collectionMetadataColumnSelected: includeCollectionMetadata,
    totals: {
      total: analyzed.length,
      com_full_text: analyzed.filter((row) => row.has_full_text).length,
      com_voto: analyzed.filter((row) => row.has_voto).length,
      sem_full_text: analyzed.filter((row) => row.sem_full_text).length,
      sem_voto: analyzed.filter((row) => row.sem_voto).length,
      provavel_apenas_ementa: analyzed.filter((row) => row.provavel_apenas_ementa).length,
    },
    distributionByOrgao,
    problematicSamples: problematic,
    outputFiles: {
      json: jsonPath,
      detailCsv: detailCsvPath,
      distributionCsv: distributionCsvPath,
    },
  };

  await writeFile(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await writeFile(detailCsvPath, `${toCsv(analyzed, detailColumns)}\n`, 'utf8');
  await writeFile(distributionCsvPath, `${toCsv(distributionByOrgao, distributionColumns)}\n`, 'utf8');

  console.log(JSON.stringify({
    totals: summary.totals,
    outputFiles: summary.outputFiles,
  }, null, 2));
}

main().catch((error) => {
  console.error(`FATAL: ${error.message}`);
  process.exitCode = 1;
});
