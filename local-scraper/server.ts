import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { iniciarExtracaoPje } from './crawlers/pje-crawler.js';
import { iniciarScrapingTNU } from './crawlers/tnu-crawler.js';
import { datajudRouter } from './src/routes/datajud.js';

// ─── Config ────────────────────────────────────────────────────────
const envPath = path.resolve(import.meta.dirname, '../.env');
dotenv.config({ path: envPath });

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ─── Supabase Client ───────────────────────────────────────────────
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

// ─── CNJ APIs Config (DataJud + DJEN) ───────────────────────────────
// SECURITY: A chave DataJud é carregada do ambiente. Nunca commitar chaves reais.
const DATAJUD_API_KEY = process.env.DATAJUD_API_KEY || '';
if (!DATAJUD_API_KEY) {
  console.warn('⚠️  DATAJUD_API_KEY não configurada. Defina-a em .env antes de usar as APIs CNJ.');
}
const DATAJUD_BASE = 'https://api-publica.datajud.cnj.jus.br';
const DJEN_BASE = 'https://comunicaapi.pje.jus.br';

// ─── Gerenciador de Sessões OTP (TTL 5 min) ────────────────────────
interface OtpSession {
  cpf: string;
  senha: string;
  resolve: (otp: string) => void;
  timer: ReturnType<typeof setTimeout>;
}

const pendingOtpSessions = new Map<string, OtpSession>();
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutos

function criarSessaoOtp(sessionId: string, cpf: string, senha: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingOtpSessions.delete(sessionId);
      reject(new Error('Sessão OTP expirada (timeout 5min).'));
    }, OTP_TTL_MS);

    pendingOtpSessions.set(sessionId, { cpf, senha, resolve, timer });
  });
}

function resolverOtp(sessionId: string, otp: string): boolean {
  const session = pendingOtpSessions.get(sessionId);
  if (!session) return false;

  clearTimeout(session.timer);
  session.resolve(otp);
  pendingOtpSessions.delete(sessionId);
  return true;
}

// ─── Rotas ──────────────────────────────────────────────────────────

// Healthcheck
app.get('/status', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    sessoesOtp: pendingOtpSessions.size,
  });
});

// Configurar credenciais MNI para o PJe
app.post('/configurar/mni', async (req: Request, res: Response) => {
  try {
    const { cpf, senha } = req.body;

    if (!cpf || !senha) {
      res.status(400).json({ error: 'CPF e Senha são obrigatórios.' });
      return;
    }

    // Salva no .env local do scraper
    const envContent = `PJE_CPF=${cpf}\nPJE_SENHA=${senha}\n`;
    fs.writeFileSync(envPath, envContent, 'utf-8');

    // Gera um sessionId e abre sessão OTP aguardando o código 2FA
    const sessionId = `otp_${Date.now()}`;

    // Dispara a validação em background (não bloqueia a resposta)
    criarSessaoOtp(sessionId, cpf, senha)
      .then((otp) => {
        console.log(`[OTP] Sessão ${sessionId} resolvida com código 2FA.`);
      })
      .catch((err) => {
        console.warn(`[OTP] ${err.message}`);
      });

    res.json({
      message: 'Credenciais salvas. Aguardando código 2FA.',
      sessionId,
    });
  } catch (err: any) {
    console.error('[/configurar/mni] Erro:', err);
    res.status(500).json({ error: err.message });
  }
});

// Recebe o código 2FA e completa o login
app.post('/configurar/mni/otp', (req: Request, res: Response) => {
  try {
    const { sessionId, otp } = req.body;

    if (!sessionId || !otp) {
      res.status(400).json({ error: 'sessionId e otp são obrigatórios.' });
      return;
    }

    const resolvido = resolverOtp(sessionId, otp);

    if (!resolvido) {
      res.status(404).json({ error: 'Sessão OTP não encontrada ou expirada.' });
      return;
    }

    // Salva OTP na memória do servidor para repasse ao crawler
    process.env.PJE_OTP = otp;

    res.json({ message: 'Código 2FA recebido. Login sendo finalizado.' });
  } catch (err: any) {
    console.error('[/configurar/mni/otp] Erro:', err);
    res.status(500).json({ error: err.message });
  }
});

// Disparo da extração de processos
app.post('/advogado/processos', async (req: Request, res: Response) => {
  try {
    const { cpf, senha, oab, uf } = req.body;

    const cpfFinal = cpf || process.env.PJE_CPF;
    const senhaFinal = senha || process.env.PJE_SENHA;

    if (!cpfFinal || !senhaFinal) {
      res.status(400).json({
        error: 'Credenciais não encontradas. Configure via /configurar/mni primeiro.',
      });
      return;
    }

    if (!oab || !uf) {
      res.status(400).json({ error: 'OAB e UF são obrigatórios.' });
      return;
    }

    // Captura OTP antes do disparo e limpa imediatamente
    const otpFinal = process.env.PJE_OTP || '';
    process.env.PJE_OTP = '';

    // Dispara o crawler em background
    console.log(`[Extração] Iniciando PJe para OAB ${oab}/${uf}...`);

    iniciarExtracaoPje(cpfFinal, senhaFinal, oab, uf, otpFinal)
      .then((resultado) => {
        console.log(`[Extração] Concluída. ${resultado.processos.length} processos encontrados.`);
      })
      .catch((err) => {
        console.error('[Extração] Falha:', err.message);
      });

    res.json({
      message: `Extração iniciada para OAB ${oab}/${uf}. Acompanhe pelo /status.`,
    });
  } catch (err: any) {
    console.error('[/advogado/processos] Erro:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Proxy CNJ: DataJud (consulta individual legada) ────────────────────────
app.post('/api/cnj/datajud', async (req: Request, res: Response) => {
  try {
    const { sigla, numeroFormatado } = req.body;

    if (!sigla || !numeroFormatado) {
      res.status(400).json({ error: 'sigla e numeroFormatado são obrigatórios.' });
      return;
    }

    const endpoint = `${DATAJUD_BASE}/api_publica_${sigla.toLowerCase()}/_search`;

    const numeroPuro = numeroFormatado.replace(/\D/g, '');

    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: DATAJUD_API_KEY,
      },
      body: JSON.stringify({
        query: { match: { numeroProcesso: numeroPuro } },
      }),
    });

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err: any) {
    console.error('[/api/cnj/datajud] Erro:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Proxy CNJ: DataJud BULK — Alta Performance ──────────────────────────────
// POST /api/datajud/bulk
// Delegado ao controlador isolado src/routes/datajud.ts
// (autenticação por x-service-key, validação de payload e motor bulk internos)
// ─────────────────────────────────────────────────────────────────────────────
app.use('/api/datajud', datajudRouter);

// ─── Proxy CNJ: DJEN ────────────────────────────────────────────────
app.get('/api/cnj/djen', async (req: Request, res: Response) => {
  try {
    const params = new URLSearchParams(req.query as Record<string, string>);
    const url = `${DJEN_BASE}/api/v1/comunicacao?${params.toString()}`;

    const upstream = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err: any) {
    console.error('[/api/cnj/djen] Erro:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Vigia DJEN — Worker de Background ──────────────────────────────
// Detecta novas publicações e insere notificações diretamente no Supabase.
// ─────────────────────────────────────────────────────────────────────

const DJEN_SEEN_PATH = path.resolve(import.meta.dirname, 'djen_seen.json');
const VIGIA_INTERVAL_MS = 60 * 60 * 1000; // 1 hora

/**
 * getField — Extrator blindado contra inconsistência de case nas chaves.
 * Varre todas as chaves de `obj` comparando em lowercase com o array `keys`.
 */
function getField(obj: Record<string, any>, keys: string[], fallback: any = null): any {
  if (!obj || typeof obj !== 'object') return fallback;
  const entries = Object.entries(obj);
  const normalized = keys.map((k) => k.toLowerCase());
  for (const nk of normalized) {
    for (const [key, value] of entries) {
      if (key.toLowerCase() === nk && value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
  }
  return fallback;
}

/**
 * Lê o arquivo de memória persistente (IDs já vistos).
 */
function lerSeenIds(): { seen: string[]; lastCheck: string } {
  try {
    if (fs.existsSync(DJEN_SEEN_PATH)) {
      const raw = fs.readFileSync(DJEN_SEEN_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[Vigia DJEN] Erro ao ler djen_seen.json, recriando...', (err as Error).message);
  }
  return { seen: [], lastCheck: '' };
}

/**
 * Salva os IDs vistos no disco.
 */
function salvarSeenIds(data: { seen: string[]; lastCheck: string }): void {
  fs.writeFileSync(DJEN_SEEN_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Worker principal: consulta o DJEN, detecta comunicações inéditas,
 * atualiza memória persistente e enfileira para consumo do frontend.
 */
async function vigiarDJEN(): Promise<void> {
  console.log('\n[Vigia DJEN] Acordando...');

  try {
    // SECURITY: Dados do advogado carregados do ambiente. Nunca commitar dados pessoais.
    const numeroOab = process.env.DJEN_NUMERO_OAB || '';
    const ufOab = process.env.DJEN_UF_OAB || '';
    const nomeAdvogado = process.env.DJEN_NOME_ADVOGADO || '';
    const dataInicio = process.env.DJEN_DATA_INICIO || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (!numeroOab || !ufOab) {
      console.warn('[Vigia DJEN] DJEN_NUMERO_OAB ou DJEN_UF_OAB não configurados. Pulando ciclo.');
      return;
    }

    const params = new URLSearchParams({
      numeroOab,
      ufOab,
      ...(nomeAdvogado ? { nomeAdvogado } : {}),
      dataDisponibilizacaoInicio: dataInicio,
    });

    const url = `${DJEN_BASE}/api/v1/comunicacao?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      console.error(`[Vigia DJEN] Erro HTTP ${response.status}: ${response.statusText}`);
      return;
    }

    const json = await response.json();

    // Normaliza — a API pode retornar lista direta ou wrapper
    const comunicacoes: any[] = Array.isArray(json)
      ? json
      : json?.comunicacoes ?? json?.items ?? json?.content ?? [];

    if (comunicacoes.length === 0) {
      console.log('[Vigia DJEN] Nenhuma comunicação retornada pela API.');
      return;
    }

    // Carrega IDs já vistos
    const memory = lerSeenIds();
    const seenSet = new Set(memory.seen);

    // Detecta inéditas
    const novas: any[] = [];

    for (const com of comunicacoes) {
      // Extrai um ID único robusto (case-insensitive)
      const id = String(
        getField(com, ['numerocomunicacao', 'numero_comunicacao', 'id', 'idcomunicacao']) ??
        getField(com, ['numeroprocesso', 'numero_processo', 'numero']) ??
        JSON.stringify(com)
      );

      if (!seenSet.has(id)) {
        seenSet.add(id);
        novas.push(com);
      }
    }

    // Atualiza memória persistente
    memory.seen = Array.from(seenSet);
    memory.lastCheck = new Date().toISOString();
    salvarSeenIds(memory);

    if (novas.length > 0) {
      console.log(`[Vigia DJEN] 🔔 ${novas.length} nova(s) intimação(ões) encontrada(s)!`);

      for (const n of novas) {
        const proc = getField(n, ['numeroprocesso', 'numero_processo', 'numero']) ?? '?';
        const tipo = getField(n, ['tipocomunicacao', 'tipo_comunicacao', 'tipo']) ?? 'Publicação';
        console.log(`   └─ ${proc} — ${tipo}`);

        // Data de corte: só notifica comunicações a partir de 14/03/2026
        const dataDispRaw = getField(n, ['datadisponibilizacao', 'data_disponibilizacao']);
        const dataDisp = new Date(dataDispRaw);
        const dataCorte = new Date('2026-03-16T00:00:00-03:00');

        if (dataDisp >= dataCorte) {
          const { data: adminUser } = await supabase
            .from('users')
            .select('auth_id')
            .eq('role', 'admin')
            .limit(1)
            .single();

          const targetUserId = adminUser?.auth_id;

          const { error } = await supabase.from('notifications').insert({
            user_id: targetUserId,
            type: 'djen',
            priority: 'urgente',
            title: 'Nova Publicação DJEN',
            message: `Processo: ${proc} - ${tipo}`,
            link: '/IntimacoesDJEN',
            is_read: false,
          });

          if (error) {
            console.error(`[Vigia DJEN] Erro ao inserir notificação no Supabase:`, error.message);
          }
        } else {
          console.log(`   └─ Silenciado (Anterior a 16/03): ${proc}`);
        }
      }
    } else {
      console.log('[Vigia DJEN] Nenhuma publicação inédita. Tudo em dia.');
    }
  } catch (err: any) {
    console.error('[Vigia DJEN] Erro na consulta:', err.message);
  }
}



// ─── Jurisprudência TNU ─────────────────────────────────────────────
// POST /api/jurisprudencia/scrape-tnu
// Inicia o scraping de acórdãos da TNU e persiste no Supabase.
// Parâmetro opcional: maxAcordaos (default: 50)
app.post('/api/jurisprudencia/scrape-tnu', async (req: Request, res: Response) => {
  if (!supabase) {
    res.status(503).json({ error: 'Supabase client não inicializado. Verifique VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.' });
    return;
  }
  const maxAcordaos = typeof req.body?.maxAcordaos === 'number' ? req.body.maxAcordaos : 50;
  try {
    console.log(`[TNU] Iniciando scraping (max: ${maxAcordaos} acórdãos)...`);
    const resultado = await iniciarScrapingTNU(supabase, maxAcordaos);
    res.json(resultado);
  } catch (error: any) {
    console.error('[TNU] Erro fatal no scraping:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── Ignição ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Scraper Server rodando em http://localhost:${PORT}`);
  console.log(`   ├─ Healthcheck:      GET  /status`);
  console.log(`   ├─ Config MNI:       POST /configurar/mni`);
  console.log(`   ├─ Config OTP:       POST /configurar/mni/otp`);
  console.log(`   ├─ Extração:         POST /advogado/processos`);
  console.log(`   ├─ Proxy DataJud:    POST /api/cnj/datajud`);
  console.log(`   ├─ 🚀 Bulk DataJud:  POST /api/datajud/bulk  [Alta Performance]`);
  console.log(`   ├─ Proxy DJEN:       GET  /api/cnj/djen`);
  console.log(`   ├─ Vigia DJEN:       ⏱️  a cada ${VIGIA_INTERVAL_MS / 60000} min (insert direto no Supabase)`);
  console.log(`   └─ Scraping TNU:     POST /api/jurisprudencia/scrape-tnu\n`);

  // Executa imediatamente na ignição + agenda repetição
  vigiarDJEN();
  setInterval(vigiarDJEN, VIGIA_INTERVAL_MS);
});
