import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseColumnStyle = (import.meta.env.VITE_SUPABASE_COLUMN_STYLE || '').toLowerCase();

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const isSupabaseConfigured = Boolean(supabase);
export const configuredColumnStyle =
  supabaseColumnStyle === 'camel' || supabaseColumnStyle === 'legacy' || supabaseColumnStyle === 'snake'
    ? (supabaseColumnStyle as 'snake' | 'camel' | 'legacy')
    : null;
