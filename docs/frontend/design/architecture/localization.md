# Localization

The app speaks English and Czech. It follows the system language: Czech when the system's
first preferred language is Czech (`cs`, any region, any case), English for every other language.
There is no in-app switch yet; the code has one place for it (below).

## Where things are

| What | Where |
|---|---|
| Every string the app shows, English and Czech | `src/i18n/strings.ts` |
| Which language the app shows, and the rule that picks it | `src/i18n/language.ts` |
| Reading the system language (the only file that uses `expo-localization`) | `src/i18n/systemLanguage.ts` |
| Picking the API's localized entries (bios, genre, country, stage, category names) | `src/utils/localization.ts` |
| The Android now card's screen-reader label for its clash icon | `modules/now-card/android/src/main/res/values*/strings.xml` |

`i18n/` is a leaf every layer may import, as `styling/` and `types/` are. It imports only `types/`,
and only `systemLanguage.ts` may use React or Expo; lint enforces both. That keeps `language.ts`
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
  `screens/my-plan/planDurations.ts`), times, the brand name.

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

1. `App.tsx`, at module scope, calls `applySystemLanguage()`: `chooseLanguage` over the system's
   preferred language tags (`expo-localization`'s `getLocales()`), before the first render. Until
   then, and in unit tests, the language is English.
2. While the app runs, `useAppLanguage()` in `App` follows a change of the system language
   (`useLocales()`): it sets the new language, and `App` keys `AppContent` by it, so every screen
   remounts in the new language. The session (`AuthProvider`), the data cache and `StartupGate`
   stay mounted; UI state comes back through its usual persistence.
   - iOS restarts the app when its language changes, so there this never fires.
   - Android tells the running app (expo-localization adds `locale` to the activity's
     `configChanges`), and so does the web (`languagechange`).
3. Per-app language: `app.json` declares English and Czech to the system (`expo-localization`'s
   `supportedLocales`), so iOS Settings and Android 13+ offer a language choice for this app alone;
   the preferred list the app reads already has that choice first.

The rule is `chooseLanguage` in `i18n/language.ts`: only the first preferred language counts, so
Czech further down the system's list still gives English.

## Adding an in-app switch later

- `chooseLanguage` is the one place that decides: give it the stored choice, which wins over the
  system's when set.
- Changing the choice calls `setAppLanguage`; `App` already remounts the content on a change.
- The settings row that offers it, and persisting the choice, are the only other parts.

## Adding a language

Add its dictionary to `strings.ts` (typed `Strings`), the code to `Language` and `chooseLanguage`,
the locale to `supportedLocales` in `app.json`, and a `values-<code>` folder for the Android
resource.

## Tests

- `i18n/language.test.ts`: the choice rule and the current-language store.
- `i18n/strings.test.ts`: both dictionaries complete, the plural forms, weekdays.
- `utils/localization.test.ts`: the API's entries by language, with the fallbacks.
- In Czech, rendered: the artist sheet (Czech bio, day labels, the clash line) and the drawer.
- Tests run in English unless they set Czech (`setAppLanguage('cs')`, reset after each).
