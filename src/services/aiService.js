// ============================================
// RV-Adv AI Service - Secure Proxy Architecture
// All AI calls are routed through the 'ai-proxy' Edge Function.
// No API keys are exposed in the browser bundle.
// ============================================

import { supabase } from '@/lib/supabase';

// ============================================
// Upload Service (Supabase Storage — unchanged)
// ============================================

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
// Helper: invoke the ai-proxy Edge Function
// ============================================

async function callAIProxy(body) {
  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body
  });

  if (error) {
    throw new Error(`[AI Proxy] ${error.message || 'Erro ao chamar ai-proxy'}`);
  }

  if (!data?.success) {
    throw new Error(`[AI Proxy] ${data?.error || 'Resposta inesperada da Edge Function'}`);
  }

  return data.data;
}

// ============================================
// AI Service Principal
// ============================================

export const aiService = {

  // ----------------------------------------
  // UPLOAD DE ARQUIVO
  // Usa: Supabase Storage (local, sem proxy)
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
    return callAIProxy({
      action: 'generate',
      template,
      variables,
      document_type: documentType
    });
  },

  // ----------------------------------------
  // INVOCAÇÃO LLM GENÉRICA
  // Compatibilidade com chamadas antigas InvokeLLM
  // ----------------------------------------
  async invokeLLM({ prompt, response_json_schema, system_prompt, ...options }) {
    return callAIProxy({
      action: 'invoke_llm',
      prompt,
      system_prompt,
      response_json_schema,
      options
    });
  },

  // ----------------------------------------
  // OCR INTELIGENTE
  // Primário: Gemini 2.0 Flash (multimodal)
  // Backup: Qwen2.5 VL via OpenRouter
  // ----------------------------------------
  async extractTextFromImage(imageBase64, mimeType = 'image/jpeg') {
    return callAIProxy({
      action: 'ocr',
      image_base64: imageBase64,
      mime_type: mimeType
    });
  },

  // ----------------------------------------
  // CLASSIFICAÇÃO DE DOCUMENTOS
  // Primário: Groq + Llama 3.1 8B (ultra-rápido)
  // Backup: Cohere Command R+
  // ----------------------------------------
  async classifyDocument(text) {
    return callAIProxy({
      action: 'classify',
      text
    });
  },

  // ----------------------------------------
  // ANÁLISE PROCESSUAL
  // Primário: NVIDIA Nemotron (longo contexto)
  // Backup: DeepSeek R1
  // ----------------------------------------
  async analyzeProcess(processData, analysisType = 'resumo') {
    return callAIProxy({
      action: 'analyze',
      process_data: processData,
      analysis_type: analysisType
    });
  }
};

export default aiService;
