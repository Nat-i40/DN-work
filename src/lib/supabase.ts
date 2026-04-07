import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qilcijfxtgssleccvmzy.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Ej1BMs9nzzv3eO356cPOpQ_XFjKFEYc'

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Supabase environment variables are not set. Using fallback values.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
