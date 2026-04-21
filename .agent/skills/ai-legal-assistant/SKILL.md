---
name: ai-legal-assistant
description: Especialista em integração de IA generativa para aplicações jurídicas. Use ao implementar ou modificar funcionalidades de IA:chat RAG, OCR, geração de documentos, classificação.
---

# IA para Aplicações Jurídicas

## Arquitetura de IA do RV-Adv

### Gateway Central: `ai-proxy` Edge Function
Toda chamada a LLMs passa pelo proxy que:
- Centraliza API keys (nunca expostas no frontend)
- Implementa fallback chain (Groq → DeepSeek → Cohere)
- Rate limiting por modelo e usuário
- Logging de uso (sem dados sensíveis)

### Provedores e Casos de Uso

| Provedor | Modelo | Caso de Uso |
|----------|--------|-------------|
| Google Gemini 2.5 Flash | Multimodal | OCR de documentos, parsing de emails, embeddings |
| Groq + Llama 3.3 70B | LLM | Geração de documentos jurídicos (primário) |
| OpenRouter + DeepSeek R1 | LLM | Geração de documentos (fallback) |
| Groq + Llama 3.1 8B | LLM | Classificação rápida de documentos |
| NVIDIA Nemotron | LLM | Análise de processos (contexto longo) |
| Qwen2.5 VL | Vision-Language | OCR (fallback) |
| Cohere Command R+ | LLM | Classificação (fallback) |

### Fluxo de Geração de Documentos
1. Usuário seleciona template + cliente + processo
2. Frontend envia dados para Edge Function
3. Edge Function busca contexto (cliente, processo, jurisprudência)
4. LLM gera documento com prompt especializado
5. Resultado formatado em DOCX (docxtemplater) ou PDF (jsPDF)
6. Download ou armazenamento na tabela `documents`

### Chat RAG de Jurisprudência
1. Usuário faz pergunta sobre jurisprudência
2. Query convertida em embedding (768 dims) via `generate-embedding`
3. Busca vetorial no pgvector (HNSW index)
4. Contexto relevante + pergunta enviada ao LLM
5. Resposta com citações e links para jurisprudência

## Regras
1. NUNCA chamar APIs de IA diretamente do frontend
2. NUNCA enviar dados sensíveis (CPF completo, senha) nos prompts
3. SEMPRE sanitizar input antes de enviar ao LLM
4. SEMPRE implementar fallback chain (mínimo 2 provedores)
5. SEMPRE logar uso (tokens consumidos, modelo, latência)
6. Contexto de prompts: jurídico brasileiro, linguagem formal
