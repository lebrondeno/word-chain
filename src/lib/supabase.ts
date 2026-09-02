import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getSupabaseConfig(): { url: string; anonKey: string } {
  return {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey && url.startsWith('http'));
}

let clientInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  const { url, anonKey } = getSupabaseConfig();

  if (!url || !anonKey) {
    // Provide a dummy or placeholder client so app doesn't crash before credentials are input
    if (!clientInstance) {
      clientInstance = createClient(
        'https://placeholder-word-chain.supabase.co',
        'placeholder-anon-key',
        {
          auth: { persistSession: false },
          realtime: { params: { eventsPerSecond: 10 } },
        }
      );
    }
    return clientInstance;
  }

  if (!clientInstance || clientInstance['supabaseUrl'] !== url) {
    clientInstance = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 20,
        },
      },
    });
  }

  return clientInstance;
}
