// ============================================
// RV-Adv AI Service - Multi-Provider Architecture
// ============================================

const PROVIDERS = {
  GROQ: {
    baseUrl: import.meta.env.VITE_GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
    apiKey: import.meta.env.VITE_GROQ_API_KEY,
    defaultModel: import.meta.env.VITE_MODEL_WRITER || 'llama-3.3-70b-versatile'
  },
  OPENROUTER: {
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: import.meta.env.VITE_OPENROUTER_API_KEY,
    defaultModel: 'deepseek/deepseek-r1'
  },
  GEMINI: {
    baseUrl: import.meta.env.VITE_GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: import.meta.env.VITE_GEMINI_API_KEY,
    defaultModel: import.meta.env.VITE_MODEL_VISION || 'gemini-2.0-flash'
  },
  COHERE: {
    baseUrl: 'https://api.cohere.ai/v1',
    apiKey: import.meta.env.VITE_COHERE_API_KEY,
    defaultModel: 'command-r-plus'
  },
  NVIDIA: {
    baseUrl: import.meta.env.VITE_NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
    apiKey: import.meta.env.VITE_NVIDIA_API_KEY,
    defaultModel: import.meta.env.VITE_MODEL_ANALYSIS || 'nvidia/nemotron-3-nano-30b-a3b'
  }
};

// ============================================
// Upload Service (Supabase Storage)
// ============================================

import { supabase } from '@/lib/supabase';

async function uploadFileToStorage(file) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `documents/${fileName}`;

  const { data, error } = await supabase.storage
    .from('uploads')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('uploads')
    .getPublicUrl(data.path);

  return { file_url: urlData.publicUrl, path: data.path };
}

// ============================================
// AI Service Principal
// ============================================

export const aiService = {

  // ----------------------------------------
  // UPLOAD DE ARQUIVO
  // Usa: Supabase Storage
  // ----------------------------------------
  async uploadFile({ file }) {
    return uploadFileToStorage(file);
  },

  // ----------------------------------------
  // GERAÇÃO DE DOCUMENTOS JURÍDICOS
  // Primário: Groq + Llama 3.3 70B (rápido)
  // Backup: OpenRouter + DeepSeek R1 (raciocínio)
  // ----------------------------------------
  async generateLegalDocument(template, variables, documentType = 'peticao') {
    const systemPrompt = `Você é um advogado experiente brasileiro.
Regras para geração de ${documentType}:
- Linguagem jurídica formal brasileira
- Estrutura processual correta
- Fundamentação legal adequada
- Terminologia técnica correta
- NUNCA invente legislação ou jurisprudência`;

    const prompt = `Gere ${documentType} com:\nTemplate: ${template}\nDados: ${JSON.stringify(variables)}`;

    try {
      return await this._callGroq(prompt, systemPrompt, {
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 8192
      });
    } catch (error) {
      console.warn('[AI] Groq falhou, tentando DeepSeek R1:', error.message);
      return await this._callOpenRouter(prompt, systemPrompt, {
        model: 'deepseek/deepseek-r1',
        temperature: 0.3,
        max_tokens: 4096
      });
    }
  },

  // ----------------------------------------
  // INVOCAÇÃO LLM GENÉRICA
  // Compatibilidade com chamadas antigas InvokeLLM
  // ----------------------------------------
  async invokeLLM({ prompt, response_json_schema, system_prompt, ...options }) {
    const systemPrompt = system_prompt || 'Você é um assistente jurídico brasileiro experiente.';

    let fullPrompt = prompt;
    if (response_json_schema) {
      fullPrompt += `\n\nResponda EXCLUSIVAMENTE em JSON válido seguindo este schema:\n${JSON.stringify(response_json_schema)}`;
    }

    try {
      const result = await this._callGroq(fullPrompt, systemPrompt, {
        model: options.model || 'llama-3.3-70b-versatile',
        temperature: options.temperature || 0.3,
        max_tokens: options.max_tokens || 4096
      });

      if (response_json_schema) {
        // Tenta extrair JSON da resposta
        const jsonMatch = result.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
      }
      return result;
    } catch (error) {
      console.warn('[AI] Groq falhou, tentando OpenRouter:', error.message);
      const result = await this._callOpenRouter(fullPrompt, systemPrompt, {
        model: 'deepseek/deepseek-r1',
        temperature: options.temperature || 0.3,
        max_tokens: options.max_tokens || 4096
      });

      if (response_json_schema) {
        const jsonMatch = result.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
      }
      return result;
    }
  },

  // ----------------------------------------
  // OCR INTELIGENTE
  // Primário: Gemini 2.0 Flash (multimodal)
  // Backup: Qwen2.5 VL via OpenRouter
  // ----------------------------------------
  async extractTextFromImage(imageBase64, mimeType = 'image/jpeg') {
    const prompt = `Extraia todo o texto deste documento jurídico.
Mantenha formatação (parágrafos, listas, tabelas).
Identifique campos: nome, CPF, data, valores.`;

    try {
      return await this._callGeminiVision(prompt, imageBase64, mimeType);
    } catch (error) {
      console.warn('[AI] Gemini falhou, tentando Qwen2.5 VL:', error.message);
      return await this._callOpenRouterVision(prompt, imageBase64, mimeType);
    }
  },

  // ----------------------------------------
  // CLASSIFICAÇÃO DE DOCUMENTOS
  // Primário: Groq + Llama 3.1 8B (ultra-rápido)
  // Backup: Cohere Command R+
  // ----------------------------------------
  async classifyDocument(text) {
    const categories = [
      'pessoais', 'inss', 'medicos', 'judicial',
      'peticao', 'prova', 'laudo', 'contrato',
      'procuracao', 'outros'
    ];

    const prompt = `Classifique em UMA categoria: ${categories.join(', ')}.
Retorne APENAS o nome da categoria em minúsculas (uma única palavra).
Documento: ${text.substring(0, 1000)}`;

    try {
      const result = await this._callGroq(prompt, null, {
        model: 'llama-3.1-8b-instant',
        temperature: 0.1,
        max_tokens: 50
      });
      const cleaned = result.trim().toLowerCase().replace(/[^a-z_]/g, '');
      return categories.includes(cleaned) ? cleaned : 'outros';
    } catch (error) {
      console.warn('[AI] Groq falhou, tentando Cohere:', error.message);
      return await this._callCohere(prompt);
    }
  },

  // ----------------------------------------
  // ANÁLISE PROCESSUAL
  // Primário: NVIDIA Nemotron (longo contexto)
  // Backup: DeepSeek R1
  // ----------------------------------------
  async analyzeProcess(processData, analysisType = 'resumo') {
    const systemPrompt = `Você é assistente jurídico brasileiro.
Forneça análises objetivas com fundamentação legal.`;

    const prompt = `Analise tipo "${analysisType}":\n${JSON.stringify(processData)}`;

    try {
      return await this._callNVIDIA(prompt, systemPrompt);
    } catch (error) {
      console.warn('[AI] NVIDIA falhou, tentando DeepSeek:', error.message);
      return await this._callOpenRouter(prompt, systemPrompt, {
        model: 'deepseek/deepseek-r1'
      });
    }
  },

  // ============================================
  // HELPERS INTERNOS — Chamadas a APIs
  // ============================================

  async _callGroq(prompt, systemPrompt, options = {}) {
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(`${PROVIDERS.GROQ.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PROVIDERS.GROQ.apiKey}`
      },
      body: JSON.stringify({
        model: options.model || PROVIDERS.GROQ.defaultModel,
        messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.max_tokens ?? 4096
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Groq ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    return data.choices[0].message.content;
  },

  async _callOpenRouter(prompt, systemPrompt, options = {}) {
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(`${PROVIDERS.OPENROUTER.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PROVIDERS.OPENROUTER.apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'RV-Adv Legal System'
      },
      body: JSON.stringify({
        model: options.model || PROVIDERS.OPENROUTER.defaultModel,
        messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.max_tokens ?? 4096
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`OpenRouter ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    return data.choices[0].message.content;
  },

  async _callGeminiVision(prompt, imageBase64, mimeType) {
    const apiKey = PROVIDERS.GEMINI.apiKey;
    const model = PROVIDERS.GEMINI.defaultModel;
    const url = `${PROVIDERS.GEMINI.baseUrl}/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: imageBase64 } }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Gemini ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  },

  async _callOpenRouterVision(prompt, imageBase64, mimeType) {
    const messages = [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
      ]
    }];

    const response = await fetch(`${PROVIDERS.OPENROUTER.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PROVIDERS.OPENROUTER.apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'RV-Adv Legal System'
      },
      body: JSON.stringify({
        model: 'qwen/qwen2.5-vl-72b-instruct',
        messages,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`OpenRouter Vision ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    return data.choices[0].message.content;
  },

  async _callNVIDIA(prompt, systemPrompt) {
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(`${PROVIDERS.NVIDIA.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PROVIDERS.NVIDIA.apiKey}`
      },
      body: JSON.stringify({
        model: PROVIDERS.NVIDIA.defaultModel,
        messages,
        temperature: 0.3,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`NVIDIA ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    return data.choices[0].message.content;
  },

  async _callCohere(prompt) {
    const response = await fetch(`${PROVIDERS.COHERE.baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PROVIDERS.COHERE.apiKey}`
      },
      body: JSON.stringify({
        model: PROVIDERS.COHERE.defaultModel,
        prompt,
        max_tokens: 50,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Cohere ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    return data.generations[0].text.trim().toLowerCase();
  }
};

export default aiService;
