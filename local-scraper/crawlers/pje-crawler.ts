import { PlaywrightCrawler, Configuration } from 'crawlee';

// ─── Tipos ──────────────────────────────────────────────────────────
export interface ProcessoExtraido {
  numero: string;
  classe: string;
  assunto: string;
  dataDistribuicao: string;
  ultimaMovimentacao: string;
  tribunal: string;
}

export interface ResultadoExtracao {
  processos: ProcessoExtraido[];
  totalEncontrados: number;
  erros: string[];
  iniciadoEm: string;
  finalizadoEm: string;
}

// ─── Configuração Global do Crawlee ─────────────────────────────────
const config = Configuration.getGlobalConfig();
config.set('persistStorage', false); // Não persiste storage em disco

// ─── Constantes PJe ─────────────────────────────────────────────────
const PJE_URLS: Record<string, string> = {
  'TJ-CE': 'https://pje.tjce.jus.br/pje/login.seam',
  'TRF-5': 'https://pje.trf5.jus.br/pje/login.seam',
};

// ─── Função Principal de Extração ───────────────────────────────────
export async function iniciarExtracaoPje(
  cpf: string,
  senha: string,
  oab: string,
  uf: string
): Promise<ResultadoExtracao> {
  const processos: ProcessoExtraido[] = [];
  const erros: string[] = [];
  const iniciadoEm = new Date().toISOString();

  const crawler = new PlaywrightCrawler({
    // ── Configurações de Stealth & Performance ──
    headless: true,
    browserPoolOptions: {
      useFingerprints: true, // Rotaciona fingerprints para evitar detecção
    },
    navigationTimeoutSecs: 60,
    requestHandlerTimeoutSecs: 120,
    maxRequestRetries: 2,
    maxConcurrency: 1, // PJe não suporta múltiplas sessões simultâneas

    // ── Opções do navegador ──
    launchContext: {
      launchOptions: {
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
          '--disable-dev-shm-usage',
        ],
      },
    },

    // ── Handler Principal ──
    async requestHandler({ page, request, log }) {
      const tribunal = (request.userData as any).tribunal || 'Desconhecido';
      log.info(`[PJe] Acessando ${tribunal}: ${request.url}`);

      // 1. Aguarda carregamento da página de login
      await page.waitForLoadState('networkidle');

      // 2. Preenche credenciais
      log.info(`[PJe] Preenchendo credenciais para CPF: ${cpf.slice(0, 3)}***`);

      const cpfInput = page.locator('input[id*="cpf"], input[name*="cpf"], input[id*="username"]').first();
      const senhaInput = page.locator('input[type="password"]').first();

      if (await cpfInput.isVisible()) {
        await cpfInput.fill(cpf);
      }

      if (await senhaInput.isVisible()) {
        await senhaInput.fill(senha);
      }

      // 3. Submete login
      const btnLogin = page.locator('button[type="submit"], input[type="submit"], a[id*="login"]').first();
      if (await btnLogin.isVisible()) {
        await btnLogin.click();
        await page.waitForLoadState('networkidle');
      }

      log.info(`[PJe] Login submetido. Verificando painel...`);

      // 4. Navega para o painel de processos do advogado
      await page.waitForTimeout(3000); // Espera redirect pós-login

      // 5. Coleta processos (seletor genérico — será refinado por tribunal)
      const linhasProcesso = page.locator('table[id*="processo"] tbody tr, .lista-processos .processo-item');
      const count = await linhasProcesso.count();

      log.info(`[PJe] ${count} processos encontrados em ${tribunal}.`);

      for (let i = 0; i < count; i++) {
        try {
          const linha = linhasProcesso.nth(i);
          const texto = await linha.innerText();
          const colunas = texto.split('\t').map((c: string) => c.trim());

          processos.push({
            numero: colunas[0] || '',
            classe: colunas[1] || '',
            assunto: colunas[2] || '',
            dataDistribuicao: colunas[3] || '',
            ultimaMovimentacao: colunas[4] || '',
            tribunal,
          });
        } catch (err: any) {
          erros.push(`Erro ao extrair processo ${i} de ${tribunal}: ${err.message}`);
        }
      }
    },

    // ── Tratamento de Falhas ──
    failedRequestHandler({ request, log }, error) {
      const tribunal = (request.userData as any).tribunal || 'Desconhecido';
      log.error(`[PJe] Falha ao acessar ${tribunal}: ${error.message}`);
      erros.push(`Falha ${tribunal}: ${error.message}`);
    },
  });

  // ── Enfileira URLs dos tribunais alvo ──
  const requestsQueue = Object.entries(PJE_URLS).map(([tribunal, url]) => ({
    url,
    userData: { tribunal, oab, uf },
  }));

  await crawler.run(requestsQueue);

  const finalizadoEm = new Date().toISOString();

  console.log(`\n📊 Extração Finalizada:`);
  console.log(`   ├─ Processos: ${processos.length}`);
  console.log(`   ├─ Erros: ${erros.length}`);
  console.log(`   └─ Duração: ${new Date(finalizadoEm).getTime() - new Date(iniciadoEm).getTime()}ms\n`);

  return {
    processos,
    totalEncontrados: processos.length,
    erros,
    iniciadoEm,
    finalizadoEm,
  };
}
