import { supabase } from './supabaseClient';
import type { NotificationPreferences } from '../types';

/**
 * Service layer for NotificationPreferences — replaces base44.entities.NotificationPreferences.*
 */
export const notificationPreferencesService = {
  async getByUser(userId: string): Promise<NotificationPreferences | null> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async upsert(userId: string, payload: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const { data: existing } = await supabase
      .from('notification_preferences')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('notification_preferences')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('notification_preferences')
        .insert({ ...payload, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },
};
