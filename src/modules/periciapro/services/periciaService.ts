import { supabase } from './supabaseClient';
import type { Pericia, PericiaPagamento, PericiaDocumento } from '../types';

/**
 * Service layer for Pericia entity — replaces base44.entities.Pericia.*
 */
export const periciaService = {
  /**
   * Lista todas as perícias com ordenação opcional.
   * Substitui: base44.entities.Pericia.list("-updated_date")
   */
  async list(options?: { orderBy?: string; ascending?: boolean }): Promise<Pericia[]> {
    const orderBy = options?.orderBy ?? 'updated_at';
    const ascending = options?.ascending ?? false;

    const { data, error } = await supabase
      .from('pericias')
      .select('*')
      .order(orderBy, { ascending });

    if (error) throw error;
    return data ?? [];
  },

  /**
   * Busca perícia por ID.
   * Substitui: base44.entities.Pericia.filter({ id })
   */
  async getById(id: string): Promise<Pericia | null> {
    const { data, error } = await supabase
      .from('pericias')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Cria nova perícia.
   * Substitui: base44.entities.Pericia.create(data)
   */
  async create(payload: Partial<Pericia>): Promise<Pericia> {
    const { data, error } = await supabase
      .from('pericias')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Atualiza perícia existente.
   * Substitui: base44.entities.Pericia.update(id, data)
   */
  async update(id: string, payload: Partial<Pericia>): Promise<Pericia> {
    const { data, error } = await supabase
      .from('pericias')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Deleta perícia.
   * Substitui: base44.entities.Pericia.delete(id)
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('pericias')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // --- Pagamentos (normalizado) ---

  async getPagamentos(periciaId: string): Promise<PericiaPagamento[]> {
    const { data, error } = await supabase
      .from('pericia_pagamentos')
      .select('*')
      .eq('pericia_id', periciaId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

  async upsertPagamentos(periciaId: string, pagamentos: Partial<PericiaPagamento>[]): Promise<void> {
    // Delete existing and re-insert (atomic for form submissions)
    await supabase.from('pericia_pagamentos').delete().eq('pericia_id', periciaId);

    if (pagamentos.length > 0) {
      const rows = pagamentos.map((p) => ({ ...p, pericia_id: periciaId }));
      const { error } = await supabase.from('pericia_pagamentos').insert(rows);
      if (error) throw error;
    }
  },

  // --- Documentos ---

  async getDocumentos(periciaId: string): Promise<PericiaDocumento[]> {
    const { data, error } = await supabase
      .from('pericia_documentos')
      .select('*')
      .eq('pericia_id', periciaId)
      .order('data_upload', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },
};
