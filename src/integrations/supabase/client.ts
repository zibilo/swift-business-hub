import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Utilisation des variables d'environnement injectées par Vite/Netlify
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error("Les variables d'environnement Supabase sont manquantes.");
}

export const supabase = createClient<Database>(
  SUPABASE_URL || "", 
  SUPABASE_PUBLISHABLE_KEY || "", 
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
