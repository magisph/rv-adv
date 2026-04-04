/**
 * scraperService.js
 * Comunicação HTTP com o servidor local de scraping (porta 3001).
 *
 * SECURITY: O endpoint é configurado via variável de ambiente VITE_SCRAPER_URL.
 * Em produção, deve apontar para um endereço HTTPS autenticado.
 * Nunca commitar IPs ou URLs fixas neste arquivo.
 */
const SCRAPER_BASE_URL = import.meta.env.VITE_SCRAPER_URL || 'http://localhost:3001';

async function handleResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Erro HTTP ${response.status}`);
  }
  return data;
}

/** Verifica se o servidor de scraping está online. */
export async function checkStatus() {
  const res = await fetch(`${SCRAPER_BASE_URL}/status`);
  return handleResponse(res);
}

/** Envia CPF e Senha para configurar o MNI e abrir sessão OTP. */
export async function configurarMni(cpf, senha) {
  const res = await fetch(`${SCRAPER_BASE_URL}/configurar/mni`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cpf, senha }),
  });
  return handleResponse(res);
}

/** Envia código 2FA para completar o login. */
export async function enviarOtp(sessionId, otp) {
  const res = await fetch(`${SCRAPER_BASE_URL}/configurar/mni/otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, otp }),
  });
  return handleResponse(res);
}

/** Dispara a extração de processos por OAB/UF. */
export async function sincronizarProcessos(oab, uf) {
  const res = await fetch(`${SCRAPER_BASE_URL}/advogado/processos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oab, uf }),
  });
  return handleResponse(res);
}
