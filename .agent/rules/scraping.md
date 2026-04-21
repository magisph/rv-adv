# Rule: Scraping e Integrações Externas

## Servidor de Scraping
- Localização: `local-scraper/`
- Porta: 3001 (concorrente com frontend dev)
- Stack: Express v5 + Crawlee v3 + Playwright v1.58
- Deploy: Servidor dedicado Hetzner CX33 (Ubuntu 24.04)

## Crawlers Disponíveis
| Crawler | Fonte | Ação |
|---------|-------|------|
| PJe | Tribunal Regional Federal | Extração de processos (requer MNI + OTP) |
| DJEN | Diário Eletrônico da Justiça | Monitoramento de publicações (vigia horário) |
| TNU | Tribunal Nacional Uniformização | Coleta de jurisprudência (Edge Function) |

## Regras de Scraping
- SEMPRE usar User-Agent realista e headers de navegador
- Respeitar rate limits dos tribunais (mínimo 2s entre requisições)
- Circuit breaker: parar após 5 falhas consecutivas
- Exponential backoff: 2s → 4s → 8s → 16s → 30s
- Checkpoint: salvar progresso em JSON para retomada
- NUNCA logar credenciais (PJe CPF/senha, API keys)
- Rotacionar user agents entre sessões

## Webhooks
- Tramitação Inteligente: HMAC + Bearer + Query token verification
- INSS: validação de origem antes do processamento
- SEMPRE verificar integridade do payload
