import { supabase } from './supabaseClient';

/**
 * Calendar service — invokes Supabase Edge Functions for Google Calendar sync.
 * Replaces base44.functions.syncToGoogleCalendar / deleteFromGoogleCalendar
 */
export const calendarService = {
  /**
   * Sincroniza perícia com Google Calendar via Edge Function.
   */
  async syncToGoogleCalendar(periciaId: string): Promise<{ success: boolean; event_id?: string; event_url?: string; error?: string }> {
    const { data, error } = await supabase.functions.invoke('sync-google-calendar', {
      body: { pericia_id: periciaId },
    });

    if (error) {
      console.error('[Calendar] Sync failed:', error);
      return { success: false, error: error.message };
    }

    return data;
  },

  /**
   * Remove evento do Google Calendar via Edge Function.
   */
  async deleteFromGoogleCalendar(eventId: string): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase.functions.invoke('delete-google-calendar', {
      body: { event_id: eventId },
    });

    if (error) {
      console.error('[Calendar] Delete failed:', error);
      return { success: false, error: error.message };
    }

    return data;
  },
};
