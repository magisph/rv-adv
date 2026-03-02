import { supabase } from './supabaseClient';
import type { Notification } from '../types';

/**
 * Service layer for Notification — replaces base44.entities.Notification.*
 * Now supports Supabase Realtime subscriptions.
 */
export const notificationServiceSupabase = {
  async listByUser(userId: string, limit = 100): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data ?? [];
  },

  async create(payload: Partial<Notification>): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async markAsRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) throw error;
  },

  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async filter(filters: Record<string, unknown>): Promise<Notification[]> {
    let query = supabase.from('notifications').select('*');
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value as string);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  /**
   * Subscribe to realtime notifications for a user.
   * Replaces the 5-minute polling.
   */
  subscribeToUserNotifications(
    userId: string,
    onInsert: (notification: Notification) => void
  ) {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onInsert(payload.new as Notification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * List notifications for the currently authenticated user.
   * Uses Supabase Auth to resolve user_id automatically.
   */
  async listForCurrentUser(limit = 100): Promise<Notification[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    return notificationServiceSupabase.listByUser(user.id, limit);
  },
};

// Alias for convenience — used by NotificationBell.jsx
export const notificationService = notificationServiceSupabase;

