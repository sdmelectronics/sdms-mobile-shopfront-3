import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Constants
const ADMIN_ROUTE_PREFIX = '/Admin' as const;
const AUTH_CHECK_TIMEOUT = 10000; // 10 seconds
const ADMIN_SESSION_KEY = 'admin_session_data';
const ADMIN_AUTO_LOGIN_KEY = 'admin_auto_login';

interface AdminUser {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface AuthError {
  code: string;
  message: string;
}

interface SignInResult {
  success: boolean;
  error?: AuthError;
}

interface AdminSessionData {
  user: AdminUser;
  lastActivity: number;
  autoLogin: boolean;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  loading: boolean;
  signingIn: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
  isAutoLoginEnabled: boolean;
  clearPersistentSession: () => void;
  error: string | null;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

/**
 * Admin Authentication Provider with Persistent Session Management
 * Manages admin user authentication state and provides auth methods with persistent login
 */
export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [isAutoLoginEnabled, setIsAutoLoginEnabled] = useState(false);
  const { toast } = useToast();

  /**
   * Validates email format
   */
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Saves admin session data to localStorage for persistence
   */
  const saveAdminSession = useCallback((adminData: AdminUser, autoLogin: boolean = false) => {
    try {
      const sessionData: AdminSessionData = {
        user: adminData,
        lastActivity: Date.now(),
        autoLogin
      };
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(sessionData));
      if (autoLogin) {
        localStorage.setItem(ADMIN_AUTO_LOGIN_KEY, 'true');
      }
      setIsAutoLoginEnabled(autoLogin);
    } catch (error) {
      console.error('Failed to save admin session:', error);
    }
  }, []);

  /**
   * Retrieves admin session data from localStorage
   */
  const getStoredAdminSession = useCallback((): AdminSessionData | null => {
    try {
      const storedData = localStorage.getItem(ADMIN_SESSION_KEY);
      if (!storedData) return null;

      const sessionData: AdminSessionData = JSON.parse(storedData);
      
      // Check if session is still valid (24 hours)
      const twentyFourHours = 24 * 60 * 60 * 1000;
      if (Date.now() - sessionData.lastActivity > twentyFourHours) {
        clearPersistentSession();
        return null;
      }

      return sessionData;
    } catch (error) {
      console.error('Failed to retrieve admin session:', error);
      clearPersistentSession();
      return null;
    }
  }, []);

  /**
   * Clears persistent session data
   */
  const clearPersistentSession = useCallback(() => {
    try {
      localStorage.removeItem(ADMIN_SESSION_KEY);
      localStorage.removeItem(ADMIN_AUTO_LOGIN_KEY);
      setIsAutoLoginEnabled(false);
    } catch (error) {
      console.error('Failed to clear persistent session:', error);
    }
  }, []);

  /**
   * Updates last activity timestamp for session management
   */
  const updateLastActivity = useCallback(() => {
    try {
      const storedData = localStorage.getItem(ADMIN_SESSION_KEY);
      if (storedData) {
        const sessionData: AdminSessionData = JSON.parse(storedData);
        sessionData.lastActivity = Date.now();
        localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(sessionData));
      }
    } catch (error) {
      console.error('Failed to update last activity:', error);
    }
  }, []);

  /**
   * Fetches admin user data from database
   */
  const fetchAdminData = useCallback(async (userId: string): Promise<AdminUser | null> => {
    try {
      const { data: adminData, error } = await supabase
        .from('admin_users')
        .select('id, email, role, is_active, created_at')
        .eq('id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Failed to fetch admin data:', error);
        return null;
      }

      return adminData;
    } catch (error) {
      console.error('Exception fetching admin data:', error);
      return null;
    }
  }, []);

  /**
   * Refreshes current admin data and updates stored session
   */
  const refreshAdmin = useCallback(async (): Promise<void> => {
    if (!admin?.id) return;

    const updatedAdmin = await fetchAdminData(admin.id);
    if (updatedAdmin) {
      setAdmin(updatedAdmin);
      // Update stored session with fresh data
      const sessionData = getStoredAdminSession();
      if (sessionData) {
        saveAdminSession(updatedAdmin, sessionData.autoLogin);
      }
    } else {
      // Admin no longer exists or is inactive
      await signOut();
    }
  }, [admin?.id, fetchAdminData, getStoredAdminSession, saveAdminSession]);

  /**
   * Attempts to restore session from stored data
   */
  const attemptSessionRestore = useCallback(async (): Promise<boolean> => {
    const sessionData = getStoredAdminSession();
    if (!sessionData) return false;

    try {
      // Verify the session is still valid with Supabase
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session?.user) {
        // Supabase session is invalid, but we have stored data
        // Try to restore if auto-login is enabled
        if (sessionData.autoLogin) {
          setAdmin(sessionData.user);
          updateLastActivity();
          return true;
        }
        clearPersistentSession();
        return false;
      }

      // Verify the stored user data is still valid
      const freshAdminData = await fetchAdminData(session.user.id);
      if (freshAdminData) {
        setAdmin(freshAdminData);
        saveAdminSession(freshAdminData, sessionData.autoLogin);
        updateLastActivity();
        return true;
      } else {
        clearPersistentSession();
        return false;
      }
    } catch (error) {
      console.error('Session restore failed:', error);
      clearPersistentSession();
      return false;
    }
  }, []);

  /**
   * Checks current authentication status
   */
  const checkAuthStatus = useCallback(async (): Promise<void> => {
    console.log('checkAuthStatus called');
    try {
      // First, try to restore from stored session
      const sessionRestored = await attemptSessionRestore();
      if (sessionRestored) {
        setLoading(false);
        return;
      }

      // If no stored session, check Supabase session
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth check timeout')), AUTH_CHECK_TIMEOUT)
      );

      const authPromise = supabase.auth.getSession();
      
      const { data: { session }, error } = await Promise.race([
        authPromise,
        timeoutPromise
      ]) as any;

      if (error) {
        console.error('Session check error:', error);
        return;
      }

      if (session?.user) {
        const adminData = await fetchAdminData(session.user.id);
        if (adminData) {
          setAdmin(adminData);
          // Save session without auto-login by default
          saveAdminSession(adminData, false);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Handles authentication state changes
   */
  /**
   * Handles Supabase auth events.
   *
   * MUST stay synchronous and MUST NOT await any Supabase call. Auth events
   * are emitted while supabase-js holds its auth lock, and every PostgREST
   * request needs that same lock to read the access token — so awaiting a
   * query in here deadlocks the whole client until the page is reloaded.
   * Defer the async work to a fresh task instead.
   *
   * Regression check: `npm run check:auth-deadlock`.
   */
  const handleAuthStateChange = useCallback((event: string, session: any) => {
    if (event === 'SIGNED_OUT') {
      setAdmin(null);
      clearPersistentSession();
      return;
    }

    if (event === 'SIGNED_IN') {
      if (!session?.user) return;
      setTimeout(async () => {
        const adminData = await fetchAdminData(session.user.id);
        if (adminData) {
          setAdmin(adminData);
          // Preserve auto-login setting from stored session or default to false
          const storedSession = getStoredAdminSession();
          const autoLogin = storedSession?.autoLogin || false;
          saveAdminSession(adminData, autoLogin);
        } else {
          // User signed in but is not an admin
          await supabase.auth.signOut();
        }
      }, 0);
      return;
    }

    if (event === 'TOKEN_REFRESHED') {
      updateLastActivity();
      if (session?.user && admin) {
        setTimeout(() => { void refreshAdmin(); }, 0);
      }
    }
  }, []);

  // Initialize auth state and listener
  useEffect(() => {
    checkAuthStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    return () => subscription.unsubscribe();
  }, []);

  // Set up activity tracking for session management
  useEffect(() => {
    if (!admin) return;

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    let activityTimeout: NodeJS.Timeout;

    const handleActivity = () => {
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(() => {
        updateLastActivity();
      }, 60000); // Update every minute of activity
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      clearTimeout(activityTimeout);
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [admin]);

  /**
   * Signs in an admin user with optional persistent login
   */
  const signIn = useCallback(async (email: string, password: string, rememberMe: boolean = false): Promise<SignInResult> => {
    // Input validation
    if (!email || !password) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Email and password are required'
        }
      };
    }

    if (!isValidEmail(email)) {
      return {
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Please enter a valid email address'
        }
      };
    }

    if (password.length < 6) {
      return {
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Password must be at least 6 characters long'
        }
      };
    }

    setSigningIn(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        let errorMessage = 'Sign in failed';
        let errorCode = 'SIGNIN_ERROR';

        switch (error.message) {
          case 'Invalid login credentials':
            errorMessage = 'Invalid email or password';
            errorCode = 'INVALID_CREDENTIALS';
            break;
          case 'Email not confirmed':
            errorMessage = 'Please confirm your email address';
            errorCode = 'EMAIL_NOT_CONFIRMED';
            break;
          case 'Too many requests':
            errorMessage = 'Too many attempts. Please try again later';
            errorCode = 'RATE_LIMITED';
            break;
          default:
            errorMessage = error.message;
        }

        return {
          success: false,
          error: {
            code: errorCode,
            message: errorMessage
          }
        };
      }

      if (data.user) {
        const adminData = await fetchAdminData(data.user.id);
        
        if (!adminData) {
          await supabase.auth.signOut();
          return {
            success: false,
            error: {
              code: 'ACCESS_DENIED',
              message: 'Access denied. Admin account required.'
            }
          };
        }

        setAdmin(adminData);
        saveAdminSession(adminData, rememberMe);
        
        toast({
          title: "Welcome back!",
          description: `Signed in as ${adminData.email}${rememberMe ? ' (Stay signed in enabled)' : ''}`,
        });

        return { success: true };
      }

      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred'
        }
      };

    } catch (error: any) {
      console.error('Sign in exception:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error. Please check your connection.'
        }
      };
    } finally {
      setSigningIn(false);
    }
  }, [fetchAdminData, toast, saveAdminSession]);

  /**
   * Signs out the current admin user
   */
  const signOut = useCallback(async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      setAdmin(null);
      clearPersistentSession();
      
      toast({
        title: "Signed out",
        description: "You have been signed out successfully",
      });
    } catch (error) {
      console.error('Sign out error:', error);
      // Still clear local state even if API call fails
      setAdmin(null);
      clearPersistentSession();
    }
  }, [toast, clearPersistentSession]);

  const value: AdminAuthContextType = {
    admin,
    loading,
    signingIn,
    signIn,
    signOut,
    refreshAdmin,
    isAutoLoginEnabled,
    clearPersistentSession,
    error: null // Placeholder for future error handling
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

/**
 * Hook to use admin authentication context
 * @throws {Error} If used outside of AdminAuthProvider
 */
export const useAdminAuth = (): AdminAuthContextType => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

/**
 * Type guard to check if user is admin
 */
export const isAdminUser = (user: any): user is AdminUser => {
  return (
    user &&
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    typeof user.role === 'string' &&
    typeof user.is_active === 'boolean' &&
    user.is_active === true
  );
};

/**
 * Admin route guard hook
 * Returns whether the current user can access admin routes
 */
export const useAdminRouteGuard = () => {
  const { admin, loading } = useAdminAuth();
  
  return {
    canAccess: !loading && isAdminUser(admin),
    isLoading: loading,
    admin
  };
};