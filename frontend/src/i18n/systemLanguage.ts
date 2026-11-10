import { useEffect, useSyncExternalStore } from 'react';
import { getLocales, useLocales } from 'expo-localization';
import { appLanguage, chooseLanguage, setAppLanguage, subscribeAppLanguage, type Language } from './language';

// ── The system's language, into the app ───────────────────────────────────────
//
// The only file that reads the system's language (expo-localization), kept
// apart from i18n/language.ts so that one stays free of React and Expo.
//
// iOS and Android both let the user pick a language per app in the system
// settings (app.json declares English and Czech to them); the preferred list
// read here already has that choice first. iOS restarts the app on a change;
// Android and the web tell the running app, and useAppLanguage follows.

const systemTags = (): string[] => getLocales().map((locale) => locale.languageTag);

/** Sets the app language from the system's. Call once, before the first render. */
export function applySystemLanguage(): void {
  setAppLanguage(chooseLanguage(systemTags()));
}

/**
 * The language the app shows, following a system change while it runs. App.tsx
 * keys its content by it, so a change remounts every screen in the new language.
 */
export function useAppLanguage(): Language {
  const locales = useLocales();
  const system = chooseLanguage(locales.map((locale) => locale.languageTag));
  useEffect(() => {
    setAppLanguage(system);
  }, [system]);
  return useSyncExternalStore(subscribeAppLanguage, appLanguage);
}
