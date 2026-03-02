import { supabase } from './supabaseClient';
import type { ActivityLog } from '../types';

/**
 * Service layer for ActivityLog — replaces base44.entities.ActivityLog.*
 */
export const activityLogService = {
  async listByPericia(periciaId: string): Promise<ActivityLog[]> {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('pericia_id', periciaId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  async create(payload: Partial<ActivityLog>): Promise<ActivityLog> {
    const { data, error } = await supabase
      .from('activity_logs')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
