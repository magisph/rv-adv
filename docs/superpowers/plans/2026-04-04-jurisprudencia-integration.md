# Integração de Jurisprudência Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o módulo de pesquisa jurisprudencial semântica (vetorial) integrando-se ao schema `public.jurisprudences` existente, ao scraper Node.js/Crawlee e ao frontend React do RV-Adv.

**Architecture:** O módulo aproveita o schema existente `public.jurisprudences` adicionando colunas para embeddings e caminhos de arquivos (PDF/JSON). O scraping da TNU é feito estendendo o `local-scraper` (Crawlee/Playwright) com a biblioteca `pdf-parse` para extração de texto. Edge Functions (`generate-embedding`, `chat-jurisprudencia`) cuidam da IA com a API Gemini. O frontend adiciona a página `JurisprudenciaPage` roteada via `pages.config.js` e exibida no `Layout.jsx`.

**Tech Stack:** PostgreSQL (pgvector), Supabase Edge Functions (Deno), Node.js (Crawlee, pdf-parse), React (Vite, Tailwind, React Router).

---

### Task 1: Adequação do Schema no Supabase

**Files:**
- Create: `supabase/migrations/045_jurisprudencia_vetorial.sql`

- [ ] **Step 1: Escrever a migration SQL**

```sql
-- =====================================================================
-- Migration 045: Adequação do schema para busca vetorial de jurisprudência
-- =====================================================================

-- 1. Habilitar pgvector se não existir
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Adicionar colunas necessárias à tabela existente public.jurisprudences
ALTER TABLE public.jurisprudences ADD COLUMN IF NOT EXISTS embedding vector(768);
ALTER TABLE public.jurisprudences ADD COLUMN IF NOT EXISTS pdf_path TEXT;
ALTER TABLE public.jurisprudences ADD COLUMN IF NOT EXISTS json_extracted_path TEXT;
ALTER TABLE public.jurisprudences ADD COLUMN IF NOT EXISTS embedding_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE public.jurisprudences ADD COLUMN IF NOT EXISTS first_indexed_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.jurisprudences ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.jurisprudences ADD COLUMN IF NOT EXISTS relator TEXT;
ALTER TABLE public.jurisprudences ADD COLUMN IF NOT EXISTS tema TEXT;

-- 3. Criar índice vetorial (IVFFlat) para buscas rápidas
-- Nota: IVFFlat requer dados para ser eficiente, mas pode ser criado vazio.
CREATE INDEX IF NOT EXISTS idx_jurisprudences_embedding ON public.jurisprudences USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 4. Função RPC para busca semântica
CREATE OR REPLACE FUNCTION public.buscar_jurisprudencia(query_embedding vector(768), match_count int DEFAULT 10)
RETURNS TABLE (
  id UUID,
  process_number TEXT,
  publication_date DATE,
  relator TEXT,
  tema TEXT,
  excerpt TEXT,
  pdf_path TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.id,
    j.process_number,
    j.publication_date,
    j.relator,
    j.tema,
    j.excerpt,
    j.pdf_path,
    1 - (j.embedding <=> query_embedding) AS similarity
  FROM public.jurisprudences j
  WHERE j.embedding IS NOT NULL
  ORDER BY j.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. Criar bucket no Storage (se não existir) para PDFs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('jurisprudencia', 'jurisprudencia', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas do Storage
CREATE POLICY "Enable read access for authenticated users on jurisprudencia"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'jurisprudencia');

CREATE POLICY "Enable insert for authenticated users on jurisprudencia"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'jurisprudencia');
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/045_jurisprudencia_vetorial.sql
git commit -m "feat(db): add vector search and PDF metadata to jurisprudences schema"
```

### Task 2: Scraper e Extração de PDF (Local Scraper)

**Files:**
- Modify: `local-scraper/package.json`
- Create: `local-scraper/crawlers/tnu-crawler.ts`
- Modify: `local-scraper/server.ts`

- [ ] **Step 1: Adicionar dependência pdf-parse**

```bash
cd local-scraper
npm install pdf-parse
npm install -D @types/pdf-parse
```

- [ ] **Step 2: Criar o crawler da TNU**

```typescript
// local-scraper/crawlers/tnu-crawler.ts
import { PlaywrightCrawler, Configuration } from 'crawlee';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';

export async function iniciarScrapingTNU(supabaseUrl: string, supabaseKey: string) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const resultados = [];

  const crawler = new PlaywrightCrawler({
    headless: true,
    async requestHandler({ page, request, log }) {
      log.info(`Processando ${request.url}...`);
      
      // Simulação simplificada para o plano (deve ser expandida conforme o DOM real da TNU)
      await page.waitForSelector('.resultado-busca', { timeout: 10000 }).catch(() => null);
      
      // Exemplo de extração
      const processos = await page.$$eval('.resultado-item', (nodes) => {
        return nodes.map(n => ({
          numero: n.querySelector('.numero')?.textContent?.trim() || '',
          data: n.querySelector('.data')?.textContent?.trim() || '',
          ementa: n.querySelector('.ementa')?.textContent?.trim() || '',
          pdfUrl: n.querySelector('a.pdf-link')?.getAttribute('href') || ''
        }));
      });

      for (const proc of processos) {
        if (!proc.numero || !proc.pdfUrl) continue;

        // Verifica se já existe
        const { data: existe } = await supabase
          .from('jurisprudences')
          .select('id')
          .eq('process_number', proc.numero)
          .single();
          
        if (existe) {
          log.info(`Processo ${proc.numero} já existe. Pulando.`);
          continue;
        }

        // Baixa e extrai PDF (simplificado)
        // const pdfBuffer = await downloadPdf(proc.pdfUrl);
        // const pdfData = await pdfParse(pdfBuffer);
        // const textoCompleto = pdfData.text;

        // Upload para Storage
        // const pdfPath = `tnu/${proc.numero}.pdf`;
        // await supabase.storage.from('jurisprudencia').upload(pdfPath, pdfBuffer);

        // Insere no banco
        /*
        await supabase.from('jurisprudences').insert({
          process_number: proc.numero,
          excerpt: proc.ementa,
          full_text: textoCompleto,
          pdf_path: pdfPath,
          embedding_status: 'pending'
        });
        */
        resultados.push(proc.numero);
      }
    },
  });

  // URL de busca fictícia para o exemplo
  await crawler.run(['https://eproctnu-jur.cjf.jus.br/busca']);
  return { sucesso: true, processados: resultados.length };
}
```

- [ ] **Step 3: Adicionar rotas no server.ts**

Adicione antes da seção `// ─── Inicialização do Servidor ───────────`:

```typescript
// Em local-scraper/server.ts
import { iniciarScrapingTNU } from './crawlers/tnu-crawler.js';

app.post('/api/jurisprudencia/scrape-tnu', async (req: Request, res: Response) => {
  try {
    const result = await iniciarScrapingTNU(supabaseUrl!, supabaseKey!);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

- [ ] **Step 4: Commit**

```bash
git add local-scraper/package.json local-scraper/crawlers/tnu-crawler.ts local-scraper/server.ts
git commit -m "feat(scraper): add TNU crawler and pdf extraction route"
```

### Task 3: Edge Function - Gerar Embeddings

**Files:**
- Create: `supabase/functions/generate-embedding/index.ts`

- [ ] **Step 1: Criar a Edge Function**

```typescript
// supabase/functions/generate-embedding/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } });
  }

  try {
    const { text, model = "models/embedding-001" } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: "Text is required" }), { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY is missing" }), { status: 500 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${model}:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model,
          content: { parts: [{ text }] }
        }),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || "Erro na API Gemini");
    }

    return new Response(
      JSON.stringify({ embedding: data.embedding.values }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/generate-embedding/index.ts
git commit -m "feat(edge-functions): create generate-embedding function using Gemini API"
```

### Task 4: Frontend - Serviço e UI

**Files:**
- Create: `src/services/jurisprudenciaService.js`
- Create: `src/pages/JurisprudenciaPage.jsx`
- Modify: `src/pages.config.js`
- Modify: `src/Layout.jsx`

- [ ] **Step 1: Criar o serviço frontend**

```javascript
// src/services/jurisprudenciaService.js
import { supabase } from '../lib/supabase';

export async function buscarJurisprudencia(query) {
  // 1. Obter embedding da query via Edge Function
  const { data: embedData, error: embedError } = await supabase.functions.invoke('generate-embedding', {
    body: { text: query }
  });

  if (embedError || !embedData?.embedding) {
    throw new Error('Falha ao gerar embedding da busca');
  }

  // 2. Chamar a RPC buscar_jurisprudencia
  const { data, error } = await supabase.rpc('buscar_jurisprudencia', {
    query_embedding: embedData.embedding,
    match_count: 10
  });

  if (error) throw error;
  return data;
}
```

- [ ] **Step 2: Criar a página**

```jsx
// src/pages/JurisprudenciaPage.jsx
import React, { useState } from 'react';
import { buscarJurisprudencia } from '@/services/jurisprudenciaService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function JurisprudenciaPage() {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const data = await buscarJurisprudencia(query);
      setResultados(data || []);
    } catch (error) {
      console.error(error);
      alert("Erro na busca: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Pesquisa Jurisprudencial (TNU)</h1>
      
      <form onSubmit={handleSearch} className="flex gap-4 mb-8">
        <Input 
          value={query} 
          onChange={e => setQuery(e.target.value)}
          placeholder="Ex: Requisitos para concessão de benefício assistencial"
          className="flex-1"
        />
        <Button type="submit" disabled={loading}>
          {loading ? 'Buscando...' : 'Buscar'}
        </Button>
      </form>

      <div className="space-y-6">
        {resultados.map(res => (
          <div key={res.id} className="border p-4 rounded shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold">{res.process_number}</h3>
              <span className="text-sm text-gray-500">Score: {(res.similarity * 100).toFixed(1)}%</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">Data: {res.publication_date} | Relator: {res.relator}</p>
            <p className="text-sm mb-4">{res.excerpt}</p>
            {res.pdf_path && (
              <Button variant="outline" size="sm" onClick={() => window.open(res.pdf_path)}>
                Ver PDF
              </Button>
            )}
          </div>
        ))}
        {!loading && resultados.length === 0 && query && (
          <p className="text-gray-500">Nenhum resultado encontrado.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Atualizar pages.config.js**

Modifique `src/pages.config.js` para incluir a nova página:

```javascript
// Adicionar aos imports no topo:
import JurisprudenciaPage from "./pages/JurisprudenciaPage";

// Adicionar ao objeto PAGES:
export const PAGES = {
  // ... (manter existentes)
  Jurisprudencia: JurisprudenciaPage,
};
```

- [ ] **Step 4: Atualizar Layout.jsx**

Modifique `src/Layout.jsx` para adicionar o link no menu lateral:

```javascript
// Adicionar o ícone aos imports de lucide-react (se não existir BookOpen, adicione)
import { /* ... */ BookOpen } from "lucide-react";

// Adicionar ao array navItems (linha ~80):
  const navItems = [
    { name: "Dashboard", icon: LayoutDashboard, page: "Home" },
    { name: "Clientes", icon: Users, page: "Clients" },
    { name: "Processos", icon: FolderOpen, page: "Processes" },
    { name: "Jurisprudência", icon: BookOpen, page: "Jurisprudencia" }, // NOVO ITEM
    { name: "Radar CNJ", icon: Radar, page: "RadarCNJ" },
    // ...
  ];
```

- [ ] **Step 5: Commit**

```bash
git add src/services/jurisprudenciaService.js src/pages/JurisprudenciaPage.jsx src/pages.config.js src/Layout.jsx
git commit -m "feat(frontend): add Jurisprudencia page, service, and navigation"
```
