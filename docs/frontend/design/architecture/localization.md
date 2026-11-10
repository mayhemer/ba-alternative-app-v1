# Localization

The app speaks English and Czech. Settings offers *System default*, *English* and *Čeština*. With
the system default (the default), it follows the system language: Czech when the system's first
preferred language is Czech (`cs`, any region, any case), English for every other language. A
language chosen in Settings wins over the system's.

## Where things are

| What | Where |
|---|---|
| Every string the app shows, English and Czech | `src/i18n/strings.ts` |
| Which language the app shows, and the rule that picks it | `src/i18n/language.ts` |
| Where its inputs come from: the system language (`expo-localization`) and the choice stored from Settings (AsyncStorage, `app:language`) | `src/i18n/languageSources.ts` |
| The Settings rows | `screens/settings/SettingsScreen.model.ts` (`languageOptionsModel`) |
| Picking the API's localized entries (bios, genre, country, stage, category names) | `src/utils/localization.ts` |
| The Android now card's screen-reader label for its clash icon | `modules/now-card/android/src/main/res/values*/strings.xml` |

`i18n/` is a leaf every layer may import, as `styling/` and `types/` are. It imports only `types/`,
and only `languageSources.ts` may use React, Expo or storage; lint enforces both. That keeps `language.ts`
and `strings.ts` loadable from `lib/`, `utils/` and plain Node (the Playwright specs import
`utils/festivalTime`, which names weekdays).

## The strings file

- One file for translators: the English dictionary, then the Czech one, each grouped by the
  component that shows the string (`settingsScreen`, `starSelector`, `myScheduleShare`, …).
- A word several components show with one meaning has a group of its own and is defined once:
  `screens` (the drawer, top bars and search sections name screens by it), `setStatus` (LIVE /
  done / START on My plan, the now pill and the now card), `conflict`, `interest` (a pick's name),
  `weekdays`.
- Counted phrases are functions, and Czech has its own plural forms (1 / 2–4 / 0 and 5+,
  `czechPlural`). Where a Czech phrase would change its preposition with the number, it is worded
  so it doesn't.
- `Strings` is the English dictionary's type, so the type checker rejects a Czech dictionary that
  misses a key or adds one; `strings.test.ts` checks the same at run time, and that no string is
  empty.
- Not translated: durations (`45 min`, `1 h 20`, the same in both languages,
  `screens/my-plan/planDurations.ts`), times, the brand name, and the languages' names in Settings
  (`LANGUAGE_NAMES`: each named in itself, so someone who can't read the current language finds
  theirs).

## Reading a string

`strings()` returns the dictionary of the current language: `strings().settingsScreen.signOut`.
Call it at use time, in a render, a model function or a handler. **Never keep its result in a
module-level constant or a module-level React element**: those are computed at import, in the
language of that moment. A module-level object whose identity matters gets a getter instead (the
artist list's search scope, `ARTIST_SEARCH_SCOPE.title`).

## The API's localized data

The API sends artist genre and country, stage and category names and the bios once per language,
codes upper case (`EN`, `CS`), Czech listed first. `utils/localization.ts` picks the entry in the
app language, else the English one, else the first. So in Czech the artist sheet shows the Czech
bio, and a stage the API has no Czech name for keeps its English one.

## How the language is chosen and changes

The rule is `chooseLanguage(systemTags, choice)` in `i18n/language.ts`: the chosen language, or
with the system default, the system's first preferred language (Czech further down the list still
gives English). `language.ts` holds both inputs and the result; `languageSources.ts` feeds them.

1. `App.tsx`, at module scope, calls `applySystemLanguage()`: the system's preferred language tags
   (`expo-localization`'s `getLocales()`), before the first render. Until then, and in unit tests,
   the language is English.
2. `hydrateLocalState` (store/uiStatePersistence) restores the choice stored from Settings
   (`loadLanguageChoice`), and StartupGate waits for it, so the app opens in that language. Only
   the splash's "Loading…" can show in the system's language first, for the moment the read takes.
3. Picking a row in Settings (`saveLanguageChoice`) switches at once and stores the choice.
4. While the app runs, `useAppLanguage()` in `App` follows a change of the system language
   (`useLocales()`) and of the choice. `App` keys `AppContent` by the language, so every screen
   remounts in the new one. The session (`AuthProvider`), the data cache and `StartupGate` stay
   mounted; the open screen comes back through AppShell's saved navigation state (so Settings stays
   open after picking a language), other UI state through its usual persistence.
   - iOS restarts the app when its language changes, so there a system change only shows at the
     next launch, which reads it in step 1.
   - Android tells the running app (expo-localization adds `locale` to the activity's
     `configChanges`), and so does the web (`languagechange`).
5. Per-app language: `app.json` declares English and Czech to the system (`expo-localization`'s
   `supportedLocales`), so iOS Settings and Android 13+ also offer a language choice for this app
   alone; the preferred list the app reads already has that choice first. With *System default* in
   the app, that is what it shows.

## Adding a language

Add its dictionary to `strings.ts` (typed `Strings`) and its name to `LANGUAGE_NAMES`; the code to
`Language`, `LANGUAGE_CHOICES` and `chooseLanguage`, and a row to `languageOptionsModel`; the locale
to `supportedLocales` in `app.json`; and a `values-<code>` folder for the Android resource.

## Tests

- `i18n/language.test.ts`: the rule (system language and choice) and the current-language store.
- `i18n/languageSources.test.tsx`: the stored choice at launch, choosing in Settings, following a
  system change while the app runs.
- `store/uiStatePersistence.test.ts`: the choice restored before the app shows.
- `screens/settings/SettingsScreen.model.test.ts`: the Settings rows.
- `i18n/strings.test.ts`: both dictionaries complete, the plural forms, weekdays.
- `utils/localization.test.ts`: the API's entries by language, with the fallbacks.
- In Czech, rendered: the artist sheet (Czech bio, day labels, the clash line) and the drawer.
- Tests run in English unless they set Czech (`setLanguageChoice('cs')`, back to `'system'` after
  each). The web E2E browser is pinned to `en-US` (`playwright.config.ts`); every iOS E2E launch
  passes `-AppleLanguages (en)` (see `docs/frontend/instructions/e2e-ios.md`), so both read English
  whatever the machine's language.
- iOS E2E: `language-in-app.yaml` (Čeština in Settings, Czech after a restart on an English system)
  and `language-system.yaml` (a Czech system gives Czech; English chosen in Settings wins over it).
