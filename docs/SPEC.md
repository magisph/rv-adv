# SPEC.md - Ingestao TRF5/CE na Base Interna

## Visao Geral

O scraper TRF5 coleta julgados do portal Julia Pesquisa e grava no fluxo canonico de jurisprudencia do projeto:

`scrape-trf5 -> ai-proxy embedding -> public.jurisprudences -> buscar_jurisprudencia -> Base Interna / Busca Semantica / Chat RAG`

Nao ha modulo nem tabela operacional paralela para TRF5. A tabela `public.jurisprudencia_trf5`, criada anteriormente, e tratada como legado e migrada para `public.jurisprudences` quando existir.

## Portal e Filtros

- Portal: `https://juliapesquisa.trf5.jus.br/julia-pesquisa/pesquisa`
- API observada: `/julia-pesquisa/api/v1/documento:dt/TRU`
- Orgao: `TRU`
- Secao/Jurisdicao: `CE`
- Orgaos julgadores usados para restringir CE:
  - `REL. 1ª TR/CE`
  - `REL. 2ª TR/CE`
  - `REL. 3ª TR/CE`

## Modos

```json
{
  "mode": "manual_range",
  "startDate": "2026-01-01",
  "endDate": "2026-05-04",
  "terms": ["LOAS", "BPC", "aposentadoria rural"]
}
```

- `initial_import`: usa `2026-01-01` a `2026-05-04` quando datas nao forem informadas.
- `daily_sync`: busca a partir da ultima `trial_date` TRF5/CE, com janela de seguranca de 5 dias.
- `manual_range`: usa o intervalo informado.

## Persistencia

Tabela canonica: `public.jurisprudences`.

Campos TRF5 adicionados:

- `source = 'trf5'`
- `jurisdicao = 'CE'`
- `process_number_raw`
- `orgao_julgador`
- `source_url`
- `external_id`
- `similarity_score`
- `is_unique_teor`
- `last_scraped_at`

Embeddings seguem o padrao atual do projeto auditado: `halfvec(3072)` com HNSW, gerado via `ai-proxy` (`action: "embedding"`), sem chamada direta ao Gemini no scraper.

## Deduplicacao

RPC canonica: `public.verificar_inserir_jurisprudencia`.

- Normaliza `process_number` para apenas digitos.
- Reexecucao do mesmo processo atualiza o registro existente e nao cria duplicata.
- Calcula `similarity_score` como a maior similaridade contra toda `public.jurisprudences`.
- Define `is_unique_teor = true` apenas quando `similarity_score < 0.85`.
- Insere julgados similares com `is_unique_teor = false`, preservando auditoria sem duplicar por processo.

## Rotina Diaria

Workflow: `.github/workflows/trf5-scraper.yml`.

Ativacao manual da carga inicial:

```bash
gh workflow run trf5-scraper.yml -f mode=initial_import -f start_date=2026-01-01 -f end_date=2026-05-04
```

Rotina automatica: diariamente as 07:00 UTC.
