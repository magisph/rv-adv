/**
 * NotificationService — Migrated from Base44 to Supabase.
 * 
 * With the migration to Supabase, notification generation is now handled
 * server-side via pg_cron (see 004_pg_cron_alerts.sql) and Supabase Realtime
 * subscriptions (see notificationServiceSupabase.ts).
 * 
 * This module is kept as a thin shim for backward compatibility with Layout.jsx
 * and any other callers that referenced NotificationService.checkAndGenerateNotifications().
 * In the new architecture, these functions are no-ops because the database handles it.
 */

import { notificationService } from "@/modules/periciapro/services/notificationServiceSupabase";

export class NotificationService {
  /**
   * Previously did client-side checking and generation of notifications.
   * Now handled by pg_cron on the server — this method is a no-op.
   */
  static async checkAndGenerateNotifications(userEmail) {
    // No-op: Notifications are now generated server-side by pg_cron.
    // The frontend receives them via Supabase Realtime in NotificationBell.
    console.debug("[NotificationService] Notification generation is now server-side via pg_cron.");
    return;
  }

  /**
   * Thin wrapper — delegates to notificationServiceSupabase.
   */
  static async getNotifications(userEmail) {
    return notificationService.listForCurrentUser();
  }

  /**
   * Mark a single notification as read.
   */
  static async markAsRead(notificationId) {
    return notificationService.markAsRead(notificationId);
  }

  /**
   * Delete a notification.
   */
  static async deleteNotification(notificationId) {
    return notificationService.delete(notificationId);
  }
}
