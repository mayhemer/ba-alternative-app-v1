# Testing

Each kind of test is a **unit**: an npm script that runs on its own. **Batches** run a list of
units, cheapest first, stop at the first failure and end with how long each unit took
(`scripts/test-*`, sharing `scripts/lib/batch.sh`). A unit that cannot run — a missing simulator,
Maestro, or prebuilt `ios/` — fails its batch and prints how to fix the cause.

```bash
npm run commit-check   # ~25 s   types → lint → unit
npm test               # ~1 min  types → lint → unit → web E2E
npm run verify         # ~7 min  types → lint → unit → doctor → web E2E → performance → iOS E2E
```

| Unit | Command | What it is for |
|---|---|---|
| Types | `npm run test:types` | Strict type check, no unused locals or parameters |
| Lint | `npm run test:lint` | ESLint over `src/` |
| Unit / integration | `npm run test:unit` | Logic, caching, sync, interests, auth storage. Runs three times, once per platform preset. `-- <path>` runs one file; `test:unit:watch` re-runs on change |
| Expo doctor | `npm run test:doctor` | `expo-doctor`, pinned: dependency versions against the SDK, duplicates, peer dependencies, the app config. Needs network. `react-native-render-html` is excluded from its "unmaintained" check (`expo.doctor` in `package.json`). `verify` runs `test:doctor:warn-versions` instead: there, outdated dependency versions only warn, because Expo's patch releases would otherwise turn `verify` red without a change here. Every other check still fails it. By hand, `test:doctor` fails on outdated versions too |
| Performance | `npm run test:perf` | Render-count and JS-duration regressions, vs `.reassure/baseline.perf`: `test:perf:measure` (Reassure, which only reports), then `test:perf:gate`, which fails on any render count that went up, then `test:perf:issues`, which warns (never fails) when a scenario's render issues — initial or redundant updates — differ from `.reassure/render-issues.json`, better or worse. `test:perf:baseline` records both baselines |
| Web end-to-end | `npm run test:e2e:web` | Exports the web build, then a real browser against it. Desktop runs every test; tests tagged `@layout` also run on a phone in portrait and in landscape (the compact and short layouts) |
| iOS end-to-end | `npm run test:e2e:ios` | Maestro flows on the iOS Simulator, against a Release build of the working tree made here first. Installs the app on the simulator |
| Device performance | `npm run test:perf:device` | Frames, start-up and memory on the physical Android phone. In no batch — needs the phone, tests an EAS build, and takes 15-25 min |

Conventions worth knowing before adding a test:

- Tests sit next to the module they cover (`<module>.test.ts`), as in the backend. `tests/` holds
  fixtures, setup and the E2E servers — not cases.
- `.test.ts` runs on all three platform presets; `.test.tsx` only on the native ones.
  `@testing-library/react-native` builds a React Native element tree, which react-native-web's DOM
  output cannot host, so web rendering is Playwright's job.
- Caches and the UI-state snapshot are module state. Cases isolate by taking a **fresh slug** (or
  screenKey) rather than resetting shared state.
- Pin time with `setCurrentTimeMs(Date.parse('…+02:00'))` — an explicit offset. The app shows
  **festival time** (Europe/Prague) on any device (`src/utils/festivalTime.ts`): never read a date's
  local fields (`getHours`, `getDate`, `toLocale…`) for anything shown. Jest runs in New York
  (`tests/setup/globalTz.ts`) so such a read fails the suite instead of passing in Prague; Playwright
  runs in Prague, with one test from New York. Use fake timers only for *scheduling* — and for
  render counts, where they make the timeline's per-frame mount deterministic.
- `@testing-library/react-native` 14 is async: `await render(…)` and `await view.unmount()`. An
  unawaited unmount runs its cleanup after your assertion.
- Mock at the module boundary (the adapter), not at `fetch`.

## What each layer cannot tell you

Web E2E is **not** a performance signal, and neither is the Reassure suite. The browser runs V8 with
a JIT and renders to the DOM; the device runs Hermes and creates native views. The app's most
expensive interaction — mounting a festival day, which once pinned a low-end Android's UI thread for
over a second — does not exist in the same shape on web at all. Reassure gates the *algorithms* in
Node; only a real phone measures the phone.
