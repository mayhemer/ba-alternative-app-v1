# Startup and UI state

## Startup Gate

`src/store/StartupGate.tsx` is the single owner of the boot lifecycle and replaces the earlier
`RootGate`:

```
resolve slug → install the time mode
             → (load external data ∥ E2E seed, then hydrate local state ∥ load fonts) → all done
             → lift splash, render full UI → (logged in) server interest sync
```

The time mode is installed first, so the sync's first poll interval and every screen read the clock
the build runs ([Clock and time modes](#clock-and-time-modes)); an E2E build's seed is stored before
local state reads the picks ([E2E test seeds](#e2e-test-seeds)). Both run again for the new edition on an
edition switch.

One `Promise.all([startSync(...), hydrateLocalState(slug)])` resolution flips splash → full UI.
`RootGate` blocked only on the external load and let providers hydrate local state late, which is
what caused the UI-state restore races. Because external load resolves from whichever source
produces data first — persisted cache or network — this gate no longer implies a round trip.

Provider order (`App.tsx`): `AppProvider → AuthProvider → StartupGate → AppContent`, with the
feature providers inside `AppContent` so they mount only once startup hydration has completed.

---

## Clock and time modes

Everything that shows "now" reads `currentTimeMs()` (`src/utils/clock.ts`). A build's **time mode**
moves it; stored timestamps and ones compared with another clock read `realTimeMs()`, which no mode
moves: a pick's `updatedAt` (merged against the server's), a token's expiry (Cognito's), and the
lock-screen card's script. The phone draws and switches the card on its own, real clock, so
`NowCardSync` hands it the script moved by real time minus the app's time
(`nowCardScriptForSimulatedTime`): the festival's 14:00 set goes live on the card at the real 14:00 of
the same weekday, its printed times unchanged. Elapsed-time measures (the timeline's scroll-save
throttle) use `Date.now()` directly.

The time modes live in `src/instrumentation/` with the rest of the builds' test and simulation hooks
(see [overview.md](overview.md), *Where a file goes*). `timeMode.ts` reads the mode from
`EXPO_PUBLIC_TIME_MODE`, inlined at build time:

| Mode | Value | "Now" | Builds |
|---|---|---|---|
| native | unset, or `native` | the real clock; no launch argument can move it | `production`, `perf` (named, as it extends `preview`), web |
| live simulation | `live-simulation` | the same weekday and wall-clock time in the selected edition's festival week, Monday to Sunday (`liveSimulation.ts`); the real time until the edition's schedule is loaded | `development`, `preview`, `preview-perfinst`; locally `start:sim:ios`, `start:device:ios` (`development`) and `install:preview:ios` (`preview`) |
| controlled | `controlled` | a fixed instant (ISO, with its offset), standing still for the whole launch: the launch's `e2eNow` if it names one, else the build's `EXPO_PUBLIC_TIME_NOW`; the real clock with neither | `e2e-ios-sim`; any local build given both variables |

A value the build does not know, or an instant it cannot read, fails at startup rather than running
on the real clock. Controlled time stands still so a Maestro flow, or a developer looking at one
moment, sees the same screen however long it takes; what changes on a minute boundary is covered by
Jest (`useMinuteNow`, My plan's minute ticks). To look at a moment while developing:

```
EXPO_PUBLIC_TIME_MODE=controlled EXPO_PUBLIC_TIME_NOW=2025-08-06T14:10:00+02:00 npm run start:sim:ios
```

The local run scripts take their profile's env from `eas.json` (`scripts/with-profile-env.ts`), and a
variable set in the shell wins over the profile's, as here.

Launch arguments (`src/instrumentation/launchArguments.ts`): Maestro's `launchApp: arguments:`
reaches an iOS app as `-key value`, which iOS keeps in the app's user defaults for that launch only;
React Native's `Settings` reads them. iOS only, as nothing runs E2E on Android yet. Jest pins time
with `setCurrentTimeMs`, which overrides both clocks and any mode.

## E2E test seeds

`tests/fixtures/e2e/seeds.json` holds named sets of picks the E2E build stores at launch, so a
Maestro flow that tests what picks lead to (My plan, conflicts, the lens) starts from them instead of
starring each artist through search. Each pick names its artist by id and by its lineup name; a test
checks both against the edition's fixture.

Only a build whose `EXPO_PUBLIC_E2E_SEEDS` names that file carries it (`e2e-ios-sim`): Metro
resolves the app's import of `e2e-test-seeds` to it while bundling (`metro/e2eTestSeeds.js`), and
every other build gets `src/instrumentation/noE2eTestSeeds.json`, which holds `null`, so neither the
seeds nor the test data reach it. A misnamed file fails the bundle.

`applyE2eTestSeedFromLaunch` (`src/instrumentation/e2eTestSeeds.ts`) applies the seed a launch names
(`e2eSeed`), through `setInterest`, as a tap would. A build without seeds does not read the argument.
An install is seeded once (`e2e:seeded:<name>:<slug>` in AsyncStorage), so a later launch naming it
again keeps what the flow changed since; a name the file lacks fails startup.

---

## UI State Persistence

`src/store/uiStatePersistence.ts` is the single owner of persisted UI state — components call its
API, never AsyncStorage directly. In-memory snapshot updated synchronously, writes debounced
~300 ms.

| Key | Contents |
|---|---|
| `timeline:hiddenCategories` | `string[]` |
| `timeline:scrollPositions:v2` | per screenKey, per day |
| `timeline:selectedDayStart` | per screenKey |

Timeline scroll and selected day restore on launch. **Artist list scroll restore is not
implemented** — it was attempted and reverted; `SectionList` virtualization cannot reliably
restore a position without `getItemLayout`. A `FlatList` over a pre-flattened row array is the
proposed path if it is picked up again.

---

## Splash Screen

- Native splash is held at module scope in `App.tsx` (`preventAutoHideAsync`) so the BA image
  stays up while the JS bundle evaluates; `StartupGate` owns the handover once it has painted.
- Shown while startup is in flight; activity spinner.
- On success: navigate to default or last-used screen.
- On error: show message + retry button.
