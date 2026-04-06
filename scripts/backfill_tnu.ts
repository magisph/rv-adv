import fs from "fs";
import path from "path";

// ─── PARÂMETROS GERAIS E ESTRUTURA CORPORATIVA ─────────────────────────────
const MAX_CONSECUTIVE_ERRORS = 5;
const CIRCUIT_BREAKER_WAIT_MS = 60000; // 1 minuto em estado quebrado (Breaker status)
const BASE_WAIT_MS = 2000;
const TEST_SAFE_MODE = true; // [OBRIGATÓRIO SAFE GATE] -> Processa SÓ O PRIMEIRO INTERVALO por segurança e para

const SUPABASE_URL = process.env.SUPABASE_URL || "NAO_FORNECIDA";
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "NAO_FORNECIDA";
const FN_URL = `${SUPABASE_URL}/functions/v1/scrape-tnu`;

const CHECKPOINT_PATH = path.join(process.cwd(), "scripts", "checkpoint_tnu.json");

interface Interval { start: string; end: string; }
interface Checkpoint { intervals_pending: Interval[]; intervals_done: Interval[]; }

// Gerador padronizado de blocos de 30 dias para não colidir com HTTP 400 da Fase 3
function generateIntervals(startDate: string, endDate: string): Interval[] {
    const intervals: Interval[] = [];
    let current = new Date(`${startDate}T12:00:00Z`); // UTC blind para gerar T0
    const finalDate = new Date(`${endDate}T12:00:00Z`);

    while (current <= finalDate) {
        let chunkEnd = new Date(current);
        chunkEnd.setDate(current.getDate() + 29); // +29 dias garante bloco exato de 30 dias inclusivo
        if (chunkEnd > finalDate) chunkEnd = new Date(finalDate);

        intervals.push({
            start: current.toISOString().split("T")[0],
            end: chunkEnd.toISOString().split("T")[0]
        });

        current = new Date(chunkEnd);
        current.setDate(current.getDate() + 1);
    }
    return intervals;
}

function loadCheckpoint(): Checkpoint {
    if (fs.existsSync(CHECKPOINT_PATH)) {
        return JSON.parse(fs.readFileSync(CHECKPOINT_PATH, "utf8"));
    }
    return {
        // Geraremos a esteira principal do backfill (2022 - 2026)
        intervals_pending: generateIntervals("2022-01-01", "2026-12-31"),
        intervals_done: []
    };
}

function saveCheckpoint(state: Checkpoint) {
    fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(state, null, 2));
}

async function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function runBackfill() {
    console.log("🚀 Orquestrador Lixo Zero (Pipeline Edge-Backfill)");
    if (TEST_SAFE_MODE) console.log("⚠️ SAFE GATE (TEST_SAFE_MODE=true): Limitei a UMA ITERAÇÃO de janela para não inflar billing.");
    if (ANON_KEY === "NAO_FORNECIDA" || SUPABASE_URL === "NAO_FORNECIDA") {
        console.error("❌ ERRO AMBIENTAL: Necessário variáveis SUPABASE_URL e SUPABASE_ANON_KEY(ou SERVICE_ROLE_KEY) carregadas.");
        return process.exit(1);
    }

    const state = loadCheckpoint();
    console.log(`📌 Persistência JSON: Pendentes (${state.intervals_pending.length}) | Fechados (${state.intervals_done.length})`);

    let consecutiveErrors = 0;

    while (state.intervals_pending.length > 0) {
        const interval = state.intervals_pending[0];
        console.log(`\n⏳ START CHUNK: ${interval.start} ao ${interval.end}`);

        let isFinished = false;
        let currentOffset = 0;

        while (!isFinished) {
            // [CIRCUIT BREAKER: PATTERN ACTUATION]
            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                console.warn(`🔥 CIRCUIT BREAKER TRIGGER: Múltiplas quebras detectadas (${consecutiveErrors}). Desarmando circuito por ${CIRCUIT_BREAKER_WAIT_MS/1000}s...`);
                await sleep(CIRCUIT_BREAKER_WAIT_MS);
                consecutiveErrors = 2; // Estado Half-Open
                console.log("🧊 Half-Open. Tentando recomeçar fluxo...");
            }

            try {
                console.log(`   🔸 [Fetching Edge] Offset=${currentOffset}`);
                const payload = {
                    termo: "previdenciário",
                    dataInicio: interval.start,
                    dataFim: interval.end,
                    offset: currentOffset
                };

                const startResp = Date.now();
                const res = await fetch(FN_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${ANON_KEY}`
                    },
                    body: JSON.stringify(payload)
                });
                
                // Tratamento nativo HTTP de Throttles e Errors Temporários do host ou TNU
                if (res.status === 429 || res.status >= 500) {
                    consecutiveErrors++;
                    const expWait = (BASE_WAIT_MS * Math.pow(2, consecutiveErrors));
                    console.log(`   ❌ Instabilidade Transiente (HTTP ${res.status}). Timeout Escalonado Exponential Backoff em ${expWait}ms`);
                    await sleep(expWait);
                    continue; 
                }

                // Tratar quebras permanentes de requisição (Fail-fast rules de Fase 3)
                if (!res.ok) {
                    const failText = await res.text();
                    console.error(`   ‼️ VIOLAÇÃO CRÍTICA DO SCRAPER PAYLOAD (HTTP ${res.status}): ${failText}`);
                    process.exit(1); 
                }

                const data = await res.json();
                const elapsedHtml = Date.now() - startResp;
                console.log(`   🎯 [Edge Resp] Ping: ${elapsedHtml}ms | msg: "${data.message}"`);
                console.log(`      > [Estatísticas] Total TNU: ${data.total_tnu} | Extraídos Validos(Schema): ${data.coletados} | Salvamentos Reais: ${data.salvos} | Next-Page: ${data.proximo_disponivel}`);

                consecutiveErrors = 0;

                // TNU Retorna '0' de total se não achar nada; Proteger contra NaN com Type Check
                if (!data.proximo_disponivel || typeof data.proximo_offset !== 'number' || data.total_tnu <= data.proximo_offset) {
                    isFinished = true;
                } else {
                    currentOffset = data.proximo_offset;
                    await sleep(1500); // Politeness delay estrito p/ não derrubar tribunais
                }
            } catch (err: any) {
                consecutiveErrors++;
                console.error(`   ❌ FALHA AMBIENTAL/CONEXÃO: ${err.message}. Histórico (Errors=${consecutiveErrors})`);
                await sleep(BASE_WAIT_MS * Math.pow(2, consecutiveErrors));
            }
        } // fim-while da Paginação

        // Commit da operação de bloco — shift() remove atômico o primeiro elemento da fila
        console.log(`✅ JANELA: ${interval.start} até ${interval.end} EXAURIDA. Extração 100%.`);
        state.intervals_done.push(interval);
        state.intervals_pending.shift();

        // File Flush do State
        saveCheckpoint(state);

        if (TEST_SAFE_MODE) {
            console.log("\n🔒 SAFE GATE ACIONADO (TEST_SAFE_MODE). Interrupção controlada de sucesso.");
            process.exit(0);
        }
    } 

    if (!TEST_SAFE_MODE) {
        console.log("🏁 ORQUESTRAÇÃO MACRO DO BACKFILL CONCLUÍDA.");
    }
}

// Inicia Fluxo
runBackfill();
