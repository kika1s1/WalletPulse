import 'react-native-url-polyfill/auto';
import {createClient, type SupabaseClient} from '@supabase/supabase-js';
import Config from 'react-native-config';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const url = Config.SUPABASE_URL;
    const key = Config.SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error(
        'Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment. Check your .env file.',
      );
    }

    client = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

export function resetSupabaseClient(): void {
  client = null;
}
