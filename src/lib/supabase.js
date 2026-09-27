import { createClient } from '@supabase/supabase-js';

// La clave "publishable" es pública por diseño: la seguridad real la imponen Supabase Auth + RLS.
export const SUPABASE_URL = 'https://ohzptabssphpclcadvrj.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_jiLclEt8YD7jwMCcN_dVLA_mklLAQKL';

export const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
