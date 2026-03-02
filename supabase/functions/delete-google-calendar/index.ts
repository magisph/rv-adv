// Supabase Edge Function: delete-google-calendar
// Replaces: functions/deleteFromGoogleCalendar.ts (Base44)
// Deploy: supabase functions deploy delete-google-calendar

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { event_id } = await req.json();

    if (!event_id) {
      return new Response(
        JSON.stringify({ success: false, error: "event_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = Deno.env.get("GOOGLE_CALENDAR_ACCESS_TOKEN");

    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: "Google Calendar not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event_id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (res.ok || res.status === 404) {
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const errorData = await res.json();
    return new Response(
      JSON.stringify({ success: false, error: errorData.error?.message || "Unknown error" }),
      { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
