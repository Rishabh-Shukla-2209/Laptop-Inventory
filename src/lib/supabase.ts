import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

/**
 * Lazily initialized Supabase client using service role key.
 * This avoids throwing at module evaluation time during build.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    if (!_supabase) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!url || !key) {
        throw new Error(
          'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
        );
      }

      _supabase = createClient(url, key, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }

    const value = Reflect.get(_supabase, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(_supabase);
    }
    return value;
  },
});
