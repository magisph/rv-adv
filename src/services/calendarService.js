// src/services/calendarService.js
// Serviço de integração com Google Calendar via Supabase Edge Function

import { supabase } from '@/lib/supabase'

// URL da Edge Function (configurada no Supabase Dashboard)
const CALENDAR_AUTH_URL = import.meta.env.VITE_SUPABASE_URL 
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-auth`
  : 'http://localhost:54321/functions/v1/calendar-auth'

export const calendarService = {
  /**
   * Obter URL de autorização do Google
   * Abre a página de login do Google para permitir acesso ao calendário
   */
  async getAuthorizationUrl() {
    try {
      const response = await fetch(`${CALENDAR_AUTH_URL}/authorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to get authorization URL')
      }
      
      const data = await response.json()
      return data.url
    } catch (error) {
      console.error('Error getting authorization URL:', error)
      throw error
    }
  },

  /**
   * Tratar o callback do OAuth
   * Após o usuário fazer login no Google, troca o código por tokens
   */
  async handleCallback(code) {
    try {
      const response = await fetch(
        `${CALENDAR_AUTH_URL}/callback?code=${code}`,
        {
          method: 'POST'
        }
      )
      
      if (!response.ok) {
        throw new Error('OAuth callback failed')
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error handling OAuth callback:', error)
      throw error
    }
  },

  /**
   * Listar eventos do calendário
   * Retorna todos os eventos em um período específico
   */
  async listEvents(timeMin, timeMax) {
    try {
      // Obter token de acesso do usuário logado via Supabase
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.provider_token) {
        throw new Error('Google calendar not connected. Please authorize first.')
      }

      const params = new URLSearchParams()
      if (timeMin) params.set('timeMin', timeMin)
      if (timeMax) params.set('timeMax', timeMax)

      const response = await fetch(
        `${CALENDAR_AUTH_URL}/events?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${session.provider_token}`
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch calendar events')
      }

      return await response.json()
    } catch (error) {
      console.error('Error listing events:', error)
      throw error
    }
  },

  /**
   * Criar novo evento no calendário
   * Adiciona um novo evento na agenda do Google Calendar
   */
  async createEvent(eventData) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.provider_token) {
        throw new Error('Google calendar not connected')
      }

      const response = await fetch(
        `${CALENDAR_AUTH_URL}/create-event`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.provider_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventData)
        }
      )

      if (!response.ok) {
        throw new Error('Failed to create calendar event')
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating event:', error)
      throw error
    }
  },

  /**
   * Verificar se o calendário está conectado
   * Tenta listar eventos para verificar se tem acesso
   */
  async checkConnection() {
    try {
      await this.listEvents()
      return true
    } catch {
      return false
    }
  }
}

export default calendarService
