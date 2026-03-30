import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";
import { enforceRateLimit, getRateLimitHeaders } from "../_shared/rate-limit.ts";

/**
 * Verifica o hash HMAC-SHA256 de forma timing-safe via Web Crypto API nativa do Deno.
 */
async function verifyHMAC(payload: string, secret: string, hexSignature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  
  const sigBytes = new Uint8Array(hexSignature.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
  
  return crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(payload));
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  const stdRateLimitHeaders = getRateLimitHeaders(req, 5);
  
  const securityHeaders = {
    ...corsHeaders,
    ...stdRateLimitHeaders,
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 1. Rate Limiter Checks
  const rateLimitResponse = enforceRateLimit(req, origin, 5);
  if (rateLimitResponse) return rateLimitResponse;

  // Idempotency Check (Defense-in-depth)
  const idempotencyKey = req.headers.get("X-Idempotency-Key");
  if (idempotencyKey) {
    console.log(`[Webhook INSS] Processing Request com Idempotency-Key: ${idempotencyKey}`);
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers: securityHeaders 
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || '';
    const webhookSecret = Deno.env.get('INSS_WEBHOOK_SECRET') || '';

    // Initialize Supabase Client bypassing RLS with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the incoming Raw Webhook Payload
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("X-CF-Signature");

    if (!signatureHeader) {
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 401,
        headers: securityHeaders,
      });
    }

    // HMAC Validation
    const isValid = await verifyHMAC(rawBody, webhookSecret, signatureHeader);
    if (!isValid) {
      console.error(`[Webhook INSS] Assinatura inválida (Timing-Safe Check Failed). Recebida: ${signatureHeader}`);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: securityHeaders,
      });
    }

    const payload = JSON.parse(rawBody);
    const { to, from, subject, text } = payload;

    if (!to) {
      return new Response(JSON.stringify({ error: 'Missing "to" address' }), { 
        status: 400, 
        headers: securityHeaders 
      });
    }

    const cleanTo = to.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/)?.[0] || to;

    // 1. Find the client ID where email_inss matches the "cleanTo" address
    const { data: clients, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('email_inss', cleanTo)
      .limit(1);

    if (clientError) throw clientError;

    const clientId = clients?.[0]?.id || null;

    if (!clientId) {
      console.warn(`Cliente não encontrado para o e-mail: ${cleanTo}`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Email ignored: Client not found' 
      }), { 
        status: 200, 
        headers: securityHeaders 
      });
    }

    // 2. Insert email log with "pendente" status (if client exists)
    let emailId = null;
    if (clientId) {
      const { data: insertedEmail, error: insertError } = await supabase
        .from('client_inss_emails')
        .insert({
          client_id: clientId,
          sender_address: from,
          subject: subject,
          body_text: text,
          status: 'pendente'
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      if (insertedEmail) {
        emailId = insertedEmail.id;
      }
    }

    // 3. Process with Gemini AI to extract date/time and location
    let extractedData = null;
    let debugInfo: any = { hasApiKey: !!geminiApiKey, hasText: !!text };
    
    if (geminiApiKey) {
      try {
        const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`);
        debugInfo.availableModels = await modelsRes.json();
      } catch (e) {
        debugInfo.modelsFetchError = e.message;
      }
    }
    
    if (text && geminiApiKey) {
      try {
        const prompt = `
          Você é um assistente especializado em ler comunicações do INSS.
          Leia o texto do e-mail abaixo e extraia a Data/Hora da perícia/exigência, o Local, e o texto legível.
          Extraia também o texto principal e legível do e-mail, ignorando completamente cabeçalhos técnicos, códigos MIME, base64, DKIM e tags HTML.
          
          Regras:
          1. Retorne APENAS um JSON válido.
          2. O formato do JSON deve ser EXATAMENTE: { "data_hora": "YYYY-MM-DDTHH:mm:ssZ", "local": "Endereço extraído", "clean_text": "Texto limpo extraído" }
          3. Se não encontrar a data, use null para "data_hora". Se não encontrar o local, use null para "local". Use null para clean_text se falhar.
          4. Não inclua blocos markdown (como \`\`\`json). Retorne apenas a string JSON.
          
          Texto do e-mail:
          """
          ${text}
          """
        `;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        let geminiResponse;
        try {
          geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: prompt
                }]
              }],
              generationConfig: {
                temperature: 0.1,
              }
            })
          });
        } finally {
          clearTimeout(timeoutId);
        }

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          let extractedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          debugInfo.rawText = extractedText;
          
          // Clean up potential markdown formatting from Gemini response
          extractedText = extractedText.replace(/```json/g, '').replace(/```/g, '').trim();
          
          try {
            const parsedData = JSON.parse(extractedText);
            extractedData = parsedData;
            
            // 4. Update record with extracted data and mark as "processado"
            if (emailId) {
              const { error: updateError } = await supabase
                .from('client_inss_emails')
                .update({
                  extracted_date: parsedData.data_hora,
                  extracted_location: parsedData.local,
                  body_text: parsedData.clean_text,
                  status: 'processado'
                })
                .eq('id', emailId);
                
              if (updateError) throw updateError;
            }
              
          } catch (parseError) {
            console.error("Failed to parse Gemini JSON:", extractedText);
            debugInfo.parseError = parseError.message;
            // Updating status to mark a failure in extraction logic
            if (emailId) {
              const { error: updateError } = await supabase
                .from('client_inss_emails')
                .update({ status: 'falha_extracao' })
                .eq('id', emailId);
                
              if (updateError) throw updateError;
            }
          }
        } else {
            const errStr = await geminiResponse.text();
            console.error("Gemini failed", errStr);
            debugInfo.apiError = errStr;
            debugInfo.status = geminiResponse.status;
            if (emailId) {
             const { error: updateError } = await supabase
              .from('client_inss_emails')
              .update({ status: 'falha_extracao' })
              .eq('id', emailId);
              
             if (updateError) throw updateError;
            }
        }
      } catch (geminiError) {
        console.error("Error communicating with Gemini:", geminiError);
        debugInfo.networkError = geminiError.message;
        if (emailId) {
         const { error: updateError } = await supabase
          .from('client_inss_emails')
          .update({ status: 'falha_extracao' })
          .eq('id', emailId);
          
         if (updateError) throw updateError;
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Email processed successfully',
      debug: debugInfo,
      geminiData: extractedData 
    }), { 
      status: 200, 
      headers: securityHeaders 
    });

  } catch (error) {
    const isTimeout = error.name === 'AbortError';
    return new Response(JSON.stringify({ error: isTimeout ? 'Gemini API Timeout' : error.message }), { 
      status: 500, 
      headers: securityHeaders 
    });
  }
});
