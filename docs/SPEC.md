# SPEC.md - Scraping TRF5 (Turma Recursal Ceará)

## 1. Visão Geral
Este documento descreve a arquitetura, os contratos de API e as regras de negócio para a implementação de um scraper de jurisprudência do TRF5 (Turma Recursal do Ceará - TRU CE), englobando a coleta, vetorização (embeddings via Gemini), deduplicação semântica e armazenamento seguro com RLS no Supabase.

## 2. Escopo e Requisitos
*   **Alvo:** Portal Julia Pesquisa (TRF5).
*   **Filtros Estritos:**
    *   `orgao`: TRU
    *   `secao`: CE
    *   `data_julgamento_inicio` a `data_julgamento_fim`: 01/01/2026 a 30/04/2026.
*   **Campos Extraídos:** `process_number`, `trial_date`, `relator`, `orgao_julgador`, `excerpt` (Ementa).
*   **Campos Derivados:**
    *   `source`: 'trf5' (Fixo)
    *   `jurisdicao`: 'CE' (Fixo)
    *   `embedding`: `vector(768)`
    *   `is_unique_teor`: Booleano (indicador de similaridade semântica global).

## 3. Lógica de Deduplicação Semântica (Chunking & HNSW)
1. **Extração:** A Ementa (`excerpt`) do acórdão é recuperada.
2. **Chunking/Vetorização:** Devido à natureza geralmente sucinta das ementas, o texto completo da ementa será enviado para o proxy interno (`ai-proxy`) para gerar o embedding usando um modelo compatível com 768 dimensões (ex. Gemini embedding). Caso exceda o limite de tokens, será truncado/particionado, priorizando os primeiros parágrafos que contêm a essência da decisão.
3. **Avaliação de Similaridade (PostgreSQL/pgvector):**
    * A busca do vizinho mais próximo será feita na tabela utilizando a distância de cosseno (`<=>`).
    * **Threshold de Deduplicação:** `0.85` de similaridade (`1 - distance >= 0.85`).
    * **Decisão:**
        * Se nenhuma ementa existente apresentar similaridade `>= 0.85`, a nova ementa será inserida com `is_unique_teor = true`.
        * Se for encontrado algum registro com similaridade `>= 0.85`, a nova ementa será inserida com `is_unique_teor = false`.

## 4. Banco de Dados (PostgreSQL)
### Tabela: `jurisprudencia_trf5`
| Coluna | Tipo | Restrições |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `process_number` | TEXT | UNIQUE |
| `trial_date` | DATE | NOT NULL |
| `relator` | TEXT | NOT NULL |
| `orgao_julgador` | TEXT | NOT NULL |
| `excerpt` | TEXT | NOT NULL |
| `source` | TEXT | DEFAULT 'trf5' |
| `jurisdicao` | TEXT | DEFAULT 'CE' |
| `embedding` | vector(768) | |
| `is_unique_teor`| BOOLEAN | NOT NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

### Índices e Políticas
*   **Índice HNSW:** `CREATE INDEX idx_jurisprudencia_trf5_embedding ON jurisprudencia_trf5 USING hnsw (embedding vector_cosine_ops);`
*   **Row Level Security (RLS):** Habilitada. Políticas `Fail-Close` que garantem que apenas papéis autenticados (`authenticated`) com permissões adequadas possam ler ou inserir registros.

## 5. Contrato da API (Edge Function)
**Endpoint:** `POST /scrape-trf5`

### Requisição
*   **Headers:**
    *   `Authorization`: `Bearer <JWT>` ou `x-service-key: <Secret>`
*   **Body:**
```json
{
  "pesquisa_livre": "string (opcional)",
  "data_inicio": "2026-01-01",
  "data_fim": "2026-04-30"
}
```

### Resposta
```json
{
  "success": true,
  "metrics": {
    "scraped": 25,
    "unique": 15,
    "duplicates": 10
  }
}
```

## 6. Arquitetura da Edge Function (Clean Architecture)
*   **Router:** Validação de payload via `Zod`. Validação de JWT.
*   **Service (Scraper):** Faz requisições HTTP ao TRF5 com rate limiting rígido de 1 req/segundo e implementa Exponential Backoff. Faz roteamento do texto extraído para o `ai-proxy`.
*   **Repository:** Executa chamadas à Remote Procedure Call (RPC) `verificar_inserir_jurisprudencia_trf5` que encapsula as lógicas atômicas de similaridade e inserção no banco.

## 7. Critérios de Qualidade e Segurança (QA)
*   **Segurança:** A Edge Function nunca deve aceitar invocações anônimas; tokens vazados causarão erro `401 Unauthorized`.
*   **Resiliência:** Tolerância a falhas na API do TRF5 sem impactar o serviço principal.
*   **Performance:** Tempo de processamento mitigado ao não sobrecarregar o Supabase com atualizações em lote (Batching), respeitando os limites da infraestrutura.
