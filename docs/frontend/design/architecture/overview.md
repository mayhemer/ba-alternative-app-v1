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

UI code is grouped by what it is for, not by file kind:

```
src/
  screens/        # One folder per navigation route: the screen and everything only it uses
    artist-list/    #   list, rows, letter headers, the list's filter context
    timeline/       #   Timeline + Support timeline, TimelineView, the day filter context
    my-plan/        #   the plan list, its elements, PlanContext, now pill; filter/ = filter chip + panel
    settings/
    splash/
  features/       # Functionality several screens use: its context, logic and elements
    timeline/       #   the drawn timeline (lanes, blocks, ruler, now line, day buttons) + its geometry
    artist-detail/  #   the artist detail sheet, opened from every screen
    conflicts/      #   clash computation, the conflict sheet, conflict copy
    interests/      #   picks (Must-see / Maybe / …), the star
    social/         #   friends, the lens, share links
  shell/          # The frame around screens: AppShell, top/bottom bar, drawer, toast, ScreenUIContext
  ui/             # Reusable pieces with no festival knowledge (Text, chip frame, stripes, sameProps)
  hooks/          # General React hooks (layout mode, minute clock, overlays, bottom sheets)
  utils/          # General helpers, no React (festival time and days, colour, text fit, perf marks)

  adapters/       # API-specific fetchers (swappable)
  auth/           # Cognito config, token storage, sign-in/out, AuthContext
  cache/          # Cache service (UI's only data source) + social cache
  navigation/     # Navigator, back-history tracking, share-link handling
  store/          # App context + cache store binding + startup gate + UI-state persistence
  styling/        # Design tokens
  sync/           # Background sync service + festival date config
  types/          # Backend type re-exports
```

### Where a file goes

1. **An element stays with its model.** `X.tsx`, `X.model.ts`, `X.test.tsx` and `X.model.test.ts`
   sit side by side, never in a folder of their own; there are no `index.ts` barrels or
   re-exporting modules — import from the file that defines the thing.
2. **One user → that user's folder.** A file or function used by one screen or feature lives
   there. When a second one starts using it, it moves out: to `features/`, or to `ui/` / `utils/`
   if it has no festival knowledge (e.g. `getFestivalDayStart` lives in `utils/festivalTime.ts`,
   not in the timeline's geometry).
3. **Imports point downward** — `shell` → `screens` → `features` → `ui` / `hooks` / `utils` —
   except calls into the app's two APIs, which any layer may use: `shell/ScreenUIContext` (set the
   bars, show feedback) and `navigation/`'s helpers (`navigationRef`, jumping to the timeline).
   `shell/`, `navigation/AppNavigator` and `store/StartupGate` assemble the app and may import
   any screen.
4. **A context sits with its feature** (`PlanContext` in `screens/my-plan/`, `LensContext` in
   `features/social/`); there is no global `context/` folder.
5. **A folder past ~30 files splits by sub-function**, as `screens/my-plan/filter/`.

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

Feature state lives in its own context next to its feature rather than in `AppState` —
interests, lens/scope, conflicts, social/friends (under `src/features/`), and transient screen UI
(`src/shell/ScreenUIContext`).
