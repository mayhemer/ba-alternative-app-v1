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

const STORAGE_KEY = 'auth:tokens';

// expo-secure-store is unavailable on web; tokens are held in memory only for web sessions.
function isSecureStoreAvailable(): boolean {
  return Platform.OS !== 'web';
}

export async function saveTokens(tokens: StoredTokens): Promise<void> {
  if (!isSecureStoreAvailable()) { return; }
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(tokens));
}

export async function loadTokens(): Promise<StoredTokens | null> {
  if (!isSecureStoreAvailable()) { return null; }
  const stored = await SecureStore.getItemAsync(STORAGE_KEY);
  return stored !== null ? (JSON.parse(stored) as StoredTokens) : null;
}

export async function clearTokens(): Promise<void> {
  if (!isSecureStoreAvailable()) { return; }
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}
