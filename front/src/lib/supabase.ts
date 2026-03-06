/**
 * src/lib/supabase.ts
 *
 * Client Supabase singleton.
 * Variables d'environnement requises dans .env.local :
 *   VITE_SUPABASE_URL=https://xxxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=eyJ...
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    '[PRISM] Variables manquantes : VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY ' +
    'doivent être définies dans .env.local'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },  // PRISM n'utilise pas l'auth Supabase pour l'instant
})
