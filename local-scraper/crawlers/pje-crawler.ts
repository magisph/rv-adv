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
  'TRF-5': 'https://pje1g.trf5.jus.br/pje/login.seam',
};

// ─── Função Principal de Extração ───────────────────────────────────
export async function iniciarExtracaoPje(
  cpf: string,
  senha: string,
  oab: string,
  uf: string,
  otp?: string
): Promise<ResultadoExtracao> {
  const processos: ProcessoExtraido[] = [];
  const erros: string[] = [];
  const iniciadoEm = new Date().toISOString();

  const crawler = new PlaywrightCrawler({
    // ── Configurações de Stealth & Performance ──
    headless: false, // DEBUG: desative após análise visual
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

      // 4. Aguarda redirect pós-login
      await page.waitForTimeout(8000);

      // 4.1 Detecta tela de 2FA por contexto visual (como um humano faria)
      const is2FAScreen = await page.getByText(/código de segurança|token|duas etapas|autenticação|verificação/i).first().isVisible().catch(() => false);

      if (is2FAScreen) {
        log.info(`[PJe] Tela de 2FA detectada visualmente. Inserindo código...`);
        if (!otp) throw new Error('O tribunal exigiu 2FA, mas o código não foi fornecido. Refaça a Configuração do PJe.');

        // Pega o primeiro campo de input de texto ou número visível na tela
        const otpInput = page.locator('input[type="text"]:visible, input[type="number"]:visible, input[type="password"]:visible, input[name*="codigo"]:visible').first();

        if (await otpInput.isVisible()) {
          await otpInput.fill(otp);

          // Procura botões com textos afirmativos
          const btnVerificar = page.locator('button:visible, input[type="submit"]:visible, a:visible').filter({ hasText: /Verificar|Confirmar|Validar|Entrar|Acessar/i }).first();

          if (await btnVerificar.isVisible()) {
            await btnVerificar.click();
          } else {
            // Fallback Ninja: Aperta Enter direto no input
            await otpInput.press('Enter');
          }

          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(4000);
          log.info(`[PJe] 2FA submetido com sucesso.`);
        } else {
          throw new Error('Tela de 2FA detectada, mas o campo de digitação não foi encontrado.');
        }
      }

      // DEBUG: Screenshot do painel após login/2FA
      await page.screenshot({ path: `${tribunal}-painel.png`, fullPage: true });
      log.info(`[PJe] Screenshot salvo: ${tribunal}-painel.png`);

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
