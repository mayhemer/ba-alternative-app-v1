// ── The language the app shows ────────────────────────────────────────────────
//
// Two languages: Czech when the system's language is Czech, English for any
// other (the fallback). The choice is made in one place, chooseLanguage; the
// rest of the app only reads appLanguage(), through strings() (i18n/strings.ts)
// and the API's localized entries (utils/localization.ts).
//
// Plain module state, no React or Expo, so lib/ and utils/ may read it and it
// loads in plain Node (the Playwright specs import utils/festivalTime). The
// system language is read and set by i18n/systemLanguage.ts, before the first
// render, and again when the system's language changes while the app runs; the
// app then remounts its content in the new language (App.tsx).
//
// Read it at call time, never into a module-level constant: a constant computed
// at import keeps the language of that moment.

export type Language = 'en' | 'cs';

export const FALLBACK_LANGUAGE: Language = 'en';

/**
 * The language to show, from the system's preferred languages (BCP-47 tags,
 * most preferred first). Only the first one counts: Czech further down the list
 * still gives English.
 *
 * An in-app language switch goes here: its stored choice, when set, wins over
 * the system's.
 */
export function chooseLanguage(systemLanguageTags: readonly string[]): Language {
  const first = systemLanguageTags[0];
  if (first === undefined) {
    return FALLBACK_LANGUAGE;
  }
  const code = first.split(/[-_]/)[0].toLowerCase();
  if (code === 'cs') { return 'cs'; }
  return FALLBACK_LANGUAGE;
}

let current: Language = FALLBACK_LANGUAGE;
const listeners = new Set<() => void>();

/** The language the app shows now. English until set. */
export function appLanguage(): Language {
  return current;
}

export function setAppLanguage(language: Language): void {
  if (language === current) {
    return;
  }
  current = language;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeAppLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
