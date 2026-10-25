# Frontend Architecture

How the frontend is actually built. This started as a set of decisions agreed before
implementation; it has since been updated to describe the shipped app. Where a v1 plan was
dropped or superseded, the note says so rather than leaving the plan standing.

Companion documents: [frontend/design/](../) (screens and UI behaviour), [frontend/build/](../../build/) (builds,
deployment, deep links).

---

## Tech Stack

- React Native 0.81 + Expo SDK 54 (production releases only, no canary)
- NativeWind 4 (TailwindCSS for React Native); design tokens in `src/styling/tokens.*`
- React Navigation 7 (native stack + drawer)
- React Context + `useReducer` (built-in, no Zustand)
- `@react-native-async-storage/async-storage` (platform-independent persistence)
- React Native Reanimated 4 + `@gorhom/bottom-sheet` (per [ux-principles.md](../ux-principles.md))
- `react-native-svg` (timeline conflict markers, icons)
- AWS Cognito via `expo-auth-session` / `expo-apple-authentication` (see `src/auth/`)

---

## Folder Structure

```
src/
  adapters/       # API-specific fetchers (swappable)
  auth/           # Cognito config, token storage, sign-in/out
  cache/          # Cache service (UI's only data source) + social cache
  context/        # Feature-level React contexts (interests, lens, conflicts, social, UI)
  hooks/          # Derived-data and UI hooks
  navigation/     # Navigator, back-history tracking, share-link handling
  screens/        # Screen components
  components/     # Reusable UI components
  store/          # App context + cache store binding + startup gate + UI-state persistence
  styling/        # Design tokens
  sync/           # Background sync service + festival date config
  types/          # Backend type re-exports
  utils/          # Helpers, constants, config
```

---

## State (React Context)

`src/store/AppContext.tsx` holds the minimal global state:

```typescript
type AppState = {
  selectedSlug: string | null; // null until read from AsyncStorage on startup
  isLoading: boolean;
  lastError: string | null;
};
```

- `selectedSlug` is the only value persisted here (`app:selectedSlug`). It is `null` only until
  the startup read resolves, and always falls back to `DEFAULT_SLUG` — it can never stay null
  and deadlock the startup gate.
- Slug switcher lives in Settings screen only.
- Context exposes only the slug and the loading/error setters. Cache-change
  notification deliberately does **not** live here — see *Cache change notification* in [data-layer.md](data-layer.md).

**The sync watermark deliberately does not live here.** It belongs to the data it describes, so
`cacheService` owns it and persists it alongside the datasets. Holding it in React state also
re-rendered every context consumer on each poll, for a value nothing rendered.

Feature state lives in its own context under `src/context/` rather than in `AppState` —
interests, lens/scope, conflicts, social/friends, and transient screen UI.
