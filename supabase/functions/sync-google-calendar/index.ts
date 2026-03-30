// Supabase Edge Function: sync-google-calendar
// Replaces: functions/syncToGoogleCalendar.ts (Base44)
// Deploy: supabase functions deploy sync-google-calendar

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req.headers.get("origin")) });
  }

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  try {
    const { pericia_id } = await req.json();

    if (!pericia_id) {
      return new Response(
        JSON.stringify({ success: false, error: "pericia_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch the pericia
    const { data: pericia, error: fetchError } = await supabase
      .from("pericias")
      .select("*")
      .eq("id", pericia_id)
      .single();

    if (fetchError || !pericia) {
      return new Response(
        JSON.stringify({ success: false, error: "Pericia not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pericia.data_pericia) {
      return new Response(
        JSON.stringify({ success: false, error: "No pericia date set" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Google Calendar OAuth token from Supabase Vault
    // Note: Requires vault secret 'google_calendar_access_token' to be configured
    const accessToken = Deno.env.get("GOOGLE_CALENDAR_ACCESS_TOKEN");
    
    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: "Google Calendar not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build calendar event
    const startDateTime = pericia.horario_pericia
      ? `${pericia.data_pericia}T${pericia.horario_pericia}:00`
      : `${pericia.data_pericia}T09:00:00`;
    
    const endHour = pericia.horario_pericia
      ? String(parseInt(pericia.horario_pericia.split(":")[0]) + 1).padStart(2, "0") +
        ":" + pericia.horario_pericia.split(":")[1]
      : "10:00";
    const endDateTime = `${pericia.data_pericia}T${endHour}:00`;

    const event = {
      summary: `Perícia - ${pericia.nome}`,
      description: `Perícia agendada para ${pericia.nome} (CPF: ${pericia.cpf}).\nLocal: ${pericia.local_pericia || "Não informado"}\nObservações: ${pericia.observacoes || ""}`,
      location: pericia.local_pericia || "",
      start: { dateTime: startDateTime, timeZone: "America/Sao_Paulo" },
      end: { dateTime: endDateTime, timeZone: "America/Sao_Paulo" },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 1440 }, // 1 day before
          { method: "popup", minutes: 60 },   // 1 hour before
        ],
      },
    };

    let eventId = pericia.google_calendar_event_id;
    let eventUrl = "";

    if (eventId) {
      // Update existing event
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        }
      );
      const data = await res.json();
      eventUrl = data.htmlLink || "";
    } else {
      // Create new event
      const res = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        }
      );
      const data = await res.json();
      eventId = data.id;
      eventUrl = data.htmlLink || "";

      // Save event ID to pericia
      await supabase
        .from("pericias")
        .update({ google_calendar_event_id: eventId })
        .eq("id", pericia_id);
    }

    return new Response(
      JSON.stringify({ success: true, event_id: eventId, event_url: eventUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
