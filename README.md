# Brutal Assault — alternative app

An unofficial, BA-specific companion app for the Brutal Assault festival: lineup, schedule,
personal picks, a festival-time plan, schedule conflicts, a lock-screen "now" card and sharing with
friends. One codebase for iOS, Android and web.

**Status: beta.** Nearly every planned feature is finished and in use on real devices. One gap
remains: on iOS the lock-screen card needs server push to stay reliably up to date (see *Current
state* below). It is a personal project, hosted on a private AWS account and domain, not
affiliated with or endorsed by the festival.

- Web build: <https://ba.janbambas.cz>
- API: <https://api.ba.janbambas.cz>
- App name on device: *Brutal Assault - alt* (`cz.janbambas.ba`)

---

## Why this exists

The official app is a white-label product (best4fest) that has to serve many festivals, so it is
generic by design. That is a perfectly reasonable engineering trade-off — but it means a few
things a BA visitor does often are more work than they could be: reading the timeline, scrolling
and view switching issues, narrow timeline view, spotting that two bands you starred overlap, and
comparing picks with the people you came with.

This project is an experiment in what a BA-only client can do when it is allowed to be opinionated:

- **A real 2D timeline** — time on X, categories as swim lanes, blocks proportional to set length,
  a persistent NOW line, and a separate lane view for the supporting stages.
- **Conflict awareness as a first-class feature** — overlapping "must see" picks are detected,
  marked on the blocks themselves, shown in My plan, and laid out per clash group in a detail sheet
  that reuses the timeline's own lanes.
- **Sharing without accounts for the recipient** — you mint a link, a friend opens it, and from
  then on their picks show up as ambient markers next to yours (facepile in the list, a pip on
  timeline blocks) without ever overwriting your own stars.
- **Designed for festival conditions** — dark, high-contrast, thumb-sized targets, works in
  landscape, no onboarding.

The secondary motivation is honest and worth stating: I love Brutal Assault and want to make
it better. Then, it is a learning and portfolio project. Deep dives into Expo/React Native,
AWS CDK, and agentic AI-assisted development were the point as much as the result.

**What it is not:** it does not touch the official backend's data, does not require or store BA
account credentials, and does not attempt to replace the modules the official app owns (tickets,
maps, news, shuttle buses, merch, cashless).

---

## What it does today

| Area | Feature |
|---|---|
| Lineup | Alphabetical artist list with section separators, photo/genre/country, star control |
| Timeline | 2D scroll canvas, category lanes (reorderable), proportional blocks, NOW line, day switcher, day boundary at 06:00 so after-midnight sets stay on "their" day |
| Support stages | A second timeline for non-playable/supporting entries, with sub-rows for stage-level overlaps |
| My plan | The festival-time view of your own picks: what is on now, what is next and how long until it starts, the gaps between sets, conflicts inline; a pinch steps between all sets, all picks and must-sees only; a turned phone shows the plan as a lane timeline |
| Search | One search on every event screen (list, timelines, My plan); results jump to the hit and highlight it |
| Artist detail | Bottom-sheet (collapsed) or full-screen (expanded); bio, genre, country, set time and stage; jump to that slot on the timeline; search links to Spotify, TIDAL, Metal Archives, setlist.fm |
| Personal picks | Four states: not marked / maybe / must see / don't go (checked and skipped, so a band is never re-checked by mistake); a star tap shows a selector with all states. Local-first; works fully signed out |
| Notes | A private note per artist on the detail sheet; synced when signed in, never shared |
| Conflicts | Automatic overlap detection over "must see" picks, a red bar on the affected block, My plan's conflict titles and filter, and a detail sheet showing the whole clash group on the timeline's lanes |
| Lock-screen card | The band playing now, the next must-see with a countdown, and clashes: an iOS Live Activity (with Dynamic Island) and an Android ongoing notification |
| Lens | One global scope — *everything* / *my picks* / *a friend's picks* — applied to both the list and the timelines |
| Sharing | Mint a read-only share link for the current edition; friends are added by opening the link (universal/app link → deep link into the app); revocable |
| Account | Sign in with Google or Apple via Cognito; picks and notes then sync across devices |
| Languages | English and Czech, following the system language or chosen in Settings; the festival data follows the same language |
| Editions | Data is partitioned per festival edition (`ba2019`, `ba2022` … `ba2027` — no 2020/2021, both cancelled); switchable in Settings |
| Platforms | iOS, Android and web from one codebase; free rotation, phone/tablet/desktop layouts; UI state (last screen, per-day scroll position) restored across restarts |

Not there yet: server push for the iOS lock-screen card, reminders before a set starts, and
offline-first write queuing.

---

## Repository layout

```
app/
├── frontend/     Expo (React Native) app — iOS, Android, web
├── backend/      AWS Lambda handlers (TypeScript) + tests and API fixtures
├── infra/        AWS CDK stack — everything above is deployed from here
├── docs/         Design, build and run/test docs, split general / backend / frontend
└── CLAUDE.md     Coding conventions, enforced during AI-assisted work
```

[`docs/README.md`](docs/README.md) indexes every document.

Roughly 22k lines of TypeScript/TSX in the frontend (tests not counted) plus ~1.8k of native
Swift/Kotlin for the lock-screen card, ~1.2k in the Lambdas, plus the CDK stack; ~500 commits
since late March 2026.

---

## Architecture

```
   official                    this project (AWS, eu-central-1)                  clients
 ┌────────────────┐        ┌───────────────────────────────────────┐       ┌──────────────┐
 │ admin.         │  poll  │  sync Lambda ──▶ DynamoDB ◀── api     │       │  iOS app     │
 │ best4fest.app  │ ◀──────│  (EventBridge,   8 tables      Lambda │◀──────│  Android app │
 │  /changes  v2  │  read  │   hourly)                        ▲    │  HTTPS│  web (SPA)   │
 │  /artists  v3  │  only  │                                  │    │       └──────────────┘
 │  /schedule v3  │        │  CloudFront ─────────────────────┘    │              ▲
 └────────────────┘        │  (cache + custom domain + CORS)       │              │
                           │  Cognito user pool (Google, Apple)  ──┼──────────────┘
                           └───────────────────────────────────────┘
```

Two Lambdas, deliberately separated:

- **sync** — the only component that talks to the official API. Triggered by EventBridge (hourly);
  that schedule is its only trigger. It never serves user traffic.
- **api** — serves the app. Reads DynamoDB only. It never calls the official API, so an upstream
  outage degrades to "slightly stale data" rather than an error.

### Connection to the official backend

This is the part most worth reviewing, so it is spelled out:

- **Read-only, public endpoints only.** The sync Lambda calls exactly three official endpoints:
  `GET /api/v2/{slug}/changes`, `GET /api/v3/{slug}/artists`, `GET /api/v3/{slug}/schedule`
  (all with `?time=0`). Nothing is ever written back, and no authenticated official endpoint is
  touched.
- **Polling is cheap by design.** The steady-state cost is one `/changes` request per edition per
  hour, and only editions that have not ended yet are polled at all — `FESTIVAL_SLUGS` carries an
  ISO end timestamp per slug and a finished edition drops out of the run. The full datasets are fetched only when a monitored table's timestamp has actually
  advanced. `/changes` tables watched: `db_artist`, `db_artist_localized`, `db_schedule`,
  `db_schedule_category(_localized)`, `db_stage(_localized)`.
- **No client ever reaches the official API.** All app traffic terminates at CloudFront in front
  of our own API Gateway, so the official backend sees one machine, not a crowd — regardless of
  how many people use the app.
- **Full rebuild, no merge logic.** When a group is dirty, that dataset is rebuilt end-to-end from
  `?time=0` and stale rows are deleted. The official API stays the single source of truth; there
  is no divergent state to reconcile.
- **Normalization happens on our side.** The official `schedule.schedules[]` embeds artist and
  stage objects; they are extracted, de-duplicated and stored by ID reference, so the app joins
  locally. Artist/schedule IDs are not unique across editions, so every table is partitioned by
  slug.
- **Images are not copied.** `image_url` / `thumb_url` are passed through as-is, so artist and
  stage images are still loaded from the official CDN by the clients. Happy to change that (e.g.
  mirror them) if it is preferable.

If any of this is unwelcome — polling cadence, image hotlinking, anything else — it is a
configuration change on our side, not a redesign.

### Data model (DynamoDB, 8 tables)

| Table | Key | Notes |
|---|---|---|
| `ba-artists` | `slug` + `artistId` | Mirrors the official artist record, localized array kept |
| `ba-stages` | `slug` + `stageId` | Extracted from the embedded schedule payload |
| `ba-categories` | `slug` + `categoryId` | The timeline's vertical axis |
| `ba-events` | `slug` + `eventId` | Fully normalized: `dateFrom/dateTo` + artist/stage/category IDs |
| `ba-user-interests` | `userId` + `slug#artistId` | Per-edition picks, `updatedAt` drives merge resolution |
| `ba-user-notes` | `userId` + `slug#artistId` | Private per-artist notes (max 1000 characters), kept apart from picks so a share never exposes them |
| `ba-share-tokens` | `token` | Opaque token → `{userId, slug, label, avatarUrl}`, explicitly revocable |
| `ba-sync-state` | `slug` + `tableName` | Last official timestamp vs. last rebuild, per dataset |

### API surface

| Method | Path | Auth | Cache |
|---|---|---|---|
| GET | `/{slug}/artists`, `/categories`, `/stages` | — | CloudFront, 1 h |
| GET | `/{slug}/bios` | — | CloudFront, 1 h |
| GET | `/{slug}/schedule` | — | CloudFront, 5 min |
| GET | `/{slug}/validity` | — | CloudFront, 30 s |
| GET | `/share/{token}` | — | — |
| GET/PUT/DELETE | `/user/{slug}/schedule[/{artistId}]` | Cognito JWT | none |
| GET/PUT | `/user/{slug}/notes[/{artistId}]` | Cognito JWT | none |
| POST | `/{slug}/share`, DELETE `/share/{token}` | Cognito JWT | none |

The sync Lambda issues a CloudFront invalidation for the affected paths after a rebuild, so a
schedule change propagates in seconds rather than waiting out the TTL.

`/{slug}/artists` omits the per-language bio — roughly three quarters of the payload, and only read
on one screen. The bios come from `/{slug}/bios` instead, fetched for the whole edition alongside
the datasets rather than before them: the list paints on ~16 KiB while the bios follow, and every
one of them is still available offline. Per-artist fetching was measured and rejected — 260 requests
per user per populate costs far more in request charges than the bytes it saves.

`/{slug}/validity` deliberately takes no caller watermark, so every poller shares one cached
response and the client does the comparison itself. It reports `artistsSyncedAt` alongside
`lastSyncedAt` so the client can keep its cached bios through a schedule-only change.

Share links carry only an opaque 48-hex token; the display name and avatar attached to a share are
read server-side from Cognito with the caller's own access token, never accepted from the request
body.

### Auth

Cognito user pool with Google and Apple as identity providers, hosted UI + PKCE authorization code
flow (`expo-auth-session`), tokens in `expo-secure-store`. Signing in is optional throughout: picks
are stored locally first and only synced when an account exists.

---

## Frontend

Expo SDK 58 / React Native 0.88 (New Architecture), React 19, TypeScript, NativeWind (Tailwind) for
styling, React Navigation (drawer), Reanimated + `@gorhom/bottom-sheet` for the sheets. State is
React Context plus small stores read through `useSyncExternalStore`, with no external state
library. Festival logic without React lives in `src/lib/`, and a lint rule keeps imports pointing
one way (shell → screens → features → lib or ui → utils). The lock-screen card is a local Expo module
(Swift + Kotlin) that only draws what the TypeScript side computes.

Data flow is deliberately boring:

```
adapter (HTTP)  ──▶  cacheService (in-memory, single source for the UI)  ──useSyncExternalStore──▶  screens
        ▲                                   ▲
  background sync         AsyncStorage (festival data, picks, notes, friends, UI state)
```

- `src/adapters/*` are swappable fetchers behind one interface (`validate` / `populate`), so the
  backend origin is a single implementation, not a constant sprinkled across the app.
- `src/sync/backgroundSyncService.ts` checks `/{slug}/validity` first and skips the fetch entirely
  when nothing changed. The polling interval is festival-date aware — 3 minutes during the event,
  30 minutes outside it.
- Startup reads the persisted cache before the network, so a cold start with no connectivity opens
  on the last known schedule rather than an error screen. The freshness watermark is the server's
  own `lastSyncedAt`, stored beside the data it describes.
- The interest state and notes are local-first with `updatedAt` timestamps; on sign-in, local and
  cloud sets are merged by latest-write-wins per `slug#artistId`.
- The cache is a subscribable store: a component that reads it is subscribed automatically, and
  each sync run is its own instance, so switching edition mid-load cannot mix up two runs.

Two frontend problems were interesting enough to be written up in `docs/frontend/design/`, in case they are
useful elsewhere:

- **Progressive mount of the timeline.** A festival day is ~75 blocks over a canvas roughly nine
  screens wide, which blocked the JS thread for over a second on low-end Android at every day
  switch. The day is now mounted in slices, anchored at the offsets it is about to be shown at and
  grown by one viewport per frame, with memoised lanes and blocks so a settled day does no render
  work while scrolling.
- **Never counter-animate against scroll.** Anything that holds its position by animating against
  a sampled scroll offset lands a frame late and reads as jitter — worst on web, where DOM scroll
  events are asynchronous to the compositor. The pinned lane labels instead sit outside the
  horizontal scroller entirely, which makes the problem structurally impossible rather than
  merely smoothed.

Distributed builds go through EAS cloud builds. iOS is distributed ad-hoc by UDID (deliberately
not TestFlight at this size), Android as a plain APK, and the web build is a static export served
from `ba.janbambas.cz`. The iOS E2E suite runs on a local Release simulator build instead. Details,
including the deep-link `.well-known` files, are in `docs/frontend/build/`.

---

## Technologies

| Layer | Stack |
|---|---|
| App | Expo SDK 58, React Native 0.88, React 19, TypeScript, NativeWind/Tailwind, React Navigation, Reanimated 4, `@gorhom/bottom-sheet`, `expo-image`, `expo-localization`, AsyncStorage, `expo-secure-store` |
| Lock-screen card | Local Expo module: SwiftUI Live Activity (via `@bacons/apple-targets`), Kotlin ongoing notification |
| API | AWS Lambda (Node 22, ARM64) + API Gateway HTTP API, bundled with esbuild |
| Data | DynamoDB (on-demand billing, 8 tables) |
| Edge | CloudFront (per-path cache policies, custom domain, ACM certificate) |
| Auth | Cognito user pool + identity pool, Google & Apple IdPs, hosted UI, PKCE |
| Scheduling | EventBridge rule → sync Lambda |
| Infra | AWS CDK v2 (TypeScript), one stack, least-privilege IAM |
| Tests, backend | Jest — unit tests over real API fixtures, sync-handler tests with mocked I/O, integration tests against in-memory DynamoDB |
| Tests, frontend | Jest + React Native Testing Library (unit and screen tests, element budgets), Reassure render-count and timing gate, Playwright web E2E, Maestro E2E on the iOS Simulator (29 flows), a scripted performance run on Android devices |
| CI | GitHub Actions: types, lint, unit tests, web E2E and an advisory performance job on every frontend push |
| Builds | EAS cloud builds (iOS ad-hoc, Android APK, web static export); local Release simulator build for iOS E2E |

Everything runs in `eu-central-1` except the CloudFront certificate (`us-east-1`, as required).
No secrets are committed: keystores, provisioning profiles and `credentials.json` live outside the
repository.

---

## Running it

```bash
# frontend
cd frontend && npm install
npm run start:web      # or: npm run start:sim:ios, npm run start:device:ios
npm test               # types, lint, unit, web E2E, about a minute (see docs/frontend/instructions/testing.md)
npm run verify         # adds expo-doctor, performance gate and the iOS Simulator E2E

# backend
cd backend && npm install
npm test               # unit + mocked I/O
npm run test:integration
npm run typecheck

# infra
cd infra && npm install
npx cdk diff && npx cdk deploy
```

Full deployment runbook (ACM certificate, DNS, first-deploy ordering) is in
`docs/backend/build/deployment.md`; native build and credential setup in `docs/frontend/build/`.

---

## How this was built

The project is written almost entirely with AI assistance — Claude Code (Anthropic's agentic CLI)
driving the edits, with me as designer, reviewer and the one who says no. It is not "generated
code"; the working method matters, and it is visible in the repository:

- **Documents are the source of truth, and they are kept current.** `docs/` is a living brief,
  not a historical artifact: architecture decisions, the data model, and the non-obvious layout and
  rendering rules are written down *and updated* whenever the code moves. `CLAUDE.md` holds the
  coding conventions the agent must follow (adapter/data-source separation, mandatory
  cross-file impact checks after multi-file changes, one source per piece of information on
  screen, urgent vs deferred updates, the import direction, `useCallback`/`useMemo` discipline
  inside context providers, bracing and ternary rules). New work starts by reading them.
- **Tests first for behaviour changes.** A change in behaviour starts with a test that is shown to
  fail for the expected reason; expected values are written by hand, never computed by the code
  under test.
- **Decisions are approved before implementation.** Where a design choice has real consequences,
  it gets discussed and agreed first; the agent is explicitly not allowed to pick an approach on
  its own and present it as done.
- **Small, single-purpose commits.** ~500 of them, each one thing, with a scope prefix
  (`feat(frontend)`, `fix(frontend)`, `opt(frontend)`, `security fix(frontend)`) — which is what
  makes reviewing AI-written changes tractable at all.
- **Specialised review agents.** Project agents re-check the React code for unnecessary
  re-renders and for dead code after commits; the backend is covered by three test layers so the
  sync logic can be changed without guessing.
- **The hard parts were still reasoned about by hand.** The scroll-jitter analysis, the
  progressive-mount design, the bottom-sheet-across-rotation bug and the CloudFront behaviour
  ordering are all documented with *why*, because those are exactly the places where an agent will
  otherwise "fix" something back into being broken.

The comments in the codebase follow the same rule: they explain the reasoning that is not
recoverable from the code, and nothing else.

---

## Current state and what is next

Beta. In practical terms:

- The full flow works end-to-end on iOS, Android and web: browse, search, star, plan the day,
  detect conflicts, take notes, sign in, share, follow a friend, and follow the day from the lock
  screen.
- A cold start works offline: the app loads the cache saved on the device first and only then
  checks the server, and the freshness check skips data that has not changed (see
  `docs/frontend/design/architecture/cache-freshness.md`).
- The UI is in English and Czech, over the EN/CS festival data.
- The app is on Expo SDK 58.
- **Missing: reliability of the iOS lock-screen card.** The card's content is computed on the device
  and handed to iOS for the whole day, but iOS does not reliably redraw a Live Activity at the
  planned switch times while the phone is locked, so the card can go stale until the app is opened.
  The fix is designed: a server-side replayer that sends ActivityKit pushes at each switch, with no
  festival logic on the server. Until it ships, the iOS card is not reliable enough to depend on.
  The Android card schedules its own updates and is not affected.


Ideas beyond that, in decreasing order of confidence: reminders before a set starts, native
Google/Apple sign-in instead of the web flow, syncing shared and accepted links across devices,
richer friend groups, and — only if the BA side ever finds it interesting — integration with the
modules the official app owns, so this stays a complement rather than a fork.

---

## A note on scope and trademarks

"Brutal Assault" and the festival's artwork belong to the festival. This app uses the name only to
describe what it is, is distributed to a handful of testers, and is not published to any store.
Feedback, objections, or a request to change any of the above are all welcome — including on the
technical choices, which is really the point of sharing the repository.
