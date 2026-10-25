# Local iOS dev build

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

## Local dev build (alternative to `development` profile)

Still useful when iterating on native config. Requires Xcode with an Apple ID signed in:

```bash
npx expo prebuild --platform ios --clean    # npm run prebuild:ios
npx expo run:ios --device                   # npm run start:device:ios
```

Enable Developer Mode on the device (Settings → Privacy & Security → Developer Mode; needs a restart)
and trust the profile under Settings → General → VPN & Device Management. A dev-client build needs Metro
running — that is a property of the dev client, not of the app: `preview`/`production` builds bundle all
JS and assets and run fully offline.
