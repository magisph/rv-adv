const url = 'https://uxtgcarklizhwuotkwkd.supabase.co/functions/v1/inss-webhook';

const payload = {
  to: "joaodgf@rafaelavasconcelos.adv.br",
  from: "noreply@inss.gov.br",
  subject: "Agendamento de Perícia Médica",
  text: "Prezado(a) Segurado(a), informamos que sua perícia médica foi agendada para o dia 25/10/2026 às 14:30 na agência da Previdência Social localizada na Rua das Flores, 123, Centro, Ipueiras/CE. Por favor, compareça com 15 minutos de antecedência portando seus documentos originais e laudos médicos."
};

console.log(`Enviando POST para ${url}...`);

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload)
})
  .then(async response => {
    const text = await response.text();
    try {
      return { status: response.status, data: JSON.parse(text) };
    } catch {
      return { status: response.status, data: text };
    }
  })
  .then(res => {
    console.log('--- Resposta da Edge Function ---');
    console.log(`Status: ${res.status}`);
    console.log('Body:', JSON.stringify(res.data, null, 2));
  })
  .catch(err => {
    console.error('Erro ao fazer a requisição:', err);
  });
