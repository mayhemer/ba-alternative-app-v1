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
