// src/services/calendarService.js
// Serviço de integração com Google Calendar via Supabase Edge Functions
// Refatorado: remove proxy 'calendar-auth', usa supabase.functions.invoke

import { supabase } from '@/lib/supabase'

export const calendarService = {
  /**
   * Sincronizar perícia com Google Calendar.
   * Invoca a Edge Function 'sync-google-calendar'.
   */
  async syncToGoogleCalendar(periciaId) {
    try {
      const { data, error } = await supabase.functions.invoke('sync-google-calendar', {
        body: { pericia_id: periciaId },
      })

      if (error) {
        console.error('[Calendar] Sync failed:', error)
        throw new Error(error.message || 'Failed to sync with Google Calendar')
      }

      return data
    } catch (error) {
      console.error('[Calendar] Sync error:', error)
      throw error
    }
  },

  /**
   * Remover evento do Google Calendar.
   * Invoca a Edge Function 'delete-google-calendar'.
   */
  async deleteFromGoogleCalendar(eventId) {
    try {
      const { data, error } = await supabase.functions.invoke('delete-google-calendar', {
        body: { event_id: eventId },
      })

      if (error) {
        console.error('[Calendar] Delete failed:', error)
        throw new Error(error.message || 'Failed to delete calendar event')
      }

      return data
    } catch (error) {
      console.error('[Calendar] Delete error:', error)
      throw error
    }
  },

  /**
   * Criar evento no Google Calendar a partir de dados genéricos.
   * Cria um registro temporário na perícia e sincroniza.
   */
  async createEvent(eventData) {
    try {
      const { data, error } = await supabase.functions.invoke('sync-google-calendar', {
        body: eventData,
      })

      if (error) throw new Error(error.message || 'Failed to create calendar event')
      return data
    } catch (error) {
      console.error('[Calendar] Create event error:', error)
      throw error
    }
  },

  /**
   * Listar eventos — delegado ao Google Calendar via Edge Function.
   * Nota: requer que a Edge Function suporte listagem (futuro).
   */
  async listEvents(timeMin, timeMax) {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.provider_token) {
        throw new Error('Google Calendar not connected. Please authorize first.')
      }

      // Direct Google Calendar API call using provider token
      const params = new URLSearchParams({
        timeMin: timeMin || new Date().toISOString(),
        timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
      })

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${session.provider_token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch calendar events')
      }

      return await response.json()
    } catch (error) {
      console.error('[Calendar] List events error:', error)
      throw error
    }
  },

  /**
   * Verificar se o calendário está conectado.
   */
  async checkConnection() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return !!session?.provider_token
    } catch {
      return false
    }
  },
}

export default calendarService
