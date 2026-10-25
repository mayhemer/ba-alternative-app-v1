# Native end-to-end (iOS Simulator)

`npm run test:e2e:ios` builds the app, boots a simulator (`--sim "<name>"` or `IOS_SIM`, default
iPhone 17 Pro), installs the build, serves the fixtures on `:4010` and runs every flow in
`e2e/native/` with Maestro. The simulator shares the Mac's network, so the build's
`http://localhost:4010` reaches the server with no further setup.

The build is a Release simulator build made with `xcodebuild` from the prebuilt `ios/` folder, into
`ios/build/e2e`, with the `e2e-ios-sim` profile's env from `eas.json` (`scripts/lib/iosLocalBuild.ts`).
It covers the working tree's JS, and its native code as of the last `npm run prebuild:ios` — run that
first after changing `app.json`, a config plugin or a native dependency. The first build takes about
7 minutes, later ones about one.

`npm run test:e2e:ios:eas` tests the newest EAS `e2e-ios-sim` build instead (`npm run build:e2e:ios`)
and prints how far behind HEAD it is; `--app path/to/App.app` tests any other simulator app.

`npm run clean:e2e:ios` frees what the suite leaves on disk, about 3.5 GB plus the local build. It
erases the test simulator to factory state (every app on it, not just this one), and deletes the
local and downloaded simulator builds, Maestro's debug output and the last reports. The next run
rebuilds all of it, at the cost of a slower first boot and a from-scratch build.

Two things to know when writing flows:

- **A touchable is one accessibility element on iOS.** Its children's text is merged into a single
  label, so an artist row reads "3 INCHES OF BLOOD, HEAVY METAL, …", not just the name. Match names as
  `".*NAME.*"`; match drawer items exactly, so "Program" does not also hit "Support Program".
- Elements with no stable text get a `testID` (the search field is `artist-search`; the timeline's
  scrollers are `timeline-scroll-x` and `timeline-scroll-y`). A placeholder is not reliably matchable.
- Maestro lists only what intersects the screen, so `assertNotVisible` on an off-screen timeline
  block is a real position check (`timeline-jump.yaml` relies on it).
- Typing into the search field occasionally goes nowhere on a freshly booted simulator; use
  `common/search-artist.yaml`, which retries until the filter visibly applied.
- `openLink` with the `ba://` scheme raises iOS's "Open in …?" alert until it has been accepted once.
  Tap it away (optionally) in the flow — left up, it sits over every later flow.
- The fixture API serves one share token (`tests/server/shareFixture.ts`) for the add-friend flows.

Maestro cannot drive a physical iPhone (2.11: "Physical iOS devices are not yet supported").
