import { createClient } from '@supabase/supabase-js';

let _supabaseAdmin: ReturnType<typeof createClient> | null = null;
let _supabaseServer: ReturnType<typeof createClient> | null = null;

function getSupabaseAdminInternal() {
  if (!_supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase service role key - required for admin operations');
    }

    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return _supabaseAdmin;
}

function getSupabaseServerInternal() {
  if (!_supabaseServer) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    _supabaseServer = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabaseServer;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
  ? getSupabaseAdminInternal()
  : createClient('https://placeholder.supabase.co', 'placeholder-key');

export const supabaseServer = (supabaseUrl && supabaseAnonKey)
  ? getSupabaseServerInternal()
  : createClient('https://placeholder.supabase.co', 'placeholder-key');
