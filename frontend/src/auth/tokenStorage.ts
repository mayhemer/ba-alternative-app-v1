import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type StoredTokens = {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number; // Unix ms
  userId: string;    // Cognito 'sub' claim
  email: string;     // Cognito 'email' claim
};

// SecureStore keys may contain only alphanumerics and ".", "-", "_" — no ":".
// (localStorage on web is unrestricted, but we keep one key for both platforms.)
const STORAGE_KEY = 'auth_tokens';

// On web, localStorage persists across page reloads.
// The refresh token means a stolen entry only lasts until the next token refresh
// (Cognito access tokens expire in 1 hour), which is an acceptable trade-off for a
// public festival app with no financial data. Use SecureStore on native (Keychain/Keystore).

export async function saveTokens(tokens: StoredTokens): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(tokens));
}

export async function loadTokens(): Promise<StoredTokens | null> {
  const stored =
    Platform.OS === 'web'
      ? localStorage.getItem(STORAGE_KEY)
      : await SecureStore.getItemAsync(STORAGE_KEY);
  if (stored === null) {
    return null;
  }
  try {
    return JSON.parse(stored) as StoredTokens;
  } catch {
    // Corrupt/legacy entry (iOS Keychain survives reinstalls). Clear it so we
    // don't fail on every launch, and treat the session as absent.
    await clearTokens();
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}
