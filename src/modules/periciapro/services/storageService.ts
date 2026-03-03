import { supabase } from './supabaseClient';
import type { PericiaDocumento } from '../types';

/**
 * Storage service for document uploads — replaces base44.integrations.Core.UploadFile
 * After storing a document, dispatches to the RV-Adv OCR/classification pipeline.
 */
export const storageService = {
  /**
   * Upload a file to Supabase Storage and register it in pericia_documentos.
   * Triggers OCR/classification via Edge Function post-upload.
   */
  async uploadDocumento(
    periciaId: string,
    file: File,
    categoria?: string
  ): Promise<PericiaDocumento> {
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `pericias/${periciaId}/${timestamp}_${safeName}`;

    // 1. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('periciapro-documentos')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // 2. Get public URL
    const { data: urlData } = supabase.storage
      .from('periciapro-documentos')
      .getPublicUrl(uploadData.path);

    // 3. Register in database
    const { data: docRecord, error: dbError } = await supabase
      .from('pericia_documentos')
      .insert({
        pericia_id: periciaId,
        nome: file.name,
        url: urlData.publicUrl,
        tipo: file.type,
        categoria: categoria ?? 'Outros',
        data_upload: new Date().toISOString().split('T')[0],
        storage_path: uploadData.path,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // 4. Dispatch to RV-Adv OCR/classification pipeline (async, non-blocking)
    try {
      await supabase.functions.invoke('ocr-classify-document', {
        body: {
          storage_path: uploadData.path,
          pericia_id: periciaId,
          documento_id: docRecord.id,
          categoria,
        },
      });
    } catch (ocrError) {
      // Non-blocking: OCR failure should not prevent upload success
      console.warn('[GED-IA] OCR dispatch failed (non-blocking):', ocrError);
    }

    return docRecord;
  },

  /**
   * Delete a document from storage and database.
   */
  async deleteDocumento(documentoId: string, storagePath: string): Promise<void> {
    // BUG #15 fix: check storage remove error — if ignored, the DB record is deleted
    // while the file still exists in storage (orphan file, irrecoverable reference).
    const { error: storageError } = await supabase.storage
      .from('periciapro-documentos')
      .remove([storagePath]);
    if (storageError) throw storageError;

    // Remove from database
    const { error } = await supabase
      .from('pericia_documentos')
      .delete()
      .eq('id', documentoId);

    if (error) throw error;
  },
};
