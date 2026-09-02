import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'word_chain_supabase_url';
const STORAGE_KEY_ANON = 'word_chain_supabase_anon_key';

export function getSupabaseConfig(): { url: string; anonKey: string } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) || '' : '';
  const localKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ANON) || '' : '';

  return {
    url: envUrl || localUrl,
    anonKey: envKey || localKey,
  };
}

export function saveSupabaseConfig(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    if (url) localStorage.setItem(STORAGE_KEY_URL, url.trim());
    if (anonKey) localStorage.setItem(STORAGE_KEY_ANON, anonKey.trim());
    // Reset client cache
    clientInstance = null;
  }
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
