# Frontend development

## First run for iOS (saved working steps)

With Expo Go app, and `npm start`, the QR code can be scanned on the phone.  However, Expo doesn't support native packages, hence it's can be running this way.

Development build:
* XCode -> Settings -> Accounts -> Add Apple ID (regular apple id signin)
* `rm -rf ios`
* `npx expo prebuild --platform ios --clean`
* set `"bundleIdentifier": "cz.janbambas.ba"` in app.js
* open `ios/frontend.xcodeproj` and set the signing account, on the root node, target, signing settings
* enable development mode in iOS (Settings > Security & Privacy > Development mode | On/Off), needs restart
* `npx expo run:ios --device`
* allow the account's apps in iOS (Settings > General > VPN & Device sec | Developer's Apps)
* `npx expo run:ios --device`
-> installed in the phone, need to enter the server address manually (no QR code scan)

Note that this NEEDS the server to run.  Assets (like icons) seem to be loaded from the server, this is not a fully self-contained bundled build!

## Local run and debug

```bash
cd app/frontend
npx expo install react-dom react-native-web babel-preset-expo @babel/core
# then run
npx expo start
# --web will open in the default browser
```

F5 will run in chrome with VSCode attached as debugger.  See launch.json "chrome" config.

## Linting react

ESLint extension in VSCode
`npm install --save-dev eslint-config-react-app eslint@^8.0.0`

## Testing

One command runs everything that does not need a device:

```bash
npm run verify      # types → lint → jest (×3 platforms) → performance → web E2E → iOS simulator E2E
npm run verify -- --fast   # the same without performance and iOS simulator E2E: ~30 s instead of ~3 min
```

| Layer | Command | What it is for |
|---|---|---|
| Unit / integration | `npm test` | Logic, caching, sync, interests, auth storage. Runs three times, once per platform preset |
| Performance | `npm run test:perf` | Render-count and JS-duration regressions, vs `.reassure/baseline.perf` |
| Web end-to-end | `npm run test:e2e:web` | Real browser against the exported build |
| iOS end-to-end | `npm run test:e2e:ios` | Maestro flows on the iOS Simulator, against the `e2e-ios-sim` build. In `verify`; skipped (not failed) when a prerequisite is missing |
| Device performance | `npm run test:perf:device` | Frames, start-up and memory on the physical Android phone. **Not** in `verify` — needs the phone, and takes 15-25 min |

Conventions worth knowing before adding a test:

- Tests sit next to the module they cover (`<module>.test.ts`), as in the backend. `tests/` holds
  fixtures, setup and the E2E servers — not cases.
- `.test.ts` runs on all three platform presets; `.test.tsx` only on the native ones.
  `@testing-library/react-native` builds a React Native element tree, which react-native-web's DOM
  output cannot host, so web rendering is Playwright's job.
- Caches and the UI-state snapshot are module state. Cases isolate by taking a **fresh slug** (or
  screenKey) rather than resetting shared state.
- Pin time with `setCurrentTimeMs(Date.parse('…+02:00'))` — an explicit offset, so the suite does not
  depend on the runner's timezone. Use fake timers only for *scheduling*.
- Mock at the module boundary (the adapter), not at `fetch`.

### Native end-to-end (iOS Simulator)

`npm run test:e2e:ios` boots a simulator (`--sim "<name>"`, default iPhone 17 Pro), installs the
newest `e2e-ios-sim` build from EAS, serves the fixtures on `:4010` and runs every flow in
`e2e/native/` with Maestro. The simulator shares the Mac's network, so the build's
`http://localhost:4010` reaches the server with no further setup.

It tests a **built binary**, not your working tree, and prints how far behind HEAD that build is.
After app changes, `npm run build:e2e:ios` first. To use a locally built simulator app instead of
EAS, pass `--app path/to/App.app`; nothing else in the runner changes.

`npm run clean:e2e:ios` frees what the suite leaves on disk, about 3.5 GB. It erases the test
simulator to factory state (every app on it, not just this one), and deletes the downloaded simulator
builds, Maestro's debug output and the last reports. The next run rebuilds all of it, at the cost of a
slower first boot and a fresh download: about 6½ minutes for `verify` instead of 3.

Two things to know when writing flows:

- **A touchable is one accessibility element on iOS.** Its children's text is merged into a single
  label, so an artist row reads "3 INCHES OF BLOOD, HEAVY METAL, …", not just the name. Match names as
  `".*NAME.*"`; match drawer items exactly, so "Program" does not also hit "Support Program".
- Elements with no stable text get a `testID` (the search field is `artist-search`). A placeholder is
  not reliably matchable.

Maestro cannot drive a physical iPhone (2.11: "Physical iOS devices are not yet supported").

### Device performance (Android)

Measured on a real low-end phone — currently a Nokia 3 (TA-1032, Android 9, MediaTek MT6737, 2 GB) —
because neither Node nor a browser can see what makes the app slow there: Hermes instead of a JIT,
native view creation, and a CPU that idles with three of its four cores switched off.

```bash
npm run build:perf:android      # once per app change; EAS cloud
npm run install:perf:android    # newest perf build onto the phone (cached by build id)
npm run test:perf:device        # --runs N, --scenarios a,b, --baseline
```

Scenarios: **cold start** (first frame, and the moment the app is usable via a logcat marker the perf
build emits), **list fling**, **search typing** (the Intl collation path) and **timeline day switch**.
Each reports `dumpsys gfxinfo` frame stats — janky %, p50/p90/p99 frame time, slow-UI-thread count —
and memory from `dumpsys meminfo`.

Everything is driven over adb, and nothing of ours runs on the phone during a measurement: elements
are found with `uiautomator dump` beforehand and the measured input is plain `adb input`. Maestro
would be easier to write, but its on-device driver polls the view tree while it waits, competing with
the app for exactly the frames being measured.

For repeatability the runner keeps the screen on, kills background processes, routes the fixture
API over USB (`adb reverse`) and **switches Wi-Fi off for the run** — restored afterwards, including on
Ctrl-C. It waits for the battery to cool before every repetition: Android 9 has no thermal service and
the CPU sensors need root, so the battery is the only gauge available.

Set the phone's screen lock to **None**; automation cannot type a PIN.

It is **report-only** for now: medians against `perf/devices/<model>.json` with a 🔴 above +20%, but
no failure. Thresholds need the noise floor first — record a baseline, then run it a few times on
unchanged code and see how far it moves.

### Fixtures

`tests/fixtures/generated/` is produced by `npm run gen:fixtures`, which runs the backend's real
captured API responses through the backend's own `normalize` functions. The shapes are therefore
correct by construction, and the volume is realistic (260 artists, 311 events for ba2025). The
output is committed, so a test run needs no backend and no build step — regenerate only when the
captures are refreshed or a normalizer changes.

`npm run serve:fixtures` serves them on the real endpoint paths, which is also how to run the app
against frozen data by hand (see the API origin note above).

### What each layer cannot tell you

Web E2E is **not** a performance signal, and neither is the Reassure suite. The browser runs V8 with
a JIT and renders to the DOM; the device runs Hermes and creates native views. The app's most
expensive interaction — mounting a festival day, which once pinned a low-end Android's UI thread for
over a second — does not exist in the same shape on web at all. Reassure gates the *algorithms* in
Node; only a real phone measures the phone.

### CI

`.github/workflows/frontend.yml` runs the first three layers on every push and pull request touching
`frontend/`. The performance job is **advisory** (`continue-on-error`): render counts are comparable anywhere,
durations are not. It measures the base revision and the current one in the same job, which cancels
the machine variance that makes a committed baseline useless there — and skips with a notice while
the base branch has no performance suite.

Read a duration report with the noise floor in mind. Identical code compared against itself typically
moves by ~1-2% and occasionally ~6%, and the scenarios **drift together** with machine load: if every
row moved the same way by a similar amount, nothing changed. `tests/setup/perfOptions.ts` documents
the two noise sources, and why the suite samples 30 runs after 3 warmups and repeats each subject to
fill a ~20 ms window.

Two metrics are sturdier than timing and are the ones worth gating: **render counts**
(`measureRenders`, deterministic) and **element budgets** (`src/**/elementBudgets.test.tsx`, exact,
and in the normal suite rather than the performance one).

Native E2E is deliberately absent from CI: it needs a built binary, and those come from EAS cloud
builds whose minutes are a real quota, unlike Actions minutes on a public repo.

---

## Native builds

The project is **managed / CNG** — `ios/` and `android/` are gitignored and regenerated by
`expo prebuild`. Never edit them by hand; the changes are thrown away. Native config lives in
`app.json` (bundle id, package, entitlements, intent filters) and `eas.json` (build profiles).

Builds run **remotely on EAS**, so no local Xcode / Android SDK / fastlane setup is needed.

### One-time setup

```bash
npm install -g eas-cli@latest    # eas.json requires >= 21; needs Node >= 20
eas login                        # opens a browser (since eas-cli 19). --no-browser for a terminal prompt
cd app/frontend && eas init      # writes extra.eas.projectId + owner into app.json
```

Verify the config parses at any time without starting a build:

```bash
eas config --profile preview --platform ios
```

### Build profiles (`eas.json`)

| Profile | What it produces | Use for |
|---|---|---|
| `development` | dev client, needs Metro running | day-to-day native debugging |
| `preview` | **Release**, self-contained, ad-hoc iOS / `.apk` Android | testing on real devices + inviting testers |
| `production` | Release, App Store profile / `.aab` | store submission |
| `perf` | `preview` + fixture API, ba2025, perf marker, plain HTTP allowed | `test:perf:device` on the Android phone |
| `e2e-ios-sim` | Release **simulator** build + fixture API, ba2025 | `test:e2e:ios` |

```bash
npm run build:preview:ios       # eas build -p ios --profile preview
npm run build:preview:android   # eas build -p android --profile preview
npm run build:perf:android      # eas build -p android --profile perf
npm run build:e2e:ios           # eas build -p ios --profile e2e-ios-sim
npm run doctor                  # expo-doctor; run before every build
```

`appVersionSource` is `remote`, so EAS owns the build counter — do **not** put `ios.buildNumber` or
`android.versionCode` in `app.json`, they would be ignored. Inspect with `eas build:version:get`.

> ⚠️ `eas build` uploads a **git archive**. Uncommitted and untracked changes are *not* in the build.
> Commit first, or prefix with `EAS_NO_VCS=1` to upload the working tree as-is.

### Distributing to invited testers (no App Store)

iOS uses **ad-hoc** distribution: each tester's device UDID must be registered *before* the build, and
adding a device requires a new build (the device list is baked into the provisioning profile).

Because this project uses **local credentials** (see below), device registration is manual portal work —
`eas device:create` does **not** apply here, since EAS never talks to Apple:

1. Get the UDID (`xcrun devicectl list devices`, or Finder → device → click the line under the name).
2. Add it at <https://developer.apple.com/account/resources/devices/list>.
3. Regenerate the ad-hoc provisioning profile so it includes the new device, re-download it, and rebuild.

Testers themselves need **nothing** — no Apple Developer account, no Expo account, no team membership.
Only their device UDID has to be in the profile.

A successful `preview` build gives a hosted build page with a QR code and install link — EAS serves the
`itms-services://` manifest for iOS and the `.apk` directly for Android, so nothing needs to be
published to `ba.janbambas.cz`. Tell iOS testers to open the link **in Safari**; it fails silently in
some in-app browsers. Build artifacts and their links **expire** (30 days on the free plan).

Limits: 100 ad-hoc devices per device type per membership year; provisioning profiles expire after 12
months, so an annual rebuild is unavoidable.

### Credentials

**The two platforms deliberately use different models**, set per-platform in `eas.json`:

| Platform | `credentialsSource` | Meaning |
|---|---|---|
| iOS | `local` | We own the certificate and profile. EAS never contacts Apple. |
| Android | `remote` (default) | EAS generates and stores the keystore. |

Requires `eas-cli >= 21` (`npm install -g eas-cli@latest`) and Node >= 20.

#### iOS — local credentials

Chosen so that no App Store Connect API key exists and EAS is granted no standing access to the Apple
account. The cost is that everything is manual portal work.

**Files** live in `sensitive/ios-distribution-cert/` — outside the git root, so they can never be
committed. Do **not** use Expo's suggested `ios/certs/` path: `/ios` is gitignored *and* wiped by
`expo prebuild --clean`.

**1. Distribution certificate → `.p12`**

Generate a CSR in Keychain Access, upload it at
<https://developer.apple.com/account/resources/certificates/list>, download the `.cer`, double-click to
import. Then in Keychain Access: **login** keychain → **My Certificates** → right-click the
`iPhone Distribution: …` row → **Export** → **Personal Information Exchange (.p12)**.

*My Certificates* matters — the plain *Certificates* category hides the private key and only offers a
`.cer`. Check the pairing first:

```bash
security find-identity -v -p codesigning     # must list the distribution identity
openssl pkcs12 -in dist.p12 -nokeys -passin pass:PW | openssl x509 -noout -subject -dates
```

`security export` is not a shortcut — it cannot select a single identity and dumps every one in the
keychain.

**2. App ID capabilities ⚠️ — the trap of the manual path**

EAS-managed credentials sync capabilities automatically; doing this by hand you must match them yourself
or the build fails code-signing with an entitlement mismatch. This app generates exactly two:

| Entitlement | Source |
|---|---|
| `com.apple.developer.applesignin` | `expo-apple-authentication` plugin |
| `com.apple.developer.associated-domains` | `ios.associatedDomains` in `app.json` |

So the **explicit** App ID `cz.janbambas.ba` (not a wildcard) must have both **Sign In with Apple** and
**Associated Domains** enabled at
<https://developer.apple.com/account/resources/identifiers/list>.

**3. Ad Hoc provisioning profile**

At <https://developer.apple.com/account/resources/profiles/list> → **+** → **Ad Hoc** (under
*Distribution*) — **not** App Store, which carries no device list and cannot install on a phone. Pick the
App ID, the distribution certificate, and every registered device. Generate, download, save next to the
`.p12`.

Regenerate + re-download + rebuild whenever the device list changes. The profile expires after 12 months.

**4. `credentials.json`** (project root, **gitignored** — it holds the password in plaintext)

```json
{
  "ios": {
    "provisioningProfilePath": "/absolute/path/to/sensitive/ios-distribution-cert/ba-adhoc.mobileprovision",
    "distributionCertificate": {
      "path": "/absolute/path/to/sensitive/ios-distribution-cert/dist.p12",
      "password": "…"
    }
  }
}
```

A successful setup means `eas build -p ios` **never prompts for an Apple login**. That prompt is the
signal that local credentials were *not* picked up.

#### Android — EAS-managed keystore

On the first Android build EAS generates the keystore. Immediately back it up:

```bash
eas credentials -p android
# → Keystore: Manage everything needed to build your project
#   → "Download existing keystore"   → save into sensitive/
#   → the keystore view shows the SHA-256 Fingerprint
```

The SHA-256 goes into `public/.well-known/assetlinks.json`. The *same* keystore is required if the app
ever goes to Google Play — a different one is rejected as a signature mismatch.

#### No build-time secrets

`eas secret:create` / `eas env` are **not** needed here: there is one environment, and the Cognito ids
are compiled in (`src/auth/cognitoConfig.ts`). `eas config` confirms this — it reports no environment
variables for the profile. That changes only if a staging backend is introduced.

The test profiles are the exception, and none of their values are secrets. `perf` and `e2e-ios-sim`
set them in the profile's `env` in `eas.json`:

| Variable | Read by | Effect |
|---|---|---|
| `EXPO_PUBLIC_API_ORIGIN` | `src/adapters/apiConfig.ts` | API origin; unset means production |
| `EXPO_PUBLIC_DEFAULT_SLUG` | `src/store/AppContext.tsx` | first-run edition; the fixtures cover ba2025 |
| `EXPO_PUBLIC_PERF_MARKS` | `src/store/StartupGate.tsx` | logs the startup marker the device runner times |
| `BA_ALLOW_CLEARTEXT` | `app.config.js` | allows plain HTTP — see below |

**Put them in the profile, not your shell.** A variable set in your local shell is not uploaded with
the project, so `EXPO_PUBLIC_API_ORIGIN=… eas build` builds an app that silently talks to production.
`eas config --profile perf --platform android` shows what a profile actually resolves to.

`EXPO_PUBLIC_*` values are **inlined at build time**: the origin is a property of the binary, not
something switchable at launch.

**Plain HTTP on Android.** Release builds targeting API 28+ refuse cleartext traffic, and the Expo
template only lifts that in the *debug* manifest — so a perf build talking to `http://localhost:4010`
would have every request refused. `plugins/withCleartextTraffic.js` sets `usesCleartextTraffic`, and
`app.config.js` applies it **only** when `BA_ALLOW_CLEARTEXT=1`; production and preview builds never get
it. Check with `npx expo config --type introspect`. iOS needs nothing: the template's App Transport
Security already allows local networking.

### Deep links

`app.json` declares iOS `associatedDomains` and an Android `autoVerify` intent filter for
`ba.janbambas.cz/add-friend`. Both require files served from the web host, which live in
`frontend/public/.well-known/` — `expo export` copies `public/` verbatim into `dist/`, so they ship with
the normal `scripts/deploy-frontend` run. `assetlinks.json` carries the real Android SHA-256 from the
EAS-managed keystore; it must be refreshed if that keystore is ever replaced, or Android app links
stop verifying.

`public/.htaccess` ships alongside them and does two things the host does not do by default:

- `ForceType application/json` on `apple-app-site-association` — the file has no extension, so the
  server otherwise returns it with an empty `Content-Type`, which Apple's spec disallows.
- SPA fallback to `index.html` for any non-existent path, so `/add-friend/<token>` reaches the app
  instead of 404ing. `.well-known` is excluded — a missing AASA must stay a 404, never become HTML.

**iOS caches the association at install time.** A `preview`/`production` build reads the AASA once, from
Apple's CDN, when it is installed; there is no periodic re-check. Deploying (or fixing) the AASA after
the app was installed changes nothing on the device — delete and reinstall the app. No rebuild is needed
as long as the entitlement and App ID are unchanged.

Verifying the serving side without a device:

```bash
curl -sSI https://ba.janbambas.cz/.well-known/apple-app-site-association   # 200, no redirect
curl -sS  https://app-site-association.cdn-apple.com/a/v1/ba.janbambas.cz  # Apple's ingested copy
```

The CDN copy is what devices actually read. If it 404s or is stale, no amount of reinstalling helps —
Apple re-fetches the origin on its own schedule (up to ~24h).

### Local dev build (alternative to `development` profile)

Still useful when iterating on native config. Requires Xcode with an Apple ID signed in:

```bash
npx expo prebuild --platform ios --clean    # npm run prebuild:ios
npx expo run:ios --device                   # npm run start:device:ios
```

Enable Developer Mode on the device (Settings → Privacy & Security → Developer Mode; needs a restart)
and trust the profile under Settings → General → VPN & Device Management. A dev-client build needs Metro
running — that is a property of the dev client, not of the app: `preview`/`production` builds bundle all
JS and assets and run fully offline.

# Frontend expo update

npm update aborted with an ERESOLVE error and changed nothing. Here's what's going on and what I'd suggest.

What happened
npm update tries to bump every dependency to the newest version allowed by the ^/~ ranges in package.json. One of those bumps breaks the peer-dependency tree:

Your project is on Expo SDK 54, which pins react-native@0.81.5.
react-native-reanimated is ranged ^4.3.0, so npm update wants to jump it to 4.5.1.
But reanimated 4.5.1 declares a peer of react-native@"0.83 - 0.86" — incompatible with 0.81.5.
So npm refuses the whole operation. Nothing was installed or modified.

The underlying issue
This is the classic Expo trap: npm update doesn't know about Expo's compatibility matrix. Expo SDK 54 is a locked bundle — RN 0.81, a specific reanimated line, a specific gesture-handler, etc. Newer versions of those libraries (reanimated 4.5, RN 0.83+) belong to Expo SDK 55+. Running npm update pulls "latest within semver" and drifts you off the matrix, which is exactly the conflict you're seeing.

Bottom line: for an Expo app you generally don't use npm update to move dependencies. You use Expo's tooling, which respects the matrix.

Options
1. Do nothing (recommended for now). The update failed cleanly — you're in a consistent, working state on SDK 54. There's no urgency unless there's a specific bug or security issue you're chasing.

2. Align to the SDK 54 matrix (safe housekeeping). Instead of npm update, run:

```bash
npx expo install --check      # shows which deps are off the SDK-54 recommended versions
npx expo install --fix        # rewrites them to SDK-54-correct versions
```

This is the "correct" version of what you were trying to do — it upgrades/pins within what Expo 54 supports, no peer conflicts.

3. Full SDK upgrade (bigger project). If the actual goal is to get to reanimated 4.5 / RN 0.83+, that means bumping Expo to SDK 55 (or whatever's current), via npx expo install expo@latest && npx expo install --fix. This is a real migration — native rebuild, breaking-change review, testing on iOS/Android/web — not a casual update.

4. Force it (not recommended). npm update --legacy-peer-deps would push reanimated 4.5.1 onto RN 0.81. That's an unsupported combination that can break at runtime or build time. I'd avoid it.

My recommendation
Start with option 2 — run npx expo install --check so we can see what's actually drifted, with no changes made. That tells us whether there's anything worth updating at all within SDK 54. Then decide whether a full SDK upgrade (option 3) is worth scheduling separately.
