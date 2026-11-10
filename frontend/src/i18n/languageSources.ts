import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales, useLocales } from 'expo-localization';
import {
  LANGUAGE_CHOICES,
  appLanguage,
  languageChoice,
  setLanguageChoice,
  setSystemLanguageTags,
  subscribeAppLanguage,
  type Language,
  type LanguageChoice,
} from './language';

// ── Where the app language comes from ─────────────────────────────────────────
//
// The system's preferred languages (expo-localization) and the choice made in
// Settings (AsyncStorage), fed into i18n/language.ts. Kept apart from that file
// so it stays free of React and Expo.
//
// iOS and Android both let the user pick a language per app in the system
// settings (app.json declares English and Czech to them); the preferred list
// read here already has that choice first. iOS restarts the app on a change;
// Android and the web tell the running app, and useAppLanguage follows.

const STORAGE_KEY = 'app:language';

const systemTags = (): string[] => getLocales().map((locale) => locale.languageTag);

/** Sets the system's languages. Call once, before the first render. */
export function applySystemLanguage(): void {
  setSystemLanguageTags(systemTags());
}

/**
 * Restores the choice made in Settings in an earlier session. StartupGate
 * waits for it (store/uiStatePersistence), so the app opens in that language.
 * Never rejects: a missing, unknown or unreadable value leaves the system's.
 */
export async function loadLanguageChoice(): Promise<void> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
  const known = LANGUAGE_CHOICES.find((option) => option === stored);
  if (known !== undefined) {
    setLanguageChoice(known);
  }
}

/** The choice made in Settings: applied at once, and kept for the next launch. */
export function saveLanguageChoice(choice: LanguageChoice): void {
  setLanguageChoice(choice);
  void AsyncStorage.setItem(STORAGE_KEY, choice).catch(() => undefined);
}

/**
 * The language the app shows, following a system change while it runs and a
 * choice made in Settings. App.tsx keys its content by it, so a change remounts
 * every screen in the new language.
 */
export function useAppLanguage(): Language {
  const locales = useLocales();
  useEffect(() => {
    setSystemLanguageTags(locales.map((locale) => locale.languageTag));
  }, [locales]);
  return useSyncExternalStore(subscribeAppLanguage, appLanguage);
}

/** The choice made in Settings, for Settings to mark it. */
export function useLanguageChoice(): LanguageChoice {
  return useSyncExternalStore(subscribeAppLanguage, languageChoice);
}
