import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Env } from '../types';

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(env: Env): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }

  cachedClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}

