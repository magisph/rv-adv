import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_EMBEDDING_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "No GEMINI_API_KEY" }), { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: pending, error: fetchErr } = await supabase
    .from("jurisprudences")
    .select("id, excerpt")
    .eq("embedding_status", "pending")
    .limit(50); // Process in batches of 50

  if (fetchErr) {
    return new Response(JSON.stringify({ error: "Fetch error", details: fetchErr.message }), { status: 500 });
  }

  if (!pending || pending.length === 0) {
    return new Response(JSON.stringify({ message: "No pending embeddings found", count: 0 }), { status: 200 });
  }

  let processed = 0;
  let failed = 0;
  const errors = [];

  for (const row of pending) {
    try {
      const text = row.excerpt.trim();
      const geminiResponse = await fetch(`${GEMINI_EMBEDDING_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text: text.substring(0, 9500) }] },
          taskType: "RETRIEVAL_DOCUMENT",
        }),
      });

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        const errObj = `Error for ${row.id}: ${geminiResponse.status} - ${errorText}`;
        console.error(errObj);
        errors.push(errObj);
        failed++;
        await supabase.from("jurisprudences").update({ embedding_status: "failed" }).eq("id", row.id);
        
        if (geminiResponse.status === 429) {
            // Wait 60s if rate limited
            await new Promise(resolve => setTimeout(resolve, 60000));
        }
        continue;
      }

      const data = await geminiResponse.json();
      const embedding = data?.embedding?.values;

      if (!embedding || !Array.isArray(embedding)) {
        const errObj = `No embedding for ${row.id}: ${JSON.stringify(data)}`;
        console.error(errObj);
        errors.push(errObj);
        failed++;
        await supabase.from("jurisprudences").update({ embedding_status: "failed" }).eq("id", row.id);
        continue;
      }

      const { error: updateErr } = await supabase
        .from("jurisprudences")
        .update({
          embedding: embedding,
          embedding_status: "completed"
        })
        .eq("id", row.id);

      if (updateErr) {
        const errObj = `Update error for ${row.id}: ${updateErr.message}`;
        console.error(errObj);
        errors.push(errObj);
        failed++;
      } else {
        processed++;
      }
    } catch (err) {
      const errObj = `Catch error for ${row.id}: ${err.message}`;
      console.error(errObj);
      errors.push(errObj);
      failed++;
      await supabase.from("jurisprudences").update({ embedding_status: "failed" }).eq("id", row.id);
    }

    // Add 1.5s delay to stay under ~40 RPM (assuming 60 RPM limit)
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  return new Response(
    JSON.stringify({ message: "Batch complete", processed, failed, remaining: pending.length - processed - failed, errors }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
