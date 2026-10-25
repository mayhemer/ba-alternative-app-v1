# Credentials

**The two platforms deliberately use different models**, set per-platform in `eas.json`:

| Platform | `credentialsSource` | Meaning |
|---|---|---|
| iOS | `local` | We own the certificate and profile. EAS never contacts Apple. |
| Android | `remote` (default) | EAS generates and stores the keystore. |

Requires `eas-cli >= 21` (`npm install -g eas-cli@latest`) and Node >= 20.

## iOS — local credentials

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

## Android — EAS-managed keystore

On the first Android build EAS generates the keystore. Immediately back it up:

```bash
eas credentials -p android
# → Keystore: Manage everything needed to build your project
#   → "Download existing keystore"   → save into sensitive/
#   → the keystore view shows the SHA-256 Fingerprint
```

The SHA-256 goes into `public/.well-known/assetlinks.json`. The *same* keystore is required if the app
ever goes to Google Play — a different one is rejected as a signature mismatch.

## No build-time secrets

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
