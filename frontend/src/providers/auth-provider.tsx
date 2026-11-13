import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AuthSession } from '@/types/api';
import { setAccessToken } from '@/lib/api/client';
import { demoSession, exchangeSession } from '@/lib/api/endpoints';
import { supabase } from '@/lib/supabase';

const STORAGE_KEY = 'bfdp.session';

type AuthStatus = 'loading' | 'anonymous' | 'authenticated';

interface AuthContextValue {
  session: AuthSession | null;
  user: AuthSession['user'] | null;
  status: AuthStatus;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithToken: (idToken: string) => Promise<void>;
  signInAsDemo: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed.accessToken || !parsed.expiresAt) return null;
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const bootstrapped = useRef(false);

  const applySession = useCallback((next: AuthSession | null) => {
    setSession(next);
    setAccessToken(next?.accessToken ?? null);
    if (next) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setStatus('authenticated');
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setStatus('anonymous');
    }
  }, []);

  const signInWithToken = useCallback(
    async (idToken: string) => {
      setError(null);
      const next = await exchangeSession(idToken);
      applySession(next);
    },
    [applySession],
  );

  const signInAsDemo = useCallback(async () => {
    setError(null);
    const next = await demoSession();
    applySession(next);
  }, [applySession]);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const bootstrap = async (): Promise<void> => {
      const stored = readStoredSession();
      if (stored) {
        applySession(stored);
        return;
      }

      // Check URL hash directly for OAuth callback access_token
      if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
        try {
          const hashParams = new URLSearchParams(window.location.hash.slice(1));
          const hashToken = hashParams.get('access_token');
          if (hashToken) {
            await signInWithToken(hashToken);
            window.history.replaceState(null, '', window.location.pathname);
            return;
          }
        } catch {
          // continue to getSession fallback
        }
      }

      // Returning from the Supabase OAuth redirect: exchange its access token
      // for the API session (the API accepts Supabase JWTs directly).
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) {
          try {
            await signInWithToken(data.session.access_token);
            return;
          } catch {
            await supabase.auth.signOut();
          }
        }
      }

      applySession(null);
    };

    void bootstrap().catch(() => {
      setError('Could not restore your session. Please sign in again.');
      applySession(null);
    });
  }, [applySession, signInWithToken]);

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, sbSession) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && sbSession?.access_token) {
        try {
          await signInWithToken(sbSession.access_token);
        } catch {
          // Handled in bootstrap
        }
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [signInWithToken]);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    if (!supabase) {
      setError(
        'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      );
      return;
    }
    const redirectUrl = `${window.location.origin}/`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl },
    });
    if (oauthError) {
      setError(oauthError.message);
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    if (supabase) {
      await supabase.auth.signOut().catch(() => undefined);
    }
    applySession(null);
  }, [applySession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      status,
      error,
      signInWithGoogle,
      signInWithToken,
      signInAsDemo,
      signOut,
    }),
    [session, status, error, signInWithGoogle, signInWithToken, signInAsDemo, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }
  return context;
}
