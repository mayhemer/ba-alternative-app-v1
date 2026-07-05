# Frontend development

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

## iOS

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

# Frontend expo udpate

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
