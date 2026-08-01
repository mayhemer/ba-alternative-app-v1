# Brutal Assault — alternative app

An unofficial, BA-specific companion app for the Brutal Assault festival: lineup, schedule,
personal picks, schedule conflicts and sharing with friends. One codebase for iOS, Android and
web.

**Status: alpha.** It runs, it is used on real devices, and it is not finished. It is a personal
project, hosted on a private AWS account and domain, not affiliated with or endorsed by the
festival.

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
  marked on the blocks themselves, and listed on their own screen with a mini-timeline detail.
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
| Lineup | Alphabetical artist list with section separators, name search, photo/genre/country, star control |
| Timeline | 2D scroll canvas, category lanes, proportional blocks, NOW line, day switcher, day boundary at 06:00 so after-midnight sets stay on "their" day |
| Support stages | A second timeline for non-playable/supporting entries, with sub-rows for stage-level overlaps |
| Artist detail | Bottom-sheet (collapsed) or full-screen (expanded); bio, genre, country, set time and stage; jump to that slot on the timeline; search links to Spotify, TIDAL, Metal Archives, setlist.fm |
| Personal picks | Three states — none / maybe / must see. Local-first; works fully signed out |
| Conflicts | Automatic overlap detection over "must see" picks, a red bar on the affected block, a dedicated screen and a detail sheet showing the clash on a mini timeline |
| Lens | One global scope — *everything* / *my picks* / *a friend's picks* — applied to both the list and the timelines |
| Sharing | Mint a read-only share link for the current edition; friends are added by opening the link (universal/app link → deep link into the app); revocable |
| Account | Sign in with Google or Apple via Cognito; picks then sync across devices |
| Editions | Data is partitioned per festival edition (`ba2024`, `ba2025`, `ba2026`); switchable in Settings |
| Platforms | iOS, Android and web from one codebase; free rotation, phone/tablet/desktop layouts; UI state (last screen, per-day scroll position) restored across restarts |

Not there yet: localization (the UI is English-only, although the data carries EN/CS), push
notifications/reminders, and offline-first write queuing.

---

## Repository layout

```
app/
├── frontend/     Expo (React Native) app — iOS, Android, web
├── backend/      AWS Lambda handlers (TypeScript) + tests and API fixtures
├── infra/        AWS CDK stack — everything above is deployed from here
├── DESIGN.md     Product/architecture brief: data model, endpoints, sync design, layout rules
├── FRONTEND.md   Frontend dev, EAS builds, credentials, deep-link setup
├── BACKEND.md    Deployment runbook (certificates, DNS, cdk deploy)
└── CLAUDE.md     Coding conventions, enforced during AI-assisted work
```

`frontend/DESIGN.md` holds the UX decisions (navigation, interest states, timeline behaviour) and
`frontend/ARCHITECTURE.md` the original frontend architecture agreement — kept as written, so the
starting assumptions stay visible next to what the code became.

Roughly 8k lines of TypeScript/TSX in the frontend, ~1.5k in the Lambdas, plus the CDK stack;
~200 commits since late March 2026.

---

## Architecture

```
   official                    this project (AWS, eu-central-1)                  clients
 ┌────────────────┐        ┌───────────────────────────────────────┐       ┌──────────────┐
 │ admin.         │  poll  │  sync Lambda ──▶ DynamoDB ◀── api     │       │  iOS app     │
 │ best4fest.app  │ ◀──────│  (EventBridge,   7 tables      Lambda │◀──────│  Android app │
 │  /changes  v2  │  read  │   hourly)                        ▲    │  HTTPS│  web (SPA)   │
 │  /artists  v3  │  only  │                                  │    │       └──────────────┘
 │  /schedule v3  │        │  CloudFront ─────────────────────┘    │              ▲
 └────────────────┘        │  (cache + custom domain + CORS)       │              │
                           │  Cognito user pool (Google, Apple)  ──┼──────────────┘
                           └───────────────────────────────────────┘
```

Two Lambdas, deliberately separated:

- **sync** — the only component that talks to the official API. Triggered by EventBridge (hourly)
  and manually via `POST /sync`. It never serves user traffic.
- **api** — serves the app. Reads DynamoDB only. It never calls the official API, so an upstream
  outage degrades to "slightly stale data" rather than an error.

### Connection to the official backend

This is the part most worth reviewing, so it is spelled out:

- **Read-only, public endpoints only.** The sync Lambda calls exactly three official endpoints:
  `GET /api/v2/{slug}/changes`, `GET /api/v3/{slug}/artists`, `GET /api/v3/{slug}/schedule`
  (all with `?time=0`). Nothing is ever written back, and no authenticated official endpoint is
  touched.
- **Polling is cheap by design.** The steady-state cost is one `/changes` request per edition per
  hour. The full datasets are fetched only when a monitored table's timestamp has actually
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

### Data model (DynamoDB, 7 tables)

| Table | Key | Notes |
|---|---|---|
| `ba-artists` | `slug` + `artistId` | Mirrors the official artist record, localized array kept |
| `ba-stages` | `slug` + `stageId` | Extracted from the embedded schedule payload |
| `ba-categories` | `slug` + `categoryId` | The timeline's vertical axis |
| `ba-events` | `slug` + `eventId` | Fully normalized: `dateFrom/dateTo` + artist/stage/category IDs |
| `ba-user-interests` | `userId` + `slug#artistId` | Per-edition picks, `updatedAt` drives merge resolution |
| `ba-share-tokens` | `token` | Opaque token → `{userId, slug, label, avatarUrl}`, explicitly revocable |
| `ba-sync-state` | `slug` + `tableName` | Last official timestamp vs. last rebuild, per dataset |

### API surface

| Method | Path | Auth | Cache |
|---|---|---|---|
| GET | `/{slug}/artists`, `/categories`, `/stages` | — | CloudFront, 1 h |
| GET | `/{slug}/schedule` | — | CloudFront, 5 min |
| GET | `/{slug}/validity/{time}` | — | — |
| GET | `/share/{token}` | — | — |
| POST | `/sync` | — | manual sync trigger (async invoke) |
| GET/PUT/DELETE | `/user/{slug}/schedule[/{artistId}]` | Cognito JWT | none |
| POST | `/{slug}/share`, DELETE `/share/{token}` | Cognito JWT | none |

The sync Lambda issues a CloudFront invalidation for the affected paths after a rebuild, so a
schedule change propagates in seconds rather than waiting out the TTL.

Share links carry only an opaque 48-hex token; the display name and avatar attached to a share are
read server-side from Cognito with the caller's own access token, never accepted from the request
body.

### Auth

Cognito user pool with Google and Apple as identity providers, hosted UI + PKCE authorization code
flow (`expo-auth-session`), tokens in `expo-secure-store`. Signing in is optional throughout: picks
are stored locally first and only synced when an account exists.

---

## Frontend

Expo SDK 54 / React Native 0.81 (New Architecture enabled), TypeScript, NativeWind (Tailwind) for
styling, React Navigation (drawer), Reanimated + `@gorhom/bottom-sheet` for the sheets, plain React
Context + `useReducer` for state — no external state library.

Data flow is deliberately boring:

```
adapter (HTTP)  ──▶  cacheService (in-memory, single source for the UI)  ──▶  React contexts  ──▶  screens
        ▲                                   ▲
  background sync                   AsyncStorage (picks, friends, UI state)
```

- `src/adapters/*` are swappable fetchers behind one interface (`validate` / `populate`), so the
  backend origin is a single implementation, not a constant sprinkled across the app.
- `src/sync/backgroundSyncService.ts` checks `/{slug}/validity/{lastSyncTime}` first and skips the
  fetch entirely when nothing changed. The polling interval is festival-date aware — 1 minute
  during the event, 30 minutes outside it.
- The interest state is local-first with `updatedAt` timestamps; on sign-in, local and cloud sets
  are merged by latest-write-wins per `slug#artistId`.

Two frontend problems were interesting enough to be written up in `DESIGN.md`, in case they are
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

Builds go through EAS cloud builds. iOS is distributed ad-hoc by UDID (deliberately not TestFlight
at this size), Android as a plain APK, and the web build is a static export served from
`ba.janbambas.cz`. Details, including the deep-link `.well-known` files, are in `FRONTEND.md`.

---

## Technologies

| Layer | Stack |
|---|---|
| App | Expo SDK 54, React Native 0.81, React 19, TypeScript, NativeWind/Tailwind, React Navigation, Reanimated 4, `@gorhom/bottom-sheet`, `expo-image`, AsyncStorage, `expo-secure-store` |
| API | AWS Lambda (Node 22, ARM64) + API Gateway HTTP API, bundled with esbuild |
| Data | DynamoDB (on-demand billing, 7 tables) |
| Edge | CloudFront (per-path cache policies, custom domain, ACM certificate) |
| Auth | Cognito user pool + identity pool, Google & Apple IdPs, hosted UI, PKCE |
| Scheduling | EventBridge rule → sync Lambda |
| Infra | AWS CDK v2 (TypeScript), one stack, least-privilege IAM |
| Tests | Jest — unit tests over real API fixtures, sync-handler tests with mocked I/O, integration tests against in-memory DynamoDB |
| Builds | EAS cloud builds (iOS ad-hoc, Android APK, web static export) |

Everything runs in `eu-central-1` except the CloudFront certificate (`us-east-1`, as required).
No secrets are committed: keystores, provisioning profiles and `credentials.json` live outside the
repository.

---

## Running it

```bash
# frontend
cd frontend && npm install
npm run web            # or: npm start, npm run ios:device
npm run tscheck        # strict type check, no unused locals/params

# backend
cd backend && npm install
npm test               # unit + mocked I/O
npm run test:integration
npm run typecheck

# infra
cd infra && npm install
npx cdk diff && npx cdk deploy
```

Full deployment runbook (ACM certificate, DNS, first-deploy ordering) is in `BACKEND.md`; native
build and credential setup in `FRONTEND.md`.

---

## How this was built

The project is written almost entirely with AI assistance — Claude Code (Anthropic's agentic CLI)
driving the edits, with me as designer, reviewer and the one who says no. It is not "generated
code"; the working method matters, and it is visible in the repository:

- **Documents are the source of truth, and they are kept current.** `DESIGN.md` is a living brief,
  not a historical artifact: architecture decisions, the data model, and the non-obvious layout and
  rendering rules are written down *and updated* whenever the code moves. `CLAUDE.md` holds the
  coding conventions the agent must follow (adapter/data-source separation, mandatory
  cross-file impact checks after multi-file changes, `useCallback`/`useMemo` discipline inside
  context providers, bracing and ternary rules). New work starts by reading them.
- **Decisions are approved before implementation.** Where a design choice has real consequences,
  it gets discussed and agreed first; the agent is explicitly not allowed to pick an approach on
  its own and present it as done.
- **Small, single-purpose commits.** ~200 of them, each one thing, with a scope prefix
  (`feat(frontend)`, `fix(frontend)`, `opt(frontend)`, `security fix(frontend)`) — which is what
  makes reviewing AI-written changes tractable at all.
- **Specialised review agents.** Repo-local agents re-check the React code for unnecessary
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

Alpha. In practical terms:

- The full flow works end-to-end on iOS, Android and web: browse, star, detect conflicts, sign in,
  share, follow a friend.
- The startup path now loads from a persisted cache first and only then checks the server, so a cold
  start works offline and the freshness check actually skips unchanged data (see *Client-side cache
  and freshness* in `DESIGN.md`).
- What remains in that area is known and written down rather than fixed: the festival cache lives
  outside React and is bridged to it by a hand-rolled event emitter, so a consumer that forgets to
  subscribe silently reads stale data; and the sync service is a module singleton, which leaves a
  narrow race on edition switching. Both are scheduled after the festival, deliberately not before.
- Localization is not done — English UI over EN/CS data.
- Android app-link verification needs the release keystore fingerprint published before deep links
  verify on Android.
- Expo SDK upgrade and a proper beta round are the next planned steps.

Ideas beyond that, in decreasing order of confidence: reminders/push before a set starts, richer
friend groups, and — only if the BA side ever finds it interesting — integration with the modules
the official app owns, so this stays a complement rather than a fork.

---

## A note on scope and trademarks

"Brutal Assault" and the festival's artwork belong to the festival. This app uses the name only to
describe what it is, is distributed to a handful of testers, and is not published to any store.
Feedback, objections, or a request to change any of the above are all welcome — including on the
technical choices, which is really the point of sharing the repository.
