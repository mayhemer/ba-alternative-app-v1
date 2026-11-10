// ── The language the app shows ────────────────────────────────────────────────
//
// Two languages, English and Czech. The user picks one in Settings, or leaves it
// to the system (the default): then Czech when the system's language is Czech,
// English for any other (the fallback). The rule is one function,
// chooseLanguage; the rest of the app only reads appLanguage(), through
// strings() (i18n/strings.ts) and the API's localized entries
// (utils/localization.ts).
//
// Plain module state, no React or Expo, so lib/ and utils/ may read it and it
// loads in plain Node (the Playwright specs import utils/festivalTime). Where
// the inputs come from — the system's languages and the stored choice — is
// i18n/languageSources.ts. When the language changes, the app remounts its
// content in the new one (App.tsx).
//
// Read it at call time, never into a module-level constant: a constant computed
// at import keeps the language of that moment.

export type Language = 'en' | 'cs';

/** What the user picked in Settings: a language, or whatever the system's is. */
export type LanguageChoice = 'system' | Language;

export const LANGUAGE_CHOICES: readonly LanguageChoice[] = ['system', 'en', 'cs'];

export const FALLBACK_LANGUAGE: Language = 'en';

/**
 * The language to show: the chosen one, or with the system's choice, from the
 * system's preferred languages (BCP-47 tags, most preferred first). Only the
 * first one counts: Czech further down the list still gives English.
 */
export function chooseLanguage(systemLanguageTags: readonly string[], choice: LanguageChoice = 'system'): Language {
  if (choice !== 'system') {
    return choice;
  }
  const first = systemLanguageTags[0];
  if (first === undefined) {
    return FALLBACK_LANGUAGE;
  }
  const code = first.split(/[-_]/)[0].toLowerCase();
  if (code === 'cs') { return 'cs'; }
  return FALLBACK_LANGUAGE;
}

let systemTags: readonly string[] = [];
let choice: LanguageChoice = 'system';
let current: Language = FALLBACK_LANGUAGE;
const listeners = new Set<() => void>();

function update(nextTags: readonly string[], nextChoice: LanguageChoice): void {
  const next = chooseLanguage(nextTags, nextChoice);
  const changed = next !== current || nextChoice !== choice;
  systemTags = nextTags;
  choice = nextChoice;
  current = next;
  if (!changed) {
    return;
  }
  for (const listener of listeners) {
    listener();
  }
}

/** The language the app shows now. English until the system's is set. */
export function appLanguage(): Language {
  return current;
}

/** The choice made in Settings; the system's until one is made. */
export function languageChoice(): LanguageChoice {
  return choice;
}

/** The system's preferred languages, most preferred first. */
export function setSystemLanguageTags(tags: readonly string[]): void {
  update(tags, choice);
}

/** The choice made in Settings (in memory; languageSources stores it). */
export function setLanguageChoice(next: LanguageChoice): void {
  update(systemTags, next);
}

/** Called when the language or the choice changes. */
export function subscribeAppLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
