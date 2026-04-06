import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qilcijfxtgssleccvmzy.supabase.co'
const supabaseAnonKey = 'sb_publishable_Ej1BMs9nzzv3eO356cPOpQ_XFjKFEYc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
