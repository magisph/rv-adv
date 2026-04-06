# Plano de Implementação: Ajustes no Módulo de Jurisprudência TNU

**Sistema:** RV Advocacia — Gestão Jurídica  
**Repositório:** `magisph/rv-adv`  
**Data de Referência:** 05 de abril de 2026  

---

## Sumário

1. [Resumo Executivo e Princípios Orientadores](#1-resumo-executivo-e-princípios-orientadores)
2. [Ordem de Execução](#2-ordem-de-execução)
3. [Fase 0 — Validação Empírica do Portal TNU](#fase-0--validação-empírica-do-portal-tnu)
4. [Fase 1 — Atualização dos Filtros de Qualidade na Edge Function](#fase-1--atualização-dos-filtros-de-qualidade-na-edge-function)
5. [Fase 2 — Limpeza da Base de Dados Existente](#fase-2--limpeza-da-base-de-dados-existente)
6. [Fase 3 — Adaptação da Edge Function para Suportar Filtros de Data](#fase-3--adaptação-da-edge-function-para-suportar-filtros-de-data)
7. [Fase 4 — Execução do Backfill Automatizado (2022–2026)](#fase-4--execução-do-backfill-automatizado-20222026)
8. [Fase 5 — Validação Final e Monitoramento](#fase-5--validação-final-e-monitoramento)
9. [Rastreabilidade de Riscos](#9-rastreabilidade-de-riscos)
10. [Checklist de Entregas](#10-checklist-de-entregas)

---

## 1. Resumo Executivo e Princípios Orientadores

Este plano implementa dois ajustes solicitados no Módulo de Jurisprudência TNU:

1. **Desconsiderar acórdãos de "Não Admissão" ou "Incidente Não Admitido"** — filtragem na coleta e limpeza retroativa da base existente.
2. **Ampliar a coleta para Janeiro/2022 a Março/2026** — backfill automatizado com script dedicado, mantendo a automação diária intacta.

A revisão em relação à versão original do plano incorpora as seguintes correções derivadas da análise exaustiva:

- **Reordenação das fases** para eliminar trabalho duplicado e garantir que o backfill colete apenas dados limpos.
- **Correção dos padrões de exclusão** para evitar false positives em "não conhecimento" (que aparece em acórdãos de mérito como parte do relatório).
- **Alinhamento entre filtros regex (scraper) e ILIKE (SQL)** para garantir consistência.
- **Validação de formato de data** nos parâmetros novos da Edge Function.
- **Tratamento de arquivos órfãos no Storage** durante a limpeza.
- **Robustez do script de backfill** com checkpoint, circuit breaker, exponential backoff e tratamento de embedding falho.
- **Validação prévia do formato HTML** do portal para acórdãos de 2022 (risco de mudança de layout).

**Princípios orientadores:**

| Princípio | Significado Prático |
|---|---|
| Idempotência | Qualquer fase pode ser re-executada sem efeitos colaterais (upsert por `process_number`, DELETE por padrões, checkpoint no script) |
| Segurança contra regressão | O workflow diário não é alterado; mudanças na Edge Function são backward-compatible (parâmetros novos são opcionais) |
| Segurança de dados | Nunca executar DELETE sem antes coletar os paths do Storage; nunca executar backfill sem os filtros de qualidade ativos |
| Observabilidade | Cada fase tem critérios de verificação explícitos e mensuráveis |

---

## 2. Ordem de Execução Corrigida

```
Fase 0  →  Validação empírica do portal (sem alteração de código)
Fase 1  →  Atualizar filtros de qualidade no scraper (deploy)
Fase 2  →  Limpar base existente (SQL + Storage)
Fase 3  →  Adicionar filtros de data no scraper (deploy)
Fase 4  →  Executar backfill (script dedicado)
Fase 5  →  Validação final
```

**Justificativa da ordem:**

- **Fase 0 antes de tudo:** Se o portal mudou seu HTML para acórdãos antigos, descobrimos antes de escrever código. Muda o escopo do backfill.
- **Fase 1 antes de Fase 2:** Os filtros de qualidade devem estar ativos no scraper *antes* da limpeza, para que acórdãos re-coletados pelo workflow diário já passem pelos novos filtros. A limpeza SQL é um "passe de limpeza" retroativo.
- **Fase 2 antes de Fase 3:** Limpar a base *antes* de adicionar filtros de data garante que não precisaremos limpar novamente após o backfill.
- **Fase 3 antes de Fase 4:** Os filtros de data devem estar disponíveis no scraper *antes* do backfill.
- **Fase 4 por último:** O backfill é a operação mais longa e de maior risco. Deve ser executada com todas as correções já em produção.

> **Nota:** As Fases 1 e 3 podem ser combinadas em um único deploy da Edge Function, desde que todas as alterações sejam aplicadas em conjunto e testadas. A separação em fases distintas no plano serve para isolar a lógica e facilitar debug em caso de problema.

---

## Fase 0 — Validação Empírica do Portal TNU

**Objetivo:** Confirmar que o portal da TNU aceita filtros de data e que o formato HTML dos acórdãos de 2022 é compatível com o parser atual.

**Não há alteração de código nesta fase.** Apenas testes manuais via `curl`.

### 0.1. Teste de filtros de data

Executar a requisição abaixo (substituir `{PHPSESSID}` por uma sessão válida obtida de uma GET prévia à página de pesquisa):

```bash
# Passo 1: Obter sessão
curl -s -D - \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36" \
  "https://eproctnu-jur.cjf.jus.br/eproc/externo_controlador.php?acao=jurisprudencia@jurisprudencia/pesquisar" \
  2>&1 | grep -i 'set-cookie.*PHPSESSID'

# Passo 2: Busca com filtro de data (usar o PHPSESSID obtido)
curl -s -X POST \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36" \
  -H "Cookie: PHPSESSID={PHPSESSID}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "hdnAcao=pesquisar&txtPesquisaLivre=previdenciário&hdnInfraTamanho=10&hdnInfraInicioRegistro=0&dtDecisaoInicio=01/01/2022&dtDecisaoFim=31/12/2022" \
  "https://eproctnu-jur.cjf.jus.br/eproc/externo_controlador.php?acao=jurisprudencia@jurisprudencia/listar_resultados" \
  | iconv -f iso-8859-1 -t utf-8 > /tmp/tnu_teste_2022.html
```

**Critérios de verificação:**

| Critério | Como Verificar | Resultado Esperado |
|---|---|---|
| Filtros de data são aceitos | Verificar se `Documento 1 de N` no HTML retorna N < total do acervo | N deve ser ~centenas, não milhares |
| Paginação mantém filtro de data | Fazer segunda requisição com `hdnAcao=paginar` e mesmo `PHPSESSID` | Resultados devem ser diferentes da página 1 |
| HTML de 2022 é compatível | Buscar por `data-citacao` e `data-link` no HTML | Os atributos devem existir nos cards |
| Encoding é ISO-8859-1 | Verificar se há caracteres corrompidos após decode | Acentos devem estar corretos |

### 0.2. Verificação do campo `dtDecisao` vs `trial_date`

Comparar a data enviada no filtro (`dtDecisaoInicio=01/01/2022`) com a `DATA DO JULGAMENTO` e a `DATA DA PUBLICAÇÃO` nos cards retornados. Se um acórdão tem `DATA DO JULGAMENTO: 15/12/2021` mas `DATA DA PUBLICAÇÃO: 10/01/2022`, isso significa que `dtDecisao` filtra por **publicação**, não por julgamento. Documentar o resultado para informar o script de backfill sobre qual campo de data usar como referência de cobertura.

**Se qualquer critério falhar:** O backfill precisará de adaptações não previstas no plano. Documentar o problema e reavaliar antes de prosseguir.

---

## Fase 1 — Atualização dos Filtros de Qualidade na Edge Function

**Objetivo:** Adicionar padrões de exclusão para acórdãos de não-admissão e não-conhecimento de incidentes, com âncoras que previnam false positives.

**Arquivo:** `supabase/functions/scrape-tnu/index.ts`

### 1.1. Substituição do array `PADROES_EXCLUSAO`

Localizar o array `PADROES_EXCLUSAO` (linhas 53-59 no arquivo original) e substituir integralmente por:

```typescript
const PADROES_EXCLUSAO = [
  // --- Existentes (inalterados) ---
  /DECIS[ÃA]O MONOCR[ÁA]TICA/i,
  /AGRAVO CONTRA DECIS[ÃA]O MONOCR[ÁA]TICA/i,
  /^VOTO\b/i,
  /^VOTO-VISTA\b/i,
  /PEDIDO DE RECONSIDER/i,

  // --- Novos: Não-admissão ---
  // Âncora de início (^) com \s* para tolerar espaços/quebras antes do texto.
  // O texto da ementa vem de decodeIso8859Cite, que pode preservar espaços iniciais.
  /^\s*N[ÃA]O ADMISS[ÃA]O\b/i,
  /^\s*INCIDENTE N[ÃA]O ADMITIDO\b/i,
  /^\s*INADMISSIBILIDADE DO PEDIDO\b/i,

  // --- Novos: Não-conhecimento ---
  // CRÍTICO: Usar "DO INCIDENTE" como restrição contextual.
  // "Não conhecimento" isolado aparece em acórdãos de mérito
  // (ex: "o não conhecimento do recurso pelo réu não impede...").
  // A TNU "não conhece de incidentes de uniformização" — o padrão é
  // "não conhecimento do incidente" ou "não conheceu do incidente".
  /^\s*N[ÃA]O CONHECIMENTO DO INCIDENTE\b/i,
  /^\s*N[ÃA]O CONHECEU DO INCIDENTE\b/i,

  // Complemento: mesmo padrão após "EMENTA:" (caso haja prefixo)
  /EMENTA:\s*N[ÃA]O ADMISS[ÃA]O\b/i,
  /EMENTA:\s*INCIDENTE N[ÃA]O ADMITIDO\b/i,
  /EMENTA:\s*INADMISSIBILIDADE DO PEDIDO\b/i,
  /EMENTA:\s*N[ÃA]O CONHECIMENTO DO INCIDENTE\b/i,
  /EMENTA:\s*N[ÃA]O CONHECEU DO INCIDENTE\b/i,
];
```

### 1.2. Justificativa das decisões de regex

| Decisão | Racional |
|---|---|
| `^\s*` em vez de `^` puro | A função `decodeIso8859Cite` pode preservar espaços ou `\n` iniciais. `\s*` tolera isso sem relaxar demais o padrão. |
| `\b` (word boundary) após os termos | Impede que "NÃO ADMISSÃO" faça match com "NÃO ADMISSÃOÇÃO" (hipotético) e garante que a regex pare na fronteira da palavra. |
| "DO INCIDENTE" como restrição em "não conhecimento" | Sem essa restrição, qualquer menção a "não conhecimento" no corpo da ementa causaria exclusão. Na TNU, o não-conhecimento relevante é sempre "do incidente de uniformização". |
| Padrões duplicados com `EMENTA:` como prefixo | Alguns acórdãos podem ter a ementa prefixada com "EMENTA:" antes do conteúdo real. Os padrões com `^` não capturam esse caso. Manter ambos garante cobertura. |
| Não incluir "NÃO CONHECIDO" isolado | "Não conhecido" aparece como particípio em frases como *"o recurso não conhecido pela parte ré"* em acórdãos de mérito. O particípio "conheceu" com "do incidente" é mais específico e seguro. |
| Não incluir "INADMISSÍVEL" (adjetivo) | "INADMISSÍVEL" aparece em contextos como *"a prova é inadmissível"* em acórdãos de mérito. O substantivo "INADMISSIBILIDADE DO PEDIDO" é o padrão judicial específico para não-admissão. |

### 1.3. Verificação da ementa limpa vs. ementa bruta

Antes de aplicar os padrões com `^`, é necessário confirmar o comportamento de `decodeIso8859Cite`. A ementa é testada pela função `isAcordaoValido(ementa)` — verificar se `ementa` neste ponto já teve espaços iniciais removidos ou não.

**Se houver dúvida,** adicionar um log temporário na Edge Function:

```typescript
// LOG TEMPORÁRIO — remover após verificação
console.log("[DEBUG-EMENTA] Primeiros 80 chars:", JSON.stringify(ementa.substring(0, 80)));
```

Executar uma chamada de teste e verificar no log do Supabase se a ementa começa com "EMENTA:" limpo ou com espaços/quebras.

**Se a ementa sempre começa com "EMENTA:" limpo** (sem espaços), os padrões com `^` podem ser simplificados removendo `\s*`. **Se houver variação**, manter `\s*`.

### 1.4. Deploy

```bash
npx supabase functions deploy scrape-tnu --no-verify-jwt
```

### 1.5. Teste pós-deploy

```bash
# Invocar a função com um termo que costuma retornar não-admissões
curl -X POST \
  -H "Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"termo": "incidente de uniformização", "offset": 0}' \
  "https://{SUPABASE_PROJECT_REF}.supabase.co/functions/v1/scrape-tnu"
```

**Critérios de verificação:**

| Critério | Como Verificar |
|---|---|
| Função retorna sucesso (HTTP 200) | Status code da resposta |
| Coletados > 0 | Campo `coletados` na resposta |
| Logs mostram filtragens | Verificar logs da Edge Function no dashboard do Supabase — devem aparecer mensagens de "Acórdão descartado" para os novos padrões |
| Workflow diário continua funcionando | Aguardar a execução automática das 03:00 BRT do dia seguinte e verificar que acórdãos foram coletados normalmente |

---

## Fase 2 — Limpeza da Base de Dados Existente

**Objetivo:** Remover acórdãos de não-admissão já indexados na base, incluindo seus arquivos no Storage.

**Atenção:** Esta fase opera diretamente no banco de dados de produção. Executar com cautela e em horário de baixo uso (recomendado: fora do horário comercial, antes das 03:00 BRT quando o workflow diário roda).

### 2.1. Mapeamento de padrões SQL alinhados com regex da Fase 1

Para garantir consistência, os padrões ILIKE devem corresponder à mesma semântica dos regex. Como ILIKE não suporta âncoras (`^`) nem word boundaries (`\b`), usamos a estratégia de verificar o **início da ementa** via `LEFT()` + `LIKE`:

```sql
-- Padrão 1: Ementa começa com "NÃO ADMISSÃO"
LEFT(TRIM(excerpt), 30) ILIKE 'NÃO ADMISSÃO%'

-- Padrão 2: Ementa começa com "INCIDENTE NÃO ADMITIDO"
LEFT(TRIM(excerpt), 40) ILIKE 'INCIDENTE NÃO ADMITIDO%'

-- Padrão 3: Ementa começa com "INADMISSIBILIDADE DO PEDIDO"
LEFT(TRIM(excerpt), 50) ILIKE 'INADMISSIBILIDADE DO PEDIDO%'

-- Padrão 4: Ementa começa com "NÃO CONHECIMENTO DO INCIDENTE"
LEFT(TRIM(excerpt), 55) ILIKE 'NÃO CONHECIMENTO DO INCIDENTE%'

-- Padrão 5: Ementa começa com "NÃO CONHECEU DO INCIDENTE"
LEFT(TRIM(excerpt), 45) ILIKE 'NÃO CONHECEU DO INCIDENTE%'

-- Padrão 6: Ementa contém "EMENTA: NÃO ADMISSÃO" (com prefixo)
excerpt ILIKE 'EMENTA: NÃO ADMISSÃO%'

-- Padrão 7: Ementa contém "EMENTA: INCIDENTE NÃO ADMITIDO"
excerpt ILIKE 'EMENTA: INCIDENTE NÃO ADMITIDO%'

-- Padrão 8: Ementa contém "EMENTA: INADMISSIBILIDADE DO PEDIDO"
excerpt ILIKE 'EMENTA: INADMISSIBILIDADE DO PEDIDO%'

-- Padrão 9: Ementa contém "EMENTA: NÃO CONHECIMENTO DO INCIDENTE"
excerpt ILIKE 'EMENTA: NÃO CONHECIMENTO DO INCIDENTE%'

-- Padrão 10: Ementa contém "EMENTA: NÃO CONHECEU DO INCIDENTE"
excerpt ILIKE 'EMENTA: NÃO CONHECEU DO INCIDENTE%'
```

### 2.2. Passo 1 — Contagem prévia (dry run)

**NUNCA executar DELETE sem antes contar os afetados.**

```sql
SELECT
  COUNT(*) AS total_a_serem_removidos,
  COUNT(pdf_path) AS com_pdf,
  COUNT(json_extracted_path) AS com_json
FROM jurisprudences
WHERE
  LEFT(TRIM(excerpt), 30) ILIKE 'NÃO ADMISSÃO%'
  OR LEFT(TRIM(excerpt), 40) ILIKE 'INCIDENTE NÃO ADMITIDO%'
  OR LEFT(TRIM(excerpt), 50) ILIKE 'INADMISSIBILIDADE DO PEDIDO%'
  OR LEFT(TRIM(excerpt), 55) ILIKE 'NÃO CONHECIMENTO DO INCIDENTE%'
  OR LEFT(TRIM(excerpt), 45) ILIKE 'NÃO CONHECEU DO INCIDENTE%'
  OR excerpt ILIKE 'EMENTA: NÃO ADMISSÃO%'
  OR excerpt ILIKE 'EMENTA: INCIDENTE NÃO ADMITIDO%'
  OR excerpt ILIKE 'EMENTA: INADMISSIBILIDADE DO PEDIDO%'
  OR excerpt ILIKE 'EMENTA: NÃO CONHECIMENTO DO INCIDENTE%'
  OR excerpt ILIKE 'EMENTA: NÃO CONHECEU DO INCIDENTE%';
```

**Registrar o resultado.** Se `total_a_serem_removidos` for inesperadamente alto (ex: > 20% da base de 60 registros), investigar os registros individualmente antes de prosseguir:

```sql
SELECT id, process_number, LEFT(excerpt, 120) AS inicio_ementa
FROM jurisprudences
WHERE
  LEFT(TRIM(excerpt), 30) ILIKE 'NÃO ADMISSÃO%'
  OR LEFT(TRIM(excerpt), 40) ILIKE 'INCIDENTE NÃO ADMITIDO%'
  OR LEFT(TRIM(excerpt), 50) ILIKE 'INADMISSIBILIDADE DO PEDIDO%'
  OR LEFT(TRIM(excerpt), 55) ILIKE 'NÃO CONHECIMENTO DO INCIDENTE%'
  OR LEFT(TRIM(excerpt), 45) ILIKE 'NÃO CONHECEU DO INCIDENTE%'
  OR excerpt ILIKE 'EMENTA: NÃO ADMISSÃO%'
  OR excerpt ILIKE 'EMENTA: INCIDENTE NÃO ADMITIDO%'
  OR excerpt ILIKE 'EMENTA: INADMISSIBILIDADE DO PEDIDO%'
  OR excerpt ILIKE 'EMENTA: NÃO CONHECIMENTO DO INCIDENTE%'
  OR excerpt ILIKE 'EMENTA: NÃO CONHECEU DO INCIDENTE%';
```

### 2.3. Passo 2 — Coleta dos paths do Storage

```sql
SELECT
  id,
  pdf_path,
  json_extracted_path
FROM jurisprudences
WHERE
  LEFT(TRIM(excerpt), 30) ILIKE 'NÃO ADMISSÃO%'
  OR LEFT(TRIM(excerpt), 40) ILIKE 'INCIDENTE NÃO ADMITIDO%'
  OR LEFT(TRIM(excerpt), 50) ILIKE 'INADMISSIBILIDADE DO PEDIDO%'
  OR LEFT(TRIM(excerpt), 55) ILIKE 'NÃO CONHECIMENTO DO INCIDENTE%'
  OR LEFT(TRIM(excerpt), 45) ILIKE 'NÃO CONHECEU DO INCIDENTE%'
  OR excerpt ILIKE 'EMENTA: NÃO ADMISSÃO%'
  OR excerpt ILIKE 'EMENTA: INCIDENTE NÃO ADMITIDO%'
  OR excerpt ILIKE 'EMENTA: INADMISSIBILIDADE DO PEDIDO%'
  OR excerpt ILIKE 'EMENTA: NÃO CONHECIMENTO DO INCIDENTE%'
  OR excerpt ILIKE 'EMENTA: NÃO CONHECEU DO INCIDENTE%';
```

**Para cada registro com `pdf_path` ou `json_extracted_path` não-nulo,** remover os arquivos do bucket `jurisprudencia` via Supabase Storage API:

```bash
# Exemplo para um arquivo PDF
curl -X DELETE \
  -H "Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}" \
  "https://{SUPABASE_PROJECT_REF}.supabase.co/storage/v1/object/jurisprudencia/{pdf_path}"

# Exemplo para um arquivo JSON
curl -X DELETE \
  -H "Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}" \
  "https://{SUPABASE_PROJECT_REF}.supabase.co/storage/v1/object/jurisprudencia/{json_extracted_path}"
```

> **Alternativa:** Se o número de arquivos for pequeno (provável com apenas 60 registros na base atual), pode-se remover manualmente pelo painel do Supabase Storage. Se for grande, automatizar com um script Python curto.

### 2.4. Passo 3 — Execução do DELETE

```sql
BEGIN;

DELETE FROM jurisprudences
WHERE
  LEFT(TRIM(excerpt), 30) ILIKE 'NÃO ADMISSÃO%'
  OR LEFT(TRIM(excerpt), 40) ILIKE 'INCIDENTE NÃO ADMITIDO%'
  OR LEFT(TRIM(excerpt), 50) ILIKE 'INADMISSIBILIDADE DO PEDIDO%'
  OR LEFT(TRIM(excerpt), 55) ILIKE 'NÃO CONHECIMENTO DO INCIDENTE%'
  OR LEFT(TRIM(excerpt), 45) ILIKE 'NÃO CONHECEU DO INCIDENTE%'
  OR excerpt ILIKE 'EMENTA: NÃO ADMISSÃO%'
  OR excerpt ILIKE 'EMENTA: INCIDENTE NÃO ADMITIDO%'
  OR excerpt ILIKE 'EMENTA: INADMISSIBILIDADE DO PEDIDO%'
  OR excerpt ILIKE 'EMENTA: NÃO CONHECIMENTO DO INCIDENTE%'
  OR excerpt ILIKE 'EMENTA: NÃO CONHECEU DO INCIDENTE%';

COMMIT;
```

### 2.5. Passo 4 — Confirmação

```sql
-- Verificar que não restam registros com os padrões
SELECT COUNT(*) FROM jurisprudences
WHERE
  LEFT(TRIM(excerpt), 30) ILIKE 'NÃO ADMISSÃO%'
  OR LEFT(TRIM(excerpt), 40) ILIKE 'INCIDENTE NÃO ADMITIDO%'
  OR LEFT(TRIM(excerpt), 50) ILIKE 'INADMISSIBILIDADE DO PEDIDO%'
  OR LEFT(TRIM(excerpt), 55) ILIKE 'NÃO CONHECIMENTO DO INCIDENTE%'
  OR LEFT(TRIM(excerpt), 45) ILIKE 'NÃO CONHECEU DO INCIDENTE%';

-- Resultado deve ser 0
```

---

## Fase 3 — Adaptação da Edge Function para Suportar Filtros de Data

**Objetivo:** Adicionar parâmetros opcionais `data_inicio` e `data_fim` ao payload da Edge Function `scrape-tnu`, com validação de formato e injeção nos parâmetros do portal TNU.

**Arquivo:** `supabase/functions/scrape-tnu/index.ts`

### 3.1. Adicionar função de validação de data

Inserir a função auxiliar antes do handler principal (após as constantes, antes de `getTnuSession`):

```typescript
/**
 * Valida se uma string está no formato DD/MM/AAAA com valores plausíveis.
 * Não valida dias por mês (ex: aceita 31/02/2022) — o portal rejeitará datas impossíveis.
 */
function validarFormatoDataTNU(data: string): boolean {
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = data.match(regex);
  if (!match) return false;
  const [, dia, mes, ano] = match.map(Number);
  return (
    dia >= 1 && dia <= 31 &&
    mes >= 1 && mes <= 12 &&
    ano >= 2000 && ano <= 2099
  );
}
```

### 3.2. Atualizar a tipagem do body

Localizar a leitura do body (linha ~297) e substituir:

```typescript
// ANTES:
let body: {
  termo?: string;
  offset?: number;
  // ...
} = {};

// DEPOIS:
let body: {
  termo?: string;
  offset?: number;
  pagina_inicio?: number;
  pagina?: number;
  data_inicio?: string;  // Formato DD/MM/AAAA — opcional
  data_fim?: string;     // Formato DD/MM/AAAA — opcional
} = {};
```

### 3.3. Adicionar validação dos parâmetros de data

Inserir a validação após a leitura do body e antes de qualquer lógica de scraping (antes de `getTnuSession`):

```typescript
// --- Validação de filtros de data (se fornecidos) ---
if (body.data_inicio && !validarFormatoDataTNU(body.data_inicio)) {
  return new Response(
    JSON.stringify({
      error: "Parâmetro 'data_inicio' inválido. Use o formato DD/MM/AAAA.",
    }),
    { status: 400, headers: corsHeaders }
  );
}

if (body.data_fim && !validarFormatoDataTNU(body.data_fim)) {
  return new Response(
    JSON.stringify({
      error: "Parâmetro 'data_fim' inválido. Use o formato DD/MM/AAAA.",
    }),
    { status: 400, headers: corsHeaders }
  );
}

if (body.data_inicio && body.data_fim) {
  // Converter para comparação (simples, sem validar dias por mês)
  const [di, mi, ai] = body.data_inicio.split("/").map(Number);
  const [df, mf, af] = body.data_fim.split("/").map(Number);
  if (ai > af || (ai === af && mi > mf) || (ai === af && mi === mf && di > df)) {
    return new Response(
      JSON.stringify({
        error: "'data_inicio' não pode ser posterior a 'data_fim'.",
      }),
      { status: 400, headers: corsHeaders }
    );
  }
}
```

### 3.4. Atualizar a assinatura de `fetchTnuPage`

Localizar a função `fetchTnuPage` e adicionar os parâmetros opcionais:

```typescript
// ANTES:
async function fetchTnuPage(
  termoBusca: string,
  offset: number,
  phpSessId: string,
): Promise<{ html: string; totalResultados: number }> {

// DEPOIS:
async function fetchTnuPage(
  termoBusca: string,
  offset: number,
  phpSessId: string,
  dataInicio?: string,  // Formato DD/MM/AAAA
  dataFim?: string,     // Formato DD/MM/AAAA
): Promise<{ html: string; totalResultados: number }> {
```

### 3.5. Injetar parâmetros de data no formData

Dentro de `fetchTnuPage`, após a construção do objeto `params`, adicionar:

```typescript
  const params: Record<string, string> = {
    hdnAcao: acao,
    txtPesquisaLivre: termoBusca,
    hdnInfraTamanho: String(TNU_PAGE_SIZE),
    hdnInfraInicioRegistro: String(offset),
  };

  // Injetar filtros de data se fornecidos
  if (dataInicio) {
    params.dtDecisaoInicio = dataInicio;
  }
  if (dataFim) {
    params.dtDecisaoFim = dataFim;
  }

  const formData = new URLSearchParams(params);
```

### 3.6. Atualizar a chamada de `fetchTnuPage` no handler

Localizar a invocação de `fetchTnuPage` dentro do handler principal (após a resolução do offset) e passar os novos parâmetros:

```typescript
// ANTES:
const { html, totalResultados } = await fetchTnuPage(
  termo,
  offset,
  phpSessId,
);

// DEPOIS:
const { html, totalResultados } = await fetchTnuPage(
  termo,
  offset,
  phpSessId,
  body.data_inicio,
  body.data_fim,
);
```

### 3.7. Atualizar o campo `proximo_disponivel` na resposta

A lógica de `proximo_disponivel` (que verifica se `offset + TNU_PAGE_SIZE < totalResultados`) não precisa de alteração — funciona independentemente dos filtros de data.

### 3.8. Deploy

```bash
npx supabase functions deploy scrape-tnu --no-verify-jwt
```

### 3.9. Testes pós-deploy

**Teste A — Sem filtro de data (backward compatibility):**

```bash
curl -X POST \
  -H "Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"termo": "previdenciário", "offset": 0}' \
  "https://{SUPABASE_PROJECT_REF}.supabase.co/functions/v1/scrape-tnu"
```

→ Deve funcionar como antes (sem filtro de data).

**Teste B — Com filtro de data válido:**

```bash
curl -X POST \
  -H "Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"termo": "previdenciário", "offset": 0, "data_inicio": "01/01/2025", "data_fim": "31/12/2025"}' \
  "https://{SUPABASE_PROJECT_REF}.supabase.co/functions/v1/scrape-tnu"
```

→ Deve retornar resultados apenas de 2025. Verificar campo `total_tnu` na resposta.

**Teste C — Com filtro de data inválido:**

```bash
curl -X POST \
  -H "Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"termo": "previdenciário", "offset": 0, "data_inicio": "2025-01-01"}' \
  "https://{SUPABASE_PROJECT_REF}.supabase.co/functions/v1/scrape-tnu"
```

→ Deve retornar HTTP 400 com mensagem de formato inválido.

**Teste D — Com data_inicio > data_fim:**

```bash
curl -X POST \
  -H "Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"termo": "previdenciário", "offset": 0, "data_inicio": "01/01/2025", "data_fim": "01/01/2024"}' \
  "https://{SUPABASE_PROJECT_REF}.supabase.co/functions/v1/scrape-tnu"
```

→ Deve retornar HTTP 400 com mensagem de intervalo inválido.

**Teste E — Workflow diário continua funcionando:**

Aguardar a execução automática das 03:00 BRT e verificar que acórdãos foram coletados (o workflow não envia `data_inicio`/`data_fim`, então a função deve operar sem filtros).

---

## Fase 4 — Execução do Backfill Automatizado (2022–2026)

**Objetivo:** Coletar retroativamente acórdãos de Janeiro/2022 a Março/2026, cobrindo todos os 30 termos de busca, e gerar embeddings para todos os registros.

**Arquivo novo:** `scripts/backfill_tnu.py`

### 4.1. Design do Script

O script é projetado para ser executado **uma única vez**, mas com capacidade de **retomada** em caso de falha. Ele NÃO altera o workflow diário.

**Arquitetura:**

```
┌──────────────────────────────────────────────────┐
│                 backfill_tnu.py                  │
├──────────────────────────────────────────────────┤
│  1. Carregar checkpoint (se existir)             │
│  2. Para cada ano [2022..2026]:                  │
│     Para cada termo [0..29]:                     │
│       Se já concluído no checkpoint → pular      │
│       Para cada página (offset 0, 10, 20, ...):  │
│         a. Chamar scrape-tnu com filtros de data │
│         b. Se erro → circuit breaker             │
│         c. Se sem próximos → próximo termo       │
│         d. Sleep(2s)                             │
│       Salvar checkpoint                          │
│  3. Gerar embeddings para todos os pending       │
│     a. Chamar generate-embedding                 │
│     b. Se sucesso → update completed             │
│     c. Se erro → update failed                   │
│     d. Sleep(0.6s)                               │
│  4. Relatório final                              │
└──────────────────────────────────────────────────┘
```

### 4.2. Código Completo do Script

```python
#!/usr/bin/env python3
"""
Backfill de Jurisprudência TNU — RV Advocacia
Coleta retroativa de acórdãos de Jan/2022 a Mar/2026.
Uso único, com retomada via checkpoint.
"""

import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

import requests

# =============================================================================
# Configuração
# =============================================================================

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
SCRAPE_URL = f"{SUPABASE_URL}/functions/v1/scrape-tnu"
EMBED_URL = f"{SUPABASE_URL}/functions/v1/generate-embedding"
REST_URL = f"{SUPABASE_URL}/rest/v1"

HEADERS = {
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
    "apikey": SUPABASE_SERVICE_KEY,
}

# Intervalos de data por ano
# 2026 vai até Março (data de referência)
DATE_RANGES = {
    2022: ("01/01/2022", "31/12/2022"),
    2023: ("01/01/2023", "31/12/2023"),
    2024: ("01/01/2024", "31/12/2024"),
    2025: ("01/01/2025", "31/12/2025"),
    2026: ("01/01/2026", "31/03/2026"),
}

# 30 termos de busca — mesmos do workflow tnu-scraper.yml
TERMOS = [
    # Benefícios por incapacidade
    "auxílio-doença",
    "aposentadoria por invalidez",
    "incapacidade laborativa",
    "nexo causal",
    "laudo pericial",
    # Benefícios assistenciais
    "benefício de prestação continuada BPC LOAS",
    "miserabilidade",
    "pessoa com deficiência LOAS",
    "idoso BPC",
    "renda per capita",
    # Benefícios por morte e família
    "pensão por morte",
    "dependente econômico",
    "salário-maternidade",
    "auxílio-reclusão",
    "cônjuge divorciado",
    # Aposentadorias
    "aposentadoria especial",
    "agente nocivo",
    "tempo de serviço rural",
    "segurado especial",
    "carência",
    # Acidentes e doenças
    "auxílio-acidente",
    "doença ocupacional",
    "acidente de trabalho",
    "sequela permanente",
    "redução da capacidade",
    # Questões de cálculo
    "revisão de benefício",
    "data de início do benefício DIB",
    "salário de benefício",
    "período de graça",
    "qualidade de segurado",
]

# Páginas máximas por termo/ano (50 acórdãos)
MAX_PAGES_PER_TERM = 5
PAGINA_TAMANHO = 10

# Circuit breaker
MAX_CONSECUTIVE_ERRORS = 5
BACKOFF_BASE_SECONDS = 30
BACKOFF_MAX_SECONDS = 300

# Embedding
EMBED_BATCH_SIZE = 100  # Registros pending por batch
EMBED_PAUSE_SECONDS = 0.6
EMBED_MAX_TEXT_LENGTH = 25000
EMBED_TIMEOUT_SECONDS = 20

# Pausas entre requisições ao portal
SCRAPE_PAUSE_SECONDS = 2.0

# Checkpoint
CHECKPOINT_FILE = Path(__file__).parent / "backfill_tnu_checkpoint.json"

# =============================================================================
# Funções Auxiliares
# =============================================================================


def log(msg: str):
    """Log com timestamp."""
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)


def load_checkpoint() -> dict:
    """Carrega checkpoint de progresso."""
    if CHECKPOINT_FILE.exists():
        data = json.loads(CHECKPOINT_FILE.read_text())
        log(f"Checkpoint carregado: ano={data.get('ano')}, termo_idx={data.get('termo_idx')}, offset={data.get('offset')}")
        return data
    return {"ano": 2022, "termo_idx": 0, "offset": 0, "embeddings_processados": 0}


def save_checkpoint(checkpoint: dict):
    """Salva checkpoint de progresso."""
    checkpoint["updated_at"] = datetime.now().isoformat()
    CHECKPOINT_FILE.write_text(json.dumps(checkpoint, indent=2, ensure_ascii=False))


def sleep_with_countdown(seconds: float, label: str = ""):
    """Sleep com countdown visual para longas pausas."""
    if seconds < 3:
        time.sleep(seconds)
        return
    log(f"{label} Aguardando {seconds:.0f}s...")
    for remaining in range(int(seconds), 0, -5):
        time.sleep(min(5, remaining))
        if remaining > 5:
            log(f"{label} ...faltam {remaining}s")
    log(f"{label} Retomando.")


# =============================================================================
# Fase de Coleta
# =============================================================================


def scrape_page(termo: str, offset: int, data_inicio: str, data_fim: str) -> dict | None:
    """
    Chama a Edge Function scrape-tnu com filtros de data.
    Retorna o JSON da resposta ou None em caso de erro.
    """
    payload = {
        "termo": termo,
        "offset": offset,
        "data_inicio": data_inicio,
        "data_fim": data_fim,
    }

    try:
        resp = requests.post(SCRAPE_URL, json=payload, headers=HEADERS, timeout=30)
        if resp.status_code == 200:
            return resp.json()
        elif resp.status_code == 400:
            log(f"  ⚠ Requisição inválida (400): {resp.text[:200]}")
            return None
        elif resp.status_code == 503:
            log(f"  ⚠ Serviço indisponível (503)")
            return None
        else:
            log(f"  ⚠ Erro HTTP {resp.status_code}: {resp.text[:200]}")
            return None
    except requests.exceptions.Timeout:
        log(f"  ⚠ Timeout na requisição (30s)")
        return None
    except requests.exceptions.ConnectionError:
        log(f"  ⚠ Erro de conexão")
        return None
    except Exception as e:
        log(f"  ⚠ Exceção inesperada: {e}")
        return None


def run_scrape_phase(checkpoint: dict) -> dict:
    """Executa a fase de coleta de acórdãos."""

    anos_a_processar = [a for a in sorted(DATE_RANGES.keys()) if a >= checkpoint["ano"]]
    consecutive_errors = 0

    for ano in anos_a_processar:
        data_inicio, data_fim = DATE_RANGES[ano]
        log(f"═══ ANO {ano} ({data_inicio} a {data_fim}) ═══")

        termos_a_processar = range(
            checkpoint["termo_idx"] if ano == checkpoint["ano"] else 0,
            len(TERMOS)
        )

        for termo_idx in termos_a_processar:
            termo = TERMOS[termo_idx]
            offset_inicial = checkpoint["offset"] if (ano == checkpoint["ano"] and termo_idx == checkpoint["termo_idx"]) else 0

            log(f"  → Termo {termo_idx + 1}/30: \"{termo}\"")

            for page_num in range(MAX_PAGES_PER_TERM):
                offset = offset_inicial + page_num * PAGINA_TAMANHO

                result = scrape_page(termo, offset, data_inicio, data_fim)

                if result is None:
                    consecutive_errors += 1
                    if consecutive_errors >= MAX_CONSECUTIVE_ERRORS:
                        backoff = min(BACKOFF_BASE_SECONDS * (2 ** (consecutive_errors - MAX_CONSECUTIVE_ERRORS)), BACKOFF_MAX_SECONDS)
                        log(f"  ✖ {consecutive_errors} erros consecutivos! Circuit breaker ativado.")
                        sleep_with_countdown(backoff, f"  [CB]")
                        consecutive_errors = 0  # Reset após backoff
                        # Recuar uma página para tentar novamente
                        if offset > 0:
                            checkpoint["offset"] = offset - PAGINA_TAMANHO
                        else:
                            checkpoint["offset"] = 0
                        save_checkpoint(checkpoint)
                        continue
                    else:
                        log(f"  ✖ Erro ({consecutive_errors}/{MAX_CONSECUTIVE_ERRORS}) — tentando próxima página")
                        time.sleep(SCRAPE_PAUSE_SECONDS)
                        continue

                # Reset circuit breaker em sucesso
                consecutive_errors = 0

                coletados = result.get("coletados", 0)
                salvos = result.get("salvos", 0)
                total_tnu = result.get("total_tnu", 0)
                proximo_disponivel = result.get("proximo_disponivel", False)
                proximo_offset = result.get("proximo_offset", offset + PAGINA_TAMANHO)

                log(f"    Página offset={offset}: coletados={coletados}, salvos={salvos}, total_portal={total_tnu}, proximo={proximo_disponivel}")

                # Salvar checkpoint após cada página bem-sucedida
                checkpoint["ano"] = ano
                checkpoint["termo_idx"] = termo_idx
                checkpoint["offset"] = proximo_offset
                save_checkpoint(checkpoint)

                # Verificar se há mais páginas
                if not proximo_disponivel:
                    log(f"    ✓ Fim dos resultados para este termo/ano")
                    break

                time.sleep(SCRAPE_PAUSE_SECONDS)

            # Fim dos termos — resetar offset no checkpoint
            checkpoint["offset"] = 0

        # Fim dos termos do ano — resetar termo_idx no checkpoint
        checkpoint["termo_idx"] = 0
        save_checkpoint(checkpoint)

    log("═══ FASE DE COLETA CONCLUÍDA ═══")
    return checkpoint


# =============================================================================
# Fase de Embeddings
# =============================================================================


def generate_embedding(texto: str) -> list[float] | None:
    """Gera embedding para um texto via Edge Function."""
    if len(texto) > EMBED_MAX_TEXT_LENGTH:
        texto = texto[:EMBED_MAX_TEXT_LENGTH]

    payload = {
        "text": texto,
        "taskType": "RETRIEVAL_DOCUMENT",
    }

    try:
        resp = requests.post(EMBED_URL, json=payload, headers=HEADERS, timeout=EMBED_TIMEOUT_SECONDS)
        if resp.status_code == 200:
            data = resp.json()
            return data.get("embedding")
        else:
            log(f"    ⚠ Embedding falhou (HTTP {resp.status_code})")
            return None
    except requests.exceptions.Timeout:
        log(f"    ⚠ Embedding timeout ({EMBED_TIMEOUT_SECONDS}s)")
        return None
    except Exception as e:
        log(f"    ⚠ Embedding exceção: {e}")
        return None


def run_embedding_phase(checkpoint: dict) -> dict:
    """Gera embeddings para todos os registros com status 'pending'."""

    log("═══ FASE DE EMBEDDINGS ═══")

    total_processados = checkpoint.get("embeddings_processados", 0)
    consecutivos_fail = 0

    while True:
        # Buscar próximos N registros pending
        params = {
            "embedding_status": "eq.pending",
            "select": "id,excerpt",
            "limit": str(EMBED_BATCH_SIZE),
            "order": "created_at.asc",
        }

        try:
            resp = requests.get(
                f"{REST_URL}/jurisprudences",
                headers=HEADERS,
                params=params,
                timeout=15,
            )
        except Exception as e:
            log(f"  ⚠ Erro ao consultar pending: {e}")
            sleep_with_countdown(BACKOFF_BASE_SECONDS, "  [REST]")
            continue

        if resp.status_code != 200:
            log(f"  ⚠ Consulta pending falhou (HTTP {resp.status_code})")
            sleep_with_countdown(BACKOFF_BASE_SECONDS, "  [REST]")
            continue

        records = resp.json()
        if not records:
            log("  ✓ Todos os registros pending foram processados")
            break

        log(f"  Batch de {len(records)} registros pending (total processado até agora: {total_processados})")

        for record in records:
            record_id = record["id"]
            texto = record.get("excerpt", "")

            if not texto or len(texto.strip()) < 50:
                # Texto insuficiente — marcar como failed para não ficar preso
                requests.patch(
                    f"{REST_URL}/jurisprudences",
                    headers=HEADERS,
                    params={"id": f"eq.{record_id}"},
                    json={"embedding_status": "failed"},
                )
                log(f"    ✖ Registro {record_id[:8]}... — texto insuficiente, marcado como failed")
                continue

            embedding = generate_embedding(texto)

            if embedding is not None:
                # Sucesso — atualizar registro
                update_resp = requests.patch(
                    f"{REST_URL}/jurisprudences",
                    headers=HEADERS,
                    params={"id": f"eq.{record_id}"},
                    json={
                        "embedding": embedding,
                        "embedding_status": "completed",
                    },
                )

                if update_resp.status_code in (200, 204):
                    total_processados += 1
                    consecutivos_fail = 0
                    if total_processados % 50 == 0:
                        log(f"    ✓ {total_processados} embeddings gerados")
                else:
                    log(f"    ⚠ Falha ao atualizar registro {record_id[:8]}... (HTTP {update_resp.status_code})")
                    consecutivos_fail += 1
            else:
                # Falha no embedding — marcar como failed
                requests.patch(
                    f"{REST_URL}/jurisprudences",
                    headers=HEADERS,
                    params={"id": f"eq.{record_id}"},
                    json={"embedding_status": "failed"},
                )
                consecutivos_fail += 1
                log(f"    ✖ Registro {record_id[:8]}... — embedding falhou, marcado como failed")

            # Salvar checkpoint de embeddings
            checkpoint["embeddings_processados"] = total_processados
            save_checkpoint(checkpoint)

            # Circuit breaker para embeddings
            if consecutivos_fail >= MAX_CONSECUTIVE_ERRORS:
                backoff = min(BACKOFF_BASE_SECONDS * 3, BACKOFF_MAX_SECONDS)
                log(f"    ✖ {consecutivos_fail} falhas consecutivas de embedding! Pausa longa.")
                sleep_with_countdown(backoff, "    [EMBED-CB]")
                consecutivos_fail = 0

            time.sleep(EMBED_PAUSE_SECONDS)

    log(f"═══ FASE DE EMBEDDINGS CONCLUÍDA — {total_processados} embeddings gerados ═══")
    checkpoint["embeddings_processados"] = total_processados
    save_checkpoint(checkpoint)
    return checkpoint


# =============================================================================
# Relatório Final
# =============================================================================


def print_final_report():
    """Consulta o banco e imprime relatório final do backfill."""

    log("═══ RELATÓRIO FINAL ═══")

    queries = {
        "Total de acórdãos": "SELECT COUNT(*) as n FROM jurisprudences",
        "Embeddings completed": "SELECT COUNT(*) as n FROM jurisprudences WHERE embedding_status = 'completed'",
        "Embeddings pending": "SELECT COUNT(*) as n FROM jurisprudences WHERE embedding_status = 'pending'",
        "Embeddings failed": "SELECT COUNT(*) as n FROM jurisprudences WHERE embedding_status = 'failed'",
        "Por ano - 2022": "SELECT COUNT(*) as n FROM jurisprudences WHERE trial_date >= '2022-01-01' AND trial_date < '2023-01-01'",
        "Por ano - 2023": "SELECT COUNT(*) as n FROM jurisprudences WHERE trial_date >= '2023-01-01' AND trial_date < '2024-01-01'",
        "Por ano - 2024": "SELECT COUNT(*) as n FROM jurisprudences WHERE trial_date >= '2024-01-01' AND trial_date < '2025-01-01'",
        "Por ano - 2025": "SELECT COUNT(*) as n FROM jurisprudences WHERE trial_date >= '2025-01-01' AND trial_date < '2026-01-01'",
        "Por ano - 2026": "SELECT COUNT(*) as n FROM jurisprudences WHERE trial_date >= '2026-01-01' AND trial_date < '2026-04-01'",
        "Sem trial_date": "SELECT COUNT(*) as n FROM jurisprudences WHERE trial_date IS NULL",
    }

    for label, sql in queries.items():
        try:
            resp = requests.post(
                f"{REST_URL}/rpc/",
                headers={**HEADERS, "Content-Type": "application/json"},
                json={},
                timeout=10,
            )
        except Exception:
            # Fallback: tentar via query direta (requer PostgREST)
            try:
                # Usar uma query simples via endpoint de tabelas não funciona para COUNT.
                # Solução: usar o endpoint de RPC genérico ou executar via Supabase SQL Editor.
                # Para o script, usamos uma abordagem simplificada.
                resp = requests.get(
                    f"{REST_URL}/jurisprudences",
                    headers=HEADERS,
                    params={"select": "id", "limit": "0", "count": "exact"},
                    timeout=10,
                )
                if "Total" in label:
                    count = resp.headers.get("content-range", "0-0/0").split("/")[-1]
                    log(f"  {label}: {count}")
                    continue
            except Exception:
                pass

            log(f"  {label}: (erro na consulta)")
            continue


# =============================================================================
# Main
# =============================================================================


def main():
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("ERRO: Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.", file=sys.stderr)
        sys.exit(1)

    log("Iniciando backfill TNU — RV Advocacia")
    log(f"Período: Jan/2022 a Mar/2026")
    log(f"Termos: {len(TERMOS)}")
    log(f"Páginas máximas por termo/ano: {MAX_PAGES_PER_TERM}")
    log(f"Checkpoint: {CHECKPOINT_FILE}")

    # Fase 1: Coleta
    checkpoint = load_checkpoint()
    checkpoint = run_scrape_phase(checkpoint)

    # Fase 2: Embeddings
    checkpoint = run_embedding_phase(checkpoint)

    # Relatório
    print_final_report()

    # Limpar checkpoint
    if CHECKPOINT_FILE.exists():
        CHECKPOINT_FILE.unlink()
        log("Checkpoint removido (backfill concluído).")

    log("Backfill finalizado com sucesso.")


if __name__ == "__main__":
    main()
```

### 4.3. Notas sobre o script de backfill

**Por que o relatório final usa abordagem simplificada:**
A API REST do Supabase (PostgREST) não suporta `SELECT COUNT(*)` diretamente. O script usa o header `content-range` para contagem total. Para o relatório detalhado por ano e status de embedding, recomenda-se executar as queries SQL diretamente no **SQL Editor** do Supabase após o backfill:

```sql
-- Relatório completo pós-backfill
SELECT
  EXTRACT(YEAR FROM trial_date)::int AS ano,
  embedding_status,
  COUNT(*) AS total
FROM jurisprudences
GROUP BY EXTRACT(YEAR FROM trial_date), embedding_status
ORDER BY ano, embedding_status;
```

**Por que o script marca registros como `failed`:**
Sem essa lógica, registros com texto insuficiente ou falha recorrente de embedding ficariam em `pending` para sempre, sendo re-processados em cada execução do workflow diário (que busca até 100 `pending`). O status `failed` impede isso.

**Por que não há paralelismo:**
O script é intencionalmente sequencial para respeitar os rate limits do portal TNU (2s entre páginas) e da API Gemini (0.6s entre embeddings). Paralelismo aumentaria o risco de bloqueio.

**Tratamento de embeddings com tamanho excedente:**
O script trunca o texto para 25.000 caracteres antes de enviar, alinhando-se com o limite da Edge Function. Se mesmo assim o embedding falhar, o registro é marcado como `failed`.

### 4.4. Preparação do ambiente

```bash
# No servidor (sandbox Ubuntu)
cd /home/ubuntu/rv-adv

# Criar diretório de scripts se não existir
mkdir -p scripts

# Criar o arquivo
nano scripts/backfill_tnu.py
# (colar o código completo)

# Tornar executável
chmod +x scripts/backfill_tnu.py

# Configurar variáveis de ambiente
export SUPABASE_URL="https://{PROJECT_REF}.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="{SERVICE_ROLE_KEY}"

# Verificar conectividade
curl -s -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "$SUPABASE_URL/rest/v1/jurisprudences?select=id&limit=1" \
  | head -c 100
```

### 4.5. Execução

```bash
# Executar em background com log persistente
nohup python3 scripts/backfill_tnu.py > scripts/backfill_tnu.log 2>&1 &

# Acompanhar progresso
tail -f scripts/backfill_tnu.log

# Verificar checkpoint
cat scripts/backfill_tnu_checkpoint.json
```

### 4.6. Estimativa de tempo

| Variável | Valor | Cálculo |
|---|---|---|
| Anos | 5 | 2022-2026 |
| Termos por ano | 30 | Fixo |
| Combinações ano/termo | 150 | 5 × 30 |
| Páginas por combinação | até 5 | Máximo configurado |
| Páginas totais (máximo) | 750 | 150 × 5 |
| Tempo por página (scrape) | ~4s | 2s scrape + 2s pausa |
| Tempo total de scrape | ~50 min | 750 × 4s |
| Acórdãos estimados | ~8.000-15.000 | Com deduplicação via upsert |
| Tempo por embedding | ~1.6s | 0.6s Gemini + 0.6s update + 0.4s overhead |
| Tempo total de embeddings | ~3.5-6.5 horas | 8.000-15.000 × 1.6s |
| **Tempo total estimado** | **~4-7.5 horas** | |

> **Nota sobre cota diária do Gemini:** Se o script atingir o limite diário de requisições da API Gemini, os registros restantes ficarão em `pending`. O workflow diário (que processa 100 `pending` por execução) eventualmente completará os embeddings ao longo de dias. Para evitar isso, verificar a cota da API antes do backfill e, se necessário, executar o script em dias separados (o checkpoint suporta isso).

### 4.7. Retomada em caso de falha

Se o script for interrompido (crash, reinicialização do servidor, limite de cota):

```bash
# O checkpoint já foi salvo automaticamente
# Apenas re-executar o script — ele retoma de onde parou
export SUPABASE_URL="https://{PROJECT_REF}.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="{SERVICE_ROLE_KEY}"
nohup python3 scripts/backfill_tnu.py > scripts/backfill_tnu.log 2>&1 &
```

O checkpoint registra: ano, índice do termo, offset da página, e total de embeddings já processados.

### 4.8. Verificação da Fase 4

Após a conclusão do script, executar no SQL Editor do Supabase:

```sql
-- 1. Total de acórdãos
SELECT COUNT(*) AS total_geral FROM jurisprudences;

-- 2. Cobertura por ano
SELECT
  CASE
    WHEN trial_date >= '2022-01-01' AND trial_date < '2023-01-01' THEN '2022'
    WHEN trial_date >= '2023-01-01' AND trial_date < '2024-01-01' THEN '2023'
    WHEN trial_date >= '2024-01-01' AND trial_date < '2025-01-01' THEN '2024'
    WHEN trial_date >= '2025-01-01' AND trial_date < '2026-01-01' THEN '2025'
    WHEN trial_date >= '2026-01-01' AND trial_date < '2026-04-01' THEN '2026'
    ELSE 'Outro/NULL'
  END AS ano,
  COUNT(*) AS total
FROM jurisprudences
GROUP BY ano
ORDER BY ano;

-- 3. Status de embeddings
SELECT embedding_status, COUNT(*) FROM jurisprudences GROUP BY embedding_status;

-- 4. Verificar se há não-admissões (não deve haver nenhuma)
SELECT COUNT(*) AS nao_admissoes_resentes FROM jurisprudences
WHERE
  LEFT(TRIM(excerpt), 30) ILIKE 'NÃO ADMISSÃO%'
  OR LEFT(TRIM(excerpt), 40) ILIKE 'INCIDENTE NÃO ADMITIDO%'
  OR LEFT(TRIM(excerpt), 50) ILIKE 'INADMISSIBILIDADE DO PEDIDO%';
```

**Critérios de aceitação:**

| Critério | Valor Mínimo Aceitável |
|---|---|
| Total de acórdãos | > 5.000 |
| Acórdãos por ano (2022-2025) | > 1.000 cada |
| Acórdãos de 2026 | > 100 (apenas Jan-Mar) |
| Embeddings `completed` | = total de acórdãos |
| Embeddings `pending` | = 0 |
| Embeddings `failed` | < 1% do total |
| Não-admissões presentes | = 0 |

Se houver registros `failed`, investigar:
```sql
SELECT id, process_number, LENGTH(excerpt) AS tamanho_ementa, LEFT(excerpt, 100) AS preview
FROM jurisprudences
WHERE embedding_status = 'failed'
LIMIT 20;
```

Se o `failed` for por texto insuficiente (< 50 chars), é esperado e aceitável. Se for por timeout da API Gemini, re-executar o embedding manualmente:
```sql
-- Resetar failed para pending para re-processamento
UPDATE jurisprudences SET embedding_status = 'pending' WHERE embedding_status = 'failed';
-- Depois, executar o workflow diário manualmente ou re-executar a fase de embeddings do script
```

---

## Fase 5 — Validação Final e Monitoramento

**Objetivo:** Confirmar que todo o sistema funciona corretamente após todas as alterações.

### 5.1. Validação da busca semântica

Acessar a aba "Busca Semântica" no frontend e executar as seguintes consultas:

| Consulta | Resultado Esperado |
|---|---|
| "requisitos para concessão de BPC a pessoa com autismo" | Acórdãos sobre BPC/LOAS e deficiência, com similaridade > 0.5 |
| "auxílio-acidente e nexo causal" | Acórdãos sobre auxílio-acidente |
| "incidente não admitido" | **Zero resultados** (filtrados) |
| "não conhecimento do incidente" | **Zero resultados** (filtrados) |

### 5.2. Validação do Chat Jurídico RAG

Acessar a aba "Chat Jurídico" e testar:

| Pergunta | Resultado Esperado |
|---|---|
| "A TNU exige comprovação de miserabilidade para BPC?" | Resposta fundamentada em acórdãos, com citação de números de processo |
| "Quais os requisitos do auxílio-acidente?" | Resposta com fontes de diferentes anos (2022-2026) |
| "O que a TNU decidiu sobre não admissão?" | Resposta indicando que não há acórdãos sobre o tema na base |

### 5.3. Validação do workflow diário

Aguardar a execução automática das 03:00 BRT do dia seguinte e verificar:

```sql
-- Acórdãos coletados pelo workflow diário (após o backfill)
SELECT COUNT(*) AS coletados_ultimo_dia
FROM jurisprudences
WHERE created_at >= NOW() - INTERVAL '1 day';

-- Todos com embedding
SELECT embedding_status, COUNT(*)
FROM jurisprudences
WHERE created_at >= NOW() - INTERVAL '1 day'
GROUP BY embedding_status;
```

### 5.4. Validação de performance

Com a base ampliada para ~10.000 registros, medir o tempo de busca:

```sql
EXPLAIN ANALYZE
SELECT * FROM buscar_jurisprudencia(
  '[0.0123, -0.0456, ...]'::vector(3072),  -- vetor de teste
  10,
  0.4
);
```

O tempo de execução deve ser **< 500ms**. Se for superior, considerar:
- Adicionar índice parcial em `embedding_status = 'completed'` para evitar scan de registros sem embedding
- Em bases > 50.000, avaliar truncamento para 1536 dims + índice IVFFlat

### 5.5. Limpeza pós-backfill

```bash
# Remover script de backfill e checkpoint (não são mais necessários)
rm scripts/backfill_tnu.py scripts/backfill_tnu_checkpoint.json scripts/backfill_tnu.log

# Ou, se preferir manter para referência futura:
mv scripts/backfill_tnu.py scripts/backfill_tnu.py.DONE
```

---

## 9. Rastreabilidade de Riscos

| Risco Identificado na Análise | Fase de Mitigação | Mecanismo |
|---|---|---|
| False positives em "não conhecimento" descartando acórdãos válidos | Fase 1 | Âncoras `^` + contexto "DO INCIDENTE" |
| Inconsistência entre regex (scraper) e ILIKE (SQL) | Fase 1 + 2 | `LEFT(TRIM(excerpt), N) ILIKE '...'` simula âncora em SQL |
| Arquivos órfãos no Storage após DELETE | Fase 2 | Coleta de paths antes do DELETE + remoção explícita |
| Portal TNU mudou HTML entre 2022-2026 | Fase 0 | Teste empírico antes de qualquer código |
| `dtDecisao` filtra por publicação, não julgamento | Fase 0 | Documentado e considerado no script |
| Formato de data inválido causando busca sem filtro | Fase 3 | Validação `validarFormatoDataTNU` + HTTP 400 |
| Portal bloqueia IP por excesso de requisições | Fase 4 | Circuit breaker + exponential backoff (até 5 min) |
| Limite diário de API Gemini impede backfill em 1 dia | Fase 4 | Checkpoint com retomada + `failed` para não reprocessar |
| Duplicatas entre termos desperdiçam requisições | Fase 4 | Aceitado como trade-off (upsert evita duplicação no banco) |
| Registros com texto insuficiente ficam em `pending` eterno | Fase 4 | Marcação como `failed` quando texto < 50 chars |
| Workflow diário quebra por mudança na Edge Function | Fase 1 + 3 | Parâmetros novos são opcionais + testes de backward compat |
| Backfill introduz não-admissões (filtros não aplicados) | Ordem de fases | Filtros de qualidade (Fase 1) antes do backfill (Fase 4) |

---

## 10. Checklist de Entregas

### Código-fonte
- [ ] `supabase/functions/scrape-tnu/index.ts` — array `PADROES_EXCLUSAO` atualizado com 10 padrões (5 âncorados + 5 com prefixo "EMENTA:")
- [ ] `supabase/functions/scrape-tnu/index.ts` — função `validarFormatoDataTNU` adicionada
- [ ] `supabase/functions/scrape-tnu/index.ts` — tipagem do body atualizada com `data_inicio` e `data_fim` opcionais
- [ ] `supabase/functions/scrape-tnu/index.ts` — `fetchTnuPage` aceita e injeta `dataInicio`/`dataFim`
- [ ] `supabase/functions/scrape-tnu/index.ts` — validação de formato de data e ordenação lógica (inicio <= fim)
- [ ] `supabase/functions/scrape-tnu/index.ts` — deploy realizado com `--no-verify-jwt`

### Banco de dados
- [ ] Dry run de contagem executado e resultado registrado
- [ ] Arquivos do Storage identificados e removidos para registros a serem deletados
- [ ] DELETE executado dentro de transação (BEGIN/COMMIT)
- [ ] Confirmação: zero registros com padrões de não-admissão

### Backfill
- [ ] Script `scripts/backfill_tnu.py` criado com checkpoint, circuit breaker, exponential backoff
- [ ] Variáveis de ambiente configuradas
- [ ] Script executado com sucesso (log sem erros críticos)
- [ ] Checkpoint removido após conclusão

### Validação
- [ ] Busca semântica retorna resultados de 2022-2026
- [ ] Busca por "incidente não admitido" retorna zero resultados
- [ ] Chat RAG fundamenta respostas em acórdãos de diferentes anos
- [ ] Workflow diário coletou acórdãos novos na manhã seguinte
- [ ] Performance de busca < 500ms

### Não alterado (confirmação)
- [ ] `.github/workflows/tnu-scraper.yml` — intacto, sem modificações
- [ ] `supabase/functions/generate-embedding/index.ts` — intacto
- [ ] `supabase/functions/chat-jurisprudencia/index.ts` — intacto
- [ ] Frontend (`JurisprudenciaPage.jsx`, `jurisprudenciaService.js`, `AcordaoCard`) — intacto
