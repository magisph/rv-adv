import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || '';

    // Initialize Supabase Client bypassing RLS with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the incoming JSON payload
    const payload = await req.json();
    const { to, from, subject, text } = payload;

    if (!to) {
      return new Response(JSON.stringify({ error: 'Missing "to" address' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 1. Find the client ID where email_inss matches the "to" address
    const { data: clients, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('email_inss', to)
      .limit(1);

    if (clientError || !clients || clients.length === 0) {
      return new Response(JSON.stringify({ error: 'Client not found for this email' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const clientId = clients[0].id;

    // 2. Insert email log with "pendente" status
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

    if (insertError || !insertedEmail) {
      throw new Error(`Failed to insert email record: ${insertError?.message}`);
    }

    const emailId = insertedEmail.id;

    // 3. Process with Gemini AI to extract date/time and location
    if (text && geminiApiKey) {
      try {
        const prompt = `
          Você é um assistente especializado em ler comunicações do INSS.
          Leia o texto do e-mail abaixo e extraia a Data/Hora da perícia/exigência e o Local.
          
          Regras:
          1. Retorne APENAS um JSON válido.
          2. O formato do JSON deve ser EXATAMENTE: { "data_hora": "YYYY-MM-DDTHH:mm:ssZ", "local": "Endereço extraído" }
          3. Se não encontrar a data, use null para "data_hora". Se não encontrar o local, use null para "local".
          4. Não inclua blocos markdown (como \`\`\`json). Retorne apenas a string JSON.
          
          Texto do e-mail:
          """
          ${text}
          """
        `;

        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
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

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          let extractedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          
          // Clean up potential markdown formatting from Gemini response
          extractedText = extractedText.replace(/```json/g, '').replace(/```/g, '').trim();
          
          try {
            const parsedData = JSON.parse(extractedText);
            
            // 4. Update record with extracted data and mark as "processado"
            await supabase
              .from('client_inss_emails')
              .update({
                extracted_date: parsedData.data_hora,
                extracted_location: parsedData.local,
                status: 'processado'
              })
              .eq('id', emailId);
              
          } catch (parseError) {
            console.error("Failed to parse Gemini JSON:", extractedText);
            // Updating status to mark a failure in extraction logic
            await supabase
              .from('client_inss_emails')
              .update({ status: 'falha_extracao' })
              .eq('id', emailId);
          }
        } else {
             await supabase
              .from('client_inss_emails')
              .update({ status: 'falha_extracao' })
              .eq('id', emailId);
        }
      } catch (geminiError) {
        console.error("Error communicating with Gemini:", geminiError);
         await supabase
          .from('client_inss_emails')
          .update({ status: 'falha_extracao' })
          .eq('id', emailId);
      }
    }

    return new Response(JSON.stringify({ success: true, message: 'Email processed successfully' }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
