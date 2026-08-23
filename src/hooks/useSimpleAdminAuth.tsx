import { useState, useEffect, useRef, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SESSION_KEY = 'simple_admin_session';

// Hard ceiling on how long the app may sit on the auth spinner. If Supabase
// never answers (dead network, captive portal, blocked host) we still have to
// let the UI render — showing the login form is recoverable, an eternal
// spinner is not.
const AUTH_INIT_TIMEOUT_MS = 8000;

interface SimpleAdminUser {
  username: string;
  isAuthenticated: boolean;
}

interface SimpleAdminAuthContextType {
  admin: SimpleAdminUser | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<SignInOutcome>;
  signOut: () => void;
}

/**
 * Sign-in can fail for three very different reasons and the UI must be able to
 * tell them apart — reporting "wrong password" when the password was correct
 * sends whoever is debugging it down the wrong path entirely.
 */
export type SignInFailureReason = 'invalid-credentials' | 'not-an-admin' | 'network';

// Deliberately a single shape rather than a discriminated union: this project
// compiles with `strict: false`, and TypeScript won't narrow a boolean
// discriminant without strictNullChecks.
export interface SignInOutcome {
  ok: boolean;
  reason?: SignInFailureReason;
}

/**
 * Result of looking a signed-in user up in `admin_users`.
 *
 * `error` is deliberately distinct from `not-admin`: a flaky mobile connection
 * must not be treated as "you are not an admin" and silently sign the user out.
 */
type AdminLookup =
  | { status: 'admin'; user: SimpleAdminUser }
  | { status: 'not-admin' }
  | { status: 'error' };

const SimpleAdminAuthContext = createContext<SimpleAdminAuthContextType | undefined>(undefined);

/**
 * Clears the legacy `simple_admin_session` copy of the admin row.
 *
 * Earlier versions kept admin identity in localStorage *alongside* the
 * Supabase session and trusted it when the session was gone — which let an
 * admin into the panel with no token, where every query then failed RLS. The
 * Supabase session is now the single source of truth; this only evicts stale
 * entries left on devices by the old build.
 */
const clearLegacyCache = () => {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable (private mode / blocked cookies) — non-fatal */
  }
};

/**
 * Looks the authenticated user up in `admin_users`.
 *
 * Safe to call from anywhere EXCEPT inside an `onAuthStateChange` callback —
 * see the comment on the subscription below.
 */
const lookupAdmin = async (userId: string): Promise<AdminLookup> => {
  const { data, error } = await supabase
    .from('admin_users')
    .select('id, email, role, is_active')
    .eq('id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('admin_users lookup failed:', error);
    return { status: 'error' };
  }

  if (!data) return { status: 'not-admin' };

  return { status: 'admin', user: { username: data.email, isAuthenticated: true } };
};

export const SimpleAdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [admin, setAdmin] = useState<SimpleAdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  /**
   * Reconciles React state with a Supabase session. Never call this from
   * inside an onAuthStateChange callback without deferring it first.
   */
  const syncFromSession = useCallback(async (session: { user?: { id: string } } | null) => {
    if (!session?.user) {
      if (mountedRef.current) setAdmin(null);
      clearLegacyCache();
      return;
    }

    const result = await lookupAdmin(session.user.id);

    if (!mountedRef.current) return;

    switch (result.status) {
      case 'admin':
        setAdmin(result.user);
        break;

      case 'not-admin':
        // Authenticated, but has no admin_users row. Don't leave them holding
        // a session that grants nothing.
        setAdmin(null);
        clearLegacyCache();
        await supabase.auth.signOut();
        break;

      case 'error':
        // Transient failure. Leave any existing session alone rather than
        // logging a working admin out over one dropped request on mobile.
        break;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      if (mountedRef.current) setLoading(false);
    };

    const failsafe = setTimeout(settle, AUTH_INIT_TIMEOUT_MS);

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await syncFromSession(session);
      } catch (error) {
        console.error('Auth initialisation failed:', error);
      } finally {
        clearTimeout(failsafe);
        settle();
      }
    })();

    // ---------------------------------------------------------------------
    // This callback MUST stay synchronous and MUST NOT call supabase.
    //
    // supabase-js emits auth events from inside its own auth lock, and every
    // PostgREST request first calls auth.getSession() to fetch a token — which
    // needs that same lock. Awaiting a query in here is a circular wait that
    // deadlocks the entire client for the life of the tab: no products, no
    // categories, no login, until a full page reload.
    //
    // It only triggers when a stored token is expired at boot (or on the
    // hourly auto-refresh tick), which is why it looked like it only affected
    // "some" devices. Defer any Supabase work to a fresh task instead.
    //
    // Regression check: `npm run check:auth-deadlock`.
    // ---------------------------------------------------------------------
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setAdmin(null);
        clearLegacyCache();
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setTimeout(() => { void syncFromSession(session); }, 0);
      }
    });

    return () => {
      mountedRef.current = false;
      clearTimeout(failsafe);
      subscription.unsubscribe();
    };
  }, [syncFromSession]);

  const signIn = useCallback(async (username: string, password: string): Promise<SignInOutcome> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: username.toLowerCase().trim(),
        password,
      });

      if (error) {
        console.error('Supabase auth error:', error);
        return { ok: false, reason: 'invalid-credentials' };
      }

      if (!data.user) return { ok: false, reason: 'invalid-credentials' };

      // Credentials were accepted. Anything that fails past this point is an
      // authorisation or connectivity problem, NOT a bad password.
      const result = await lookupAdmin(data.user.id);

      if (result.status === 'admin') {
        setAdmin(result.user);
        return { ok: true };
      }

      await supabase.auth.signOut();
      return { ok: false, reason: result.status === 'not-admin' ? 'not-an-admin' : 'network' };
    } catch (error) {
      console.error('Authentication error:', error);
      return { ok: false, reason: 'network' };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
    setAdmin(null);
    clearLegacyCache();
  }, []);

  return (
    <SimpleAdminAuthContext.Provider value={{ admin, loading, signIn, signOut }}>
      {children}
    </SimpleAdminAuthContext.Provider>
  );
};

export const useSimpleAdminAuth = () => {
  const context = useContext(SimpleAdminAuthContext);
  if (context === undefined) {
    throw new Error('useSimpleAdminAuth must be used within a SimpleAdminAuthProvider');
  }
  return context;
};
