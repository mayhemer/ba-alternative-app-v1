import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  type SocialProvider,
  signIn,
  refreshTokens,
  tryRestoreSession,
  SESSION_EXPIRY_BUFFER_MS,
} from '../auth/authService';
import { clearTokens, type StoredTokens } from '../auth/tokenStorage';

// ── Types ─────────────────────────────────────────────────────────────────────

type AuthState = {
  userId: string | null;
  email: string | null;
  isLoggedIn: boolean;
  isRestoringSession: boolean; // true while loading stored tokens on mount
};

type AuthContextValue = AuthState & {
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
};

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    userId: null,
    email: null,
    isLoggedIn: false,
    isRestoringSession: true,
  });

  // Tokens are kept in a ref so getAccessToken and refresh logic can read/write
  // them without requiring re-renders or inclusion in dependency arrays.
  const tokensRef = useRef<StoredTokens | null>(null);

  // Restore session from secure storage on mount.
  useEffect(() => {
    tryRestoreSession().then((tokens) => {
      if (tokens !== null) {
        tokensRef.current = tokens;
        setAuthState({
          userId: tokens.userId,
          email: tokens.email,
          isLoggedIn: true,
          isRestoringSession: false,
        });
      } else {
        setAuthState((prev) => ({ ...prev, isRestoringSession: false }));
      }
    });
  }, []);

  const applyTokens = useCallback((tokens: StoredTokens): void => {
    tokensRef.current = tokens;
    setAuthState({
      userId: tokens.userId,
      email: tokens.email,
      isLoggedIn: true,
      isRestoringSession: false,
    });
  }, []);

  const signInWithProvider = useCallback(
    async (provider: SocialProvider): Promise<void> => {
      const tokens = await signIn(provider);
      applyTokens(tokens);
    },
    [applyTokens],
  );

  const signInWithGoogle = useCallback(
    () => signInWithProvider('Google'),
    [signInWithProvider],
  );

  const signInWithApple = useCallback(
    () => signInWithProvider('SignInWithApple'),
    [signInWithProvider],
  );

  const signOut = useCallback(async (): Promise<void> => {
    tokensRef.current = null;
    await clearTokens();
    setAuthState({ userId: null, email: null, isLoggedIn: false, isRestoringSession: false });
  }, []);

  // Returns a valid access token, refreshing silently if the current one is
  // close to expiry. Signs out if the refresh token itself has expired.
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const tokens = tokensRef.current;
    if (tokens === null) { return null; }
    if (tokens.expiresAt - Date.now() > SESSION_EXPIRY_BUFFER_MS) {
      return tokens.accessToken;
    }
    const refreshed = await refreshTokens(tokens.refreshToken);
    if (refreshed !== null) {
      tokensRef.current = refreshed;
      return refreshed.accessToken;
    }
    // Refresh token expired — clear session (keep local interests per product decision)
    tokensRef.current = null;
    await clearTokens();
    setAuthState({ userId: null, email: null, isLoggedIn: false, isRestoringSession: false });
    return null;
  }, []);

  const value = useMemo(
    () => ({ ...authState, signInWithGoogle, signInWithApple, signOut, getAccessToken }),
    [authState, signInWithGoogle, signInWithApple, signOut, getAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === null) { throw new Error('useAuth must be used inside AuthProvider'); }
  return ctx;
}
