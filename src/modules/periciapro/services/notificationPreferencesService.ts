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
    // BUG #17 fix: replace check-then-act (race condition) with atomic Supabase upsert.
    // The old SELECT → INSERT/UPDATE pattern allowed two concurrent requests to both
    // see "no existing record" and both attempt INSERT, causing duplicate rows or constraint errors.
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({ ...payload, user_id: userId }, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
