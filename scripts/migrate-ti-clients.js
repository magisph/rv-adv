#!/usr/bin/env node
/**
 * ============================================================
 * CAMINHÃO DE MUDANÇA — Migração TI → RV-Adv
 * ============================================================
 * Importa clientes da API da Tramitação Inteligente e faz
 * upsert na tabela `clients` do Supabase (via service role key,
 * ignorando Row Level Security).
 *
 * Variáveis de ambiente necessárias (.env):
 *   VITE_SUPABASE_URL         — URL da instância Supabase
 *   SUPABASE_SERVICE_ROLE_KEY — Chave service_role (ignora RLS)
 *   TI_API_KEY                — Bearer token da API TI
 *
 * Uso:
 *   node scripts/migrate-ti-clients.js
 * ============================================================
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// ── 0. Carregar variáveis de ambiente ────────────────────────
dotenv.config({ path: '.env' });

const SUPABASE_URL           = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TI_API_KEY             = process.env.TI_API_KEY;
const TI_BASE_URL            = 'https://planilha.tramitacaointeligente.com.br/api/v1/clientes';

// ── Validação inicial ────────────────────────────────────────
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !TI_API_KEY) {
  console.error('[ERRO] Variáveis de ambiente ausentes.');
  console.error('  -> Verifique: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TI_API_KEY');
  process.exit(1);
}

// ── 1. Inicializar Supabase com service role (bypassa RLS) ───
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ── 2. ALFÂNDEGA — Sanitização de strings vazias para null ───
/**
 * Converte qualquer propriedade com valor string vazia ("") para null.
 * Evita o erro 400 / PGRST204 do PostgreSQL para campos opcionais.
 * @param {Record<string, unknown>} obj
 * @returns {Record<string, unknown>}
 */
function sanitizeNulls(obj) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key,
      value === '' ? null : value,
    ])
  );
}

// ── 3. TRIAGEM — Determinar área de atuação ─────────────────
/**
 * Lógica de triagem de área:
 *  - Se qualquer tag inclui "cível" (case insensitive) → 'cível'
 *  - Senão, se meu_inss_pass preenchido              → 'previdenciario'
 *  - Senão                                            → null (sem área definida)
 *
 * @param {Array<{nome?: string, name?: string}>} tags
 * @param {string|null|undefined} meuInssPass
 * @returns {'cível'|'previdenciario'|null}
 */
function determinarArea(tags = [], meuInssPass) {
  const tagNomes = Array.isArray(tags) ? tags : [];
  const temCivel = tagNomes.some((tag) => {
    const nome = (tag?.nome || tag?.name || '').toLowerCase();
    return nome.includes('cível') || nome.includes('civel');
  });

  if (temCivel) return 'cível';
  if (meuInssPass && String(meuInssPass).trim() !== '') return 'previdenciario';
  return null;
}

// ── 4. DE-PARA — Mapeamento de campos TI → RV-Adv ───────────
/**
 * Mapeia um objeto bruto da API TI para a estrutura da tabela `clients`.
 * @param {Record<string, unknown>} tiCliente
 * @returns {Record<string, unknown>}
 */
function mapearCliente(tiCliente) {
  const areaDeAtuacao = determinarArea(tiCliente.tags, tiCliente.meu_inss_pass);

  const mapeado = {
    // ── Identificação ──────────────────────────────────────
    full_name    : tiCliente.name        ?? null,
    cpf_cnpj     : tiCliente.cpf_cnpj    ?? null,

    // ── Contato ────────────────────────────────────────────
    email        : tiCliente.email       ?? null,

    // ── E-MAIL EXCLUSIVO TI (novo campo) ──────────────────
    // Mapeado estritamente para ti_email_exclusivo, NUNCA sobrescreve email.
    ti_email_exclusivo: tiCliente.email_exclusivo ?? null,

    // ── Pessoal ────────────────────────────────────────────
    phone        : tiCliente.celular     ?? tiCliente.phone ?? null,
    data_nascimento: tiCliente.data_nascimento ?? null,
    profissao    : tiCliente.profissao   ?? null,
    observacoes_processos_anteriores: tiCliente.observacoes ?? null,

    // ── Localização ────────────────────────────────────────
    address      : tiCliente.endereco    ?? tiCliente.address ?? null,
    city         : tiCliente.cidade      ?? tiCliente.city    ?? null,
    state        : tiCliente.estado      ?? tiCliente.state   ?? null,
    zip_code     : tiCliente.cep         ?? tiCliente.zip_code ?? null,

    // ── INSS / Previdenciário ──────────────────────────────
    senha_meu_inss : tiCliente.meu_inss_pass ?? null,
    numero_processo_administrativo: tiCliente.numero_beneficio ?? null,

    // ── TRIAGEM — Área de atuação ──────────────────────────
    area_atuacao : areaDeAtuacao,

    // ── Status (prospecto por padrão para importações) ─────
    status       : 'prospecto',
  };

  // ── NULL SAFETY — Eliminar strings vazias ─────────────────
  return sanitizeNulls(mapeado);
}

// ── 5. FETCH PAGINADO — Buscar todos os clientes da API TI ──
/**
 * Itera sobre todas as páginas da API TI e retorna array com todos
 * os clientes.
 * @returns {Promise<Record<string, unknown>[]>}
 */
async function buscarTodosClientesTI() {
  const clientes = [];
  let paginaAtual = 1;
  let totalPaginas = 1; // atualizado após primeira resposta

  console.log('[TI] Iniciando coleta paginada da API...');

  while (paginaAtual <= totalPaginas) {
    const url = `${TI_BASE_URL}?page=${paginaAtual}`;
    console.log(`[TI] Buscando página ${paginaAtual} de ${totalPaginas}... (${url})`);

    const resposta = await fetch(url, {
      method : 'GET',
      headers: {
        'Authorization': `Bearer ${TI_API_KEY}`,
        'Content-Type' : 'application/json',
        'Accept'       : 'application/json',
      },
    });

    if (!resposta.ok) {
      const corpo = await resposta.text();
      throw new Error(`[TI] HTTP ${resposta.status} na página ${paginaAtual}: ${corpo}`);
    }

    const json = await resposta.json();

    // ── Extrair dados e paginação ────────────────────────
    const registros  = json.data    ?? json.clientes ?? json.results ?? [];
    const paginacao  = json.pagination ?? json.meta ?? {};
    totalPaginas     = paginacao.pages ?? paginacao.last_page ?? paginacao.total_pages ?? 1;

    clientes.push(...registros);
    console.log(`  → ${registros.length} clientes recebidos (total acumulado: ${clientes.length})`);

    paginaAtual++;
  }

  console.log(`[TI] Coleta concluída. Total de clientes: ${clientes.length}`);
  return clientes;
}

// ── 6. INSERÇÃO SEGURA — Upsert em lotes ────────────────────
const TAMANHO_LOTE = 100; // upsert em lotes para evitar timeout

/**
 * Realiza upsert dos clientes mapeados na tabela `clients`,
 * usando cpf_cnpj como chave de conflito.
 * @param {Record<string, unknown>[]} clientesMapeados
 */
async function upsertClientes(clientesMapeados) {
  // Filtrar clientes sem cpf_cnpj (campo NOT NULL na tabela)
  const validos = clientesMapeados.filter((c) => {
    if (!c.cpf_cnpj) {
      console.warn(`[WARN] Cliente sem cpf_cnpj ignorado: ${c.full_name ?? 'SEM NOME'}`);
      return false;
    }
    return true;
  });

  console.log(`\n[DB] Iniciando upsert de ${validos.length} clientes válidos em lotes de ${TAMANHO_LOTE}...`);

  let inseridos = 0;
  let erros     = 0;

  for (let i = 0; i < validos.length; i += TAMANHO_LOTE) {
    const lote       = validos.slice(i, i + TAMANHO_LOTE);
    const numeroLote = Math.floor(i / TAMANHO_LOTE) + 1;

    const { error } = await supabase
      .from('clients')
      .upsert(lote, {
        onConflict         : 'cpf_cnpj',
        ignoreDuplicates   : false,  // atualiza o registro existente
      });

    if (error) {
      console.error(`[DB] ERRO no lote ${numeroLote}:`, error.message, error.details ?? '');
      erros += lote.length;
    } else {
      inseridos += lote.length;
      console.log(`[DB] Lote ${numeroLote} inserido/atualizado com sucesso (${lote.length} registros)`);
    }
  }

  return { inseridos, erros };
}

// ── MAIN ─────────────────────────────────────────────────────
async function main() {
  console.log('════════════════════════════════════════════════════');
  console.log('  CAMINHÃO DE MUDANÇA — Migração TI → RV-Adv');
  console.log('════════════════════════════════════════════════════\n');

  try {
    // 1. Buscar todos os clientes da API TI
    const clientesBrutos = await buscarTodosClientesTI();

    if (clientesBrutos.length === 0) {
      console.warn('[WARN] Nenhum cliente retornado pela API. Encerrando.');
      process.exit(0);
    }

    // 2. Aplicar De-Para + Null Safety em cada cliente
    console.log('\n[ALFÂNDEGA] Mapeando e sanitizando clientes...');
    const clientesSaneados = clientesBrutos.map(mapearCliente);
    console.log(`  → ${clientesSaneados.length} clientes mapeados.`);

    // 3. Upsert no Supabase
    const { inseridos, erros } = await upsertClientes(clientesSaneados);

    // 4. Relatório final
    console.log('\n════════════════════════════════════════════════════');
    console.log('  RELATÓRIO FINAL');
    console.log('════════════════════════════════════════════════════');
    console.log(`  Total recebidos da API : ${clientesBrutos.length}`);
    console.log(`  Inseridos/Atualizados  : ${inseridos}`);
    console.log(`  Erros                  : ${erros}`);
    console.log('════════════════════════════════════════════════════\n');

    process.exit(erros > 0 ? 1 : 0);
  } catch (err) {
    console.error('\n[FATAL]', err.message);
    process.exit(1);
  }
}

main();
