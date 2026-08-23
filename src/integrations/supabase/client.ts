// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from "./types.ts";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase environment variables. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.");
}

/**
 * Returns localStorage if it is actually usable, otherwise an in-memory stand-in.
 *
 * Merely *referencing* window.localStorage throws a SecurityError in browsers
 * where site data is blocked (iOS Safari with cookies disabled, some in-app
 * webviews, hardened privacy modes). At module scope that exception escapes
 * before React ever mounts and white-screens the whole app — so it has to be
 * probed defensively, not assumed. Falling back to memory costs the user a
 * session that doesn't survive reload; throwing costs them the entire site.
 */
const getSafeStorage = (): Storage => {
  try {
    const probe = '__sb_storage_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    console.warn('localStorage unavailable — falling back to in-memory auth storage.');
    const store = new Map<string, string>();
    return {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
      clear: () => { store.clear(); },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() { return store.size; },
    } as Storage;
  }
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: getSafeStorage(),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'sdms-mobile-shopfront',
    },
  },
});

// Add connection health check.
//
// IMPORTANT: a successful probe is cached permanently (isConnected), but a
// FAILED probe must NOT be cached — otherwise a single transient failure on
// first load would poison every subsequent call for the life of the tab and
// the only recovery would be a full page reload. We therefore reset
// `connectionPromise` to null once it settles so the next caller retries, and
// we bound the probe with a timeout so a hanging request can't leave callers
// awaiting forever.
let isConnected = false;
let connectionPromise: Promise<boolean> | null = null;

const CONNECTION_TIMEOUT_MS = 6000;

export const ensureConnection = async (): Promise<boolean> => {
  if (isConnected) return true;

  // De-dupe concurrent callers onto a single in-flight probe.
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    try {
      // Test connection with a simple, time-bounded query.
      const { error } = await supabase
        .from('products')
        .select('id')
        .limit(1)
        .abortSignal(AbortSignal.timeout(CONNECTION_TIMEOUT_MS));

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is fine
        console.warn('Supabase connection test failed:', error);
        return false;
      }

      isConnected = true;
      return true;
    } catch (error) {
      console.error('Supabase connection error:', error);
      return false;
    } finally {
      // Allow the next caller to retry after a failure (success stays cached
      // via `isConnected`, so this never re-runs the probe once connected).
      connectionPromise = null;
    }
  })();

  return connectionPromise;
};

supabase.auth.onAuthStateChange((event, session) => {
  if (import.meta.env.DEV) {
    console.log('[Supabase Auth Change]', event);
    if (session) {
      console.log('User session:', session);
    } else {
      console.log('User signed out or no session');
    }
  }
});
