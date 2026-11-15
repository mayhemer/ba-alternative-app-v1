# Native end-to-end (iOS Simulator)

`npm run test:e2e:ios` builds the app, boots a simulator (`--sim "<name>"` or `IOS_SIM`, default
iPhone 17 Pro), installs the build, serves the fixtures on `:4010` and runs every flow in
`tests/e2e/ios/` with Maestro (`--flow tests/e2e/ios/<file>.yaml` runs one, while writing it). The simulator shares the Mac's network, so the build's
`http://localhost:4010` reaches the server with no further setup.

The build is a Release simulator build made with `xcodebuild` from the prebuilt `ios/` folder, into
`ios/build/e2e`, with the `e2e-ios-sim` profile's env from `eas.json` (`scripts/lib/iosLocalBuild.ts`).
It covers the working tree's JS, and its native code as of the last `npm run prebuild:ios` — run that
first after changing `app.json`, a config plugin or a native dependency. The first build takes about
7 minutes, later ones about one.

`npm run test:e2e:ios:eas` tests the newest EAS `e2e-ios-sim` build instead (`npm run eas-build:e2e:ios`)
and prints how far behind HEAD it is; `--app path/to/App.app` tests any other simulator app.

`npm run clean:e2e:ios` frees what the suite leaves on disk, about 3.5 GB plus the local build. It
erases the test simulator to factory state (every app on it, not just this one), and deletes the
local and downloaded simulator builds, Maestro's debug output and the last reports. The next run
rebuilds all of it, at the cost of a slower first boot and a from-scratch build.

## What runs here

Only what the native app alone can show: native components (the bottom sheets, the drawer, the lists
and the timeline's scrollers), native layout and scrolling, the iOS keyboard, a restart of the
process, iOS links and languages. The logic behind each scenario is Jest's, and web E2E runs most
paths again in a browser — a different engine that must give the same result, so some overlap with
web is on purpose. Each flow's header says what it adds over those; a new scenario that only checks
logic belongs in Jest.

The suite runs as three launches, in the order `tests/e2e/ios/config.yaml` lists (`executionOrder`):

| Launch | Install | Scenarios |
|---|---|---|
| A | fresh, the real clock, no picks | `a1`–`a8`: startup, drawer sections, search, jump to a set, the star selector, two quick star presses, picks after a restart, an offline cold start |
| B | seeded as a returning user (`e2eSeed: returning-user`), Wednesday 14:10 (`e2eNow`) | `b1`–`b9`: My plan's clashes, the now pill's switch between My plan and the timeline, the now card's link, the conflict sheet, a day's restored end, a search landing then a jump, a share link, the Support Program's lens, a pull past the top opening a panel |
| C | fresh, the system in Czech | `c1`, `c2`: the language, the edition switch |

The first scenario of a launch clears the app (`common/launch-fresh.yaml`,
`common/launch-returning-user.yaml`, or C1's own Czech launch); every later one starts with a relaunch
(`common/relaunch.yaml`, or `common/relaunch-returning-user.yaml` to keep Wednesday 14:10), then opens
the screen it needs: a relaunch restores the last screen, lens, day and scroll, and puts the app in a
state a user can be in whatever the scenario before left on screen. A failure is reported and the run
goes on (`continueOnFailure`); later scenarios of the same launch may fail after it, so read a
launch's first failure first. `--flow` still runs one file, on whatever state the simulator holds.

The e2e build's time is **controlled**: a launch with `e2eNow` (an ISO time with its offset) shows that
instant, standing still for the whole launch; one without it runs on the real clock (outside the 2025
festival). Its **seeds** (`tests/fixtures/e2e/seeds.json`, which only this build carries) store a
named set of picks at a cleared launch, so a flow that tests what picks lead to starts from them;
flows that test starring itself star by hand. Both are launch arguments, for that launch only
([startup.md › Clock and time modes](../design/architecture/startup.md#clock-and-time-modes),
[› E2E test seeds](../design/architecture/startup.md#e2e-test-seeds)). A new seed is a new entry in
that file; its picks name each artist by id and lineup name, and Jest checks both.

Things to know when writing flows:

- **The flows read English, whatever the Mac's or the simulator's language.** Launch the app through
  the `common/launch-*.yaml` (cleared) or `common/relaunch*.yaml` (a restart) steps, never with a bare
  `launchApp`: they pass `arguments: { AppleLanguages: "(en)" }`, which iOS reads as the app's
  preferred languages for that launch, as its per-app language setting would; the simulator's own
  settings stay as they are. `c1-language.yaml` launches in Czech on purpose (a system language
  change on iOS restarts the app, so a launch with another list is that change).

- **A touchable is one accessibility element on iOS.** Its children's text is merged into a single
  label, so an artist row reads "3 INCHES OF BLOOD, HEAVY METAL, …", not just the name. Match names as
  `".*NAME.*"`; match drawer items exactly, so "Program" does not also hit "Support Program".
- Elements with no stable text get a `testID` (the panels' search field is `search-entry`, the open
  search's input `search-input`; the timeline's
  scrollers are `timeline-scroll-x` and `timeline-scroll-y`). A placeholder is not reliably matchable.
- Maestro lists only what intersects the screen, so `assertNotVisible` on an off-screen timeline
  block is a real position check (`a4-timeline-jump.yaml` relies on it).
- Typing into the search field occasionally went nowhere on a freshly booted simulator; use
  `common/search-artist.yaml`, which types once and retries (from an erased field) only when the
  result is not on screen, then opens its artist sheet; `common/close-sheet-and-search.yaml` closes
  both again. A result's label is "NAME, Day HH:MM–HH:MM, Stage", a My plan row's "NAME, HH:MM–HH:MM,
  Stage", a timeline block's "NAME, HH:MM–HH:MM".
- The star selector closes 2.5 s after the last tap, as in production; until then a touch on it is
  its own, so wait for `notVisible: { id: "star-selector" }` before touching what it covers. Its info
  box names the pick while it is open: match `{ id: "star-selector-info", containsDescendants: [<name>] }`
  (`childOf` takes only a direct parent, and the name sits a row deeper); the state buttons carry the
  same names, so a bare text match finds those.
- A relaunch restores the last screen as it was left, its drawer included: the menu button then reads
  "Close menu". `common/open-section.yaml` opens the drawer only when it is closed, and retries the tap,
  which right after a relaunch has been seen to go nowhere.
- `openLink` with the `ba://` scheme raises iOS's "Open in …?" alert until it has been accepted once.
  Open links through `common/open-link.yaml`, which answers the alert only when it is there (an
  optional tap waits out its whole timeout on every run without it) — left up, it sits over every
  later flow.
- The fixture API serves one share token (`tests/server/shareFixture.ts`) for the add-friend flows.

Maestro cannot drive a physical iPhone (2.11: "Physical iOS devices are not yet supported").
