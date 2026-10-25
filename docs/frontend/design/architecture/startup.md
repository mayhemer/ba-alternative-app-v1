# Startup and UI state

## Startup Gate

`src/store/StartupGate.tsx` is the single owner of the boot lifecycle and replaces the earlier
`RootGate`:

```
resolve slug → (load external data ∥ hydrate local state) → both done
             → lift splash, render full UI → (logged in) server interest sync
```

One `Promise.all([startSync(...), hydrateLocalState(slug)])` resolution flips splash → full UI.
`RootGate` blocked only on the external load and let providers hydrate local state late, which is
what caused the UI-state restore races. Because external load resolves from whichever source
produces data first — persisted cache or network — this gate no longer implies a round trip.

Provider order (`App.tsx`): `AppProvider → AuthProvider → StartupGate → AppContent`, with the
feature providers inside `AppContent` so they mount only once startup hydration has completed.

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
