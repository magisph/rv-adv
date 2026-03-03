/**
 * Supabase client singleton — re-exports from src/lib/supabase.js
 * Ensures the entire application uses exactly one Supabase connection.
 *
 * Previously: created a duplicate createClient() here.
 * Now: single import point for the periciapro module.
 */
export { supabase } from '@/lib/supabase';
