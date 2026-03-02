import { supabase } from './supabaseClient';
import type { Lembrete } from '../types';

/**
 * Service layer for Lembrete — replaces base44.entities.Lembrete.*
 */
export const lembreteService = {
  async listByPericia(periciaId: string): Promise<Lembrete[]> {
    const { data, error } = await supabase
      .from('lembretes')
      .select('*')
      .eq('pericia_id', periciaId)
      .order('data_lembrete', { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

  async create(payload: Partial<Lembrete>): Promise<Lembrete> {
    const { data, error } = await supabase
      .from('lembretes')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async filter(filters: Record<string, unknown>): Promise<Lembrete[]> {
    let query = supabase.from('lembretes').select('*');
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async update(id: string, payload: Partial<Lembrete>): Promise<Lembrete> {
    const { data, error } = await supabase
      .from('lembretes')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('lembretes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
