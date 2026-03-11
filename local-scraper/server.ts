import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { iniciarExtracaoPje } from './crawlers/pje-crawler.js';

// ─── Config ────────────────────────────────────────────────────────
const envPath = path.resolve(import.meta.dirname, '.env');
dotenv.config({ path: envPath });

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// ─── CNJ APIs Config (DataJud + DJEN) ───────────────────────────────
const DATAJUD_API_KEY = 'APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';
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

// ─── Proxy CNJ: DataJud ─────────────────────────────────────────────
app.post('/api/cnj/datajud', async (req: Request, res: Response) => {
  try {
    const { sigla, numeroFormatado } = req.body;

    if (!sigla || !numeroFormatado) {
      res.status(400).json({ error: 'sigla e numeroFormatado são obrigatórios.' });
      return;
    }

    const endpoint = `${DATAJUD_BASE}/api_publica_${sigla}/_search`;

    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: DATAJUD_API_KEY,
      },
      body: JSON.stringify({
        query: { match: { numeroProcesso: numeroFormatado } },
      }),
    });

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err: any) {
    console.error('[/api/cnj/datajud] Erro:', err.message);
    res.status(500).json({ error: err.message });
  }
});

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

// ─── Ignição ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Scraper Server rodando em http://localhost:${PORT}`);
  console.log(`   ├─ Healthcheck:  GET  /status`);
  console.log(`   ├─ Config MNI:   POST /configurar/mni`);
  console.log(`   ├─ Config OTP:   POST /configurar/mni/otp`);
  console.log(`   ├─ Extração:     POST /advogado/processos`);
  console.log(`   ├─ Proxy DataJud: POST /api/cnj/datajud`);
  console.log(`   └─ Proxy DJEN:    GET  /api/cnj/djen\n`);
});
