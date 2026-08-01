# Brutal Assault Festival App — Design Brief

## Overview

A cross-platform festival schedule app (iOS, Android, Web) reimplementing the Brutal Assault
festival experience. Users can browse the public schedule, build a personal schedule, and share
it with friends. Designed for easy adoption via anonymous access with seamless upgrade to a
full account.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Expo (React Native) — single codebase for iOS, Android, Web |
| Auth | AWS Cognito (Google, Facebook, Apple ID, Anonymous) |
| API | AWS API Gateway + Lambda (Node.js / TypeScript) |
| Database | Amazon DynamoDB |
| Cache | Amazon CloudFront (HTTP response cache) + DynamoDB fallback |
| Background sync | AWS EventBridge (scheduler) + Sync Lambda |
| Infrastructure | AWS CDK (TypeScript) |
| Web hosting | Operator's own server |

---

## Features — V1 Scope

### Public Schedule
- Browse full festival schedule as a **horizontal timeline**
  - X axis: time
  - Y axis: categories (stages / event types) — one row per category
  - Band slots rendered as blocks spanning dateFrom → dateTo
- Browse full **lineup** (band list)
- Tap a band → detail view (name, time slot, stage, user status)
  - Tap the event's stage/time → jump to that slot on the timeline (selects its day, centers its time; main vs support timeline per the band)
  - If the slot overlaps another Will-Go pick, tap the conflict warning line → conflict detail (only that line, not the whole slot)

### Personal Schedule
- Per-band status: **Will Go** | **Maybe**
- Works fully in **anonymous mode** (stored locally, with `updatedAt` timestamp)
- On login: local data **merges with cloud** — conflict resolved by latest `updatedAt` wins
- Cross-device **sync** when logged in
- Toggle timeline view: full schedule ↔ my schedule only

### Auth
- Anonymous access — no account required, local-first
- Social login: Google, Facebook, Apple ID (via AWS Cognito)
- Anonymous → login migration with timestamp-based merge

### Sharing (V1)
- Generate a **secret link** → read-only view of a user's personal schedule
- Link contains an opaque share token (not userId)
- Token stored in DynamoDB with optional expiry

### Future Features (architecture must support, not built in V1)
- Conflict detection — flag overlapping "Will Go" slots
- Push notifications / reminders before a set starts
- Friends' schedules — follow another user's personal schedule
- Overlay a friend's schedule on top of your own in the timeline
- Offline mode — full local-first data layer, sync on reconnect
- Share with a specific account (not just a secret link)
- Band genre / bio / media

---

## Layout, Orientation & App Chrome

The app rotates freely (`app.json` → `orientation: "default"`) on phones, tablets and web. There
is no orientation library and no per-screen lock; every screen reflows.

### Layout mode

`src/hooks/useLayoutMode.ts` is the single source of responsive truth. Breakpoints test a
**dimension, never width alone** — a landscape phone is wide (844 pt) but not roomy, and treating
it as a desktop hands it a permanent drawer and zero padding.

| Flag | Test | Drives |
|------|------|--------|
| `isWide` | `min(width, height) ≥ 600` | Permanent drawer, hamburger hidden, right-pinned lens panel, expanded artist sheet |
| `isShort` | `height < 500` | TopBar hidden, its controls move to the BottomBar |
| `contentPadding` | `isWide ? 0 : 16` | Horizontal padding for centred content |

`isWide` is false for a phone in **either** orientation and true for tablets and desktop windows.
It also keeps an iPad in a narrow Split View column on the compact layout.

Separately, `MAX_CONTENT_WIDTH` (700) caps centred content so a desktop window stays readable.

### Chrome layout

`AppShell` is a plain flex column inside a `SafeAreaView` on all four edges — landscape needs
`left`/`right` or content sits under a notched phone's sensor housing:

```
{!isShort && <TopBar />}
<View flex-1>
  navigator
  <LensPanel />                 ← absolute, inset 0
  {isShort && <BottomBar />}    ← absolute, floats over the content
</View>
{!isShort && <BottomBar />}     ← in-flow, solid
```

**On short viewports the TopBar is simply not rendered.** No overlay, no animation, no scroll
coupling — the layout below it is untouched and the timeline keeps its original geometry. This buys
the timeline a permanent 56 pt rather than the scroll-dependent amount a collapsing bar would.

Its two controls move into the BottomBar instead, which becomes a three-slot row when `isShort`:
`DrawerButton` left, the screen's `bottomBar.ContentComponent` in the centre, the screen's
`topBar.RightComponent` right. `BottomBar` reads both off `ScreenUIContext`, so **no screen needs
to know about this** — `useTopBar({ RightComponent })` keeps working unchanged. The bar, which
normally renders `null` when a screen contributes no content, also renders when `isShort` so that
Conflicts and Settings still get a hamburger.

The centre slot is capped at `DAY_SWITCHER_MAX_FRACTION` (40 %) of the viewport width — stretched
across an 844 pt landscape phone the day buttons look out of proportion. `DaySwitcher` needs no
knowledge of this: it is already `width: '100%'`, `alignSelf: 'center'`, capped at
`CONTENT_MAX_WIDTH`, so it fills whatever slot it is given.

### Floating BottomBar (short viewports)

When `isShort` the bar leaves the flex column and is absolutely anchored to the bottom *inside* the
content view, so lanes and list rows show through beneath it — worth roughly another 60 pt of
timeline. It drops its `bg-surface` and top border in favour of a `LinearGradient`
(`expo-linear-gradient`) fading transparent → `colors.background` behind the row: the day buttons
carry their own opaque backgrounds, but the bare hamburger and lens icons need the scrim to stay
legible over a bright lane block.

Note the two mount points are **not interchangeable**. The in-flow bar stays a *sibling* of the
content view rather than being nested inside it, because `LensPanel` is `position: absolute;
inset: 0` within that view — nesting would newly draw the lens backdrop over the DaySwitcher.

Screens whose content scrolls must clear the floating bar. `useLayoutMode().bottomClearance` gives
`BOTTOM_OVERLAY_CLEARANCE` when short and `0` otherwise; it is added to the bottom padding of the
four scrollers (`TimelineView`'s canvas, `ArtistListScreen`'s `SectionList`, `ConflictsScreen`,
`SettingsScreen`) and subtracted from `LensPanel`'s `maxHeight`. It is deliberately a generous
constant rather than the bar's measured height — the clearance only has to be *at least* the bar
height, and a few extra px at the end of a scroll are invisible, whereas coupling the two would
mean either pinning the bar to a fixed height (risking a clipped `DaySwitcher`) or plumbing an
`onLayout` measurement through a context.

`DrawerButton` (`src/components/layout/DrawerButton.tsx`) is shared between the two bars rather
than duplicated: it carries the coupling that opening the drawer dismisses the lens panel — the
counterpart to the same rule in `LensChip`. It renders nothing when `isWide`, where the drawer is
permanent.

`LeftComponent` exists in `TopBarConfig` but no screen sets it; the BottomBar ignores it.

### Overlays across rotation

`ArtistDetailSheet`'s `snapPoints` are re-measured when the viewport changes, so they **must keep a
constant length**. `snapToIndex` is called imperatively from an effect, and `@gorhom/bottom-sheet`
does not adopt a new `snapPoints` prop until after the render commits — an index valid only for the
new array throws `'index' was provided but out of the provided snap points range`. Both stops
therefore always exist; only their sizes change. For the same reason that effect is keyed on
`detailState` alone, never on `snapPoints`: the sheet re-snaps itself when they change.

The collapsed stop is sized in points, not a percentage — `'40%'` of a landscape phone is ~150 px,
barely the title row. It is floored at 260 px and capped at 75 % of the viewport.

Both sheets are in the tree **only while they have something to show**, which `useBottomSheetMount`
(`src/hooks/useBottomSheetMount.ts`) arranges. A mounted-but-closed sheet does not survive a
rotation: `@gorhom/bottom-sheet` (through 5.2.14) never re-evaluates a closed sheet's resting
position when its container is resized, because `getEvaluatedPosition` ends at
`detents[currentIndex]` and the closed index is `-1`, so `evaluatePosition` bails on the resulting
`undefined`. A sheet closed in landscape stays parked at the landscape container height, which after
a rotation to portrait sits half-way up the far taller container — an empty grey panel. (Portrait →
landscape hides the flaw: the stale, larger height is below the shorter container.) Opening is
therefore expressed as the sheet's mount `index`, not `snapToIndex`, since a freshly mounted sheet
drops `snapToIndex` until its first layout; the unmount waits for `onClose` so the slide-down still
plays when the detail is dismissed from code rather than by gesture.

`enableDynamicSizing` — on by default — is off on both sheets: it splices a content-sized stop into
`detents` and re-sorts, so with short content index 1 stops being `'100%'` and mounting at a fixed
index lands on the wrong stop.

### Landscape trade-off on the timeline

Landscape roughly doubles the visible time span but costs lane height. After BottomBar, ruler and
safe areas a 390 pt viewport shows ~2.5 category lanes rather than 4–5 — dropping the TopBar is
what keeps that from being ~2.

`LANE_HEIGHT` stays fixed: it is read by `ArtistBlock`, `NowLine`, the cached sub-row layout behind
`cacheService.getCategoryDayLayout` and the mini timeline in `ConflictDetailSheet`, so making it
viewport-dependent is a far wider change than it appears.

`STRIP_HEIGHT` is the cheap one, and landscape does drop it. It has four consumers, all inside the
timeline — `useTimelineData` (`laneOffsets`, `canvasHeight`), `CategoryLane` (spacer, `NowLine`
span), `LaneLabelOverlay` (title box) and `TimelineView` (the mount window's `laneBottom`) — so
`stripHeightFor(isShort)` in `timelineLayout.ts` is the single switch, and every one of them derives
from it rather than branching itself. On a short viewport it returns 0 and the category title is
drawn *behind* its lane instead of in a strip above it, buying back 32 pt per lane — about one extra
lane on a landscape phone. The trigger is `useLayoutMode().isShort`, the same flag that drops the
TopBar, so a landscape iPad keeps the strips: it has the vertical budget to spare.

Overlaying means the title has to paint *under* the blocks, which sets the layer order in
`TimelineView`: `LaneLabelOverlay` renders before the horizontal scroller, and both the strip spacer
and the events row are transparent so it shows through. The lane band's colour therefore lives on a
single backdrop `View` behind both — one background instead of a per-mode colour on each row, and
identical in portrait because `stripBg`, `laneBg` and `surface` are the same value. That backdrop is
sized to `laneStackHeight`, not left to fill its parent: the wrapper it sits in also spans the
canvas's bottom padding, which would tint the dead space under the last lane.

That padding is worth understanding before touching it. `Math.max(30 + bottomClearance, areaHeight -
canvasHeight)` covers two unrelated needs — the usual floating-BottomBar clearance, and keeping the
canvas at least viewport-tall. The canvas is the *horizontal* scroller's content, so the second term
is what lets a horizontal drag below the last lane still pan the timeline when a day has only a
couple of lanes.

### Timeline rendering: never counter-animate against scroll

**Nothing in the timeline may hold its position by animating against the scroll offset.** Every
route to that offset — `useAnimatedScrollHandler`, Reanimated's `useScrollOffset` — reads sampled
scroll *events*, and events are not synchronised to the frame in which the scrolled content is
composited. The correction therefore always lands a frame behind, which reads as jitter: mild on a
fast phone, obvious on slow devices, and worst on web, where DOM scroll events are asynchronous to
the compositor. This is structural, not a tuning problem.

The fix is always to remove the scroll dependency rather than to smooth it. `TimelineView` nests the
horizontal `Animated.ScrollView` *inside* the vertical `ScrollView`, which gives a useful seam:

> anything mounted as a sibling of the horizontal scroller scrolls vertically with the lanes but is
> immune to horizontal scroll by construction — there is nothing to animate, so nothing can lag.

`LaneLabelOverlay` uses exactly that seam to pin category titles to the viewport's left edge. It
replaced a per-lane `useAnimatedStyle` that counter-translated each title by
`scrollX + VIEW_OFFSET_X`, which jittered.

The cost is that an overlay sits outside the lanes and so cannot infer positions from layout: it has
to be told where each strip is, and in landscape how tall each lane is too. `useTimelineData`'s
`laneOffsets` owns that accumulation, next to the identical one behind `canvasHeight`, so the lane
stack's geometry has a single owner and cannot drift when sub-rows change a lane's height or when
the strip collapses. Any future left- or top-pinned timeline chrome should follow the same pattern.

Note this seam does **not** help with anything whose *content* depends on scroll position — e.g. a
sticky title on a long event, where which title to show changes as you scroll. Those need a design
with no continuous scroll dependency at all (repeating the label at fixed intervals, say), not a
smoother animation.

---

## Multi-Edition / Multi-Festival Support

The official API serves multiple festivals and multiple annual editions of the same festival.
Each edition is identified by a **festival slug** (e.g. `brutal-assault-2025`, `brutal-assault-2026`).
Artist and schedule IDs are **not unique across slugs** — the same numeric ID can appear in different editions.

All public data is therefore partitioned by slug. The frontend targets a single festival
(`brutal-assault`) but can switch between annual editions.

---

## Data Model

### DynamoDB Tables

#### `artists`
```
PK: slug      (string)   — e.g. "brutal-assault-2025"
SK: artistId  (string)   — official numeric id, stringified
---
name        string
isPlayable  boolean
imageUrl    string
thumbUrl    string
url         string   (website / Facebook)
localized   list     — [{ language: "EN"|"CS", name: string, content: string, genre: string, country: string }]
```

#### `stages`
```
PK: slug     (string)
SK: stageId  (string)
---
imageUrl    string
thumbUrl    string
localized   list     — [{ language: "EN"|"CS", name: string }]
```

#### `categories`
```
PK: slug         (string)
SK: categoryId   (string)
---
color       number   (raw integer from official API; -1 = no color)
localized   list     — [{ language: "EN"|"CS", title: string }]
```

#### `events`
```
PK: slug     (string)
SK: eventId  (string)
---
dateFrom      number   (Unix ms UTC)
dateTo        number   (Unix ms UTC)
artistId      string   → ref to artists (scoped to same slug)
categoryId    string   → ref to categories (scoped to same slug)
stageId       string   → ref to stages (scoped to same slug)
```

> Events are fully normalized — no embedded copies of artist/category/stage data.
> The app joins locally after fetching all datasets for a given slug.

#### `userInterests`
```
PK: userId          (string)   — Cognito sub or anonymous UUID
SK: slug#artistId   (string)   — composite; scopes interest to a specific edition
---
status       string    (will_go | maybe)
updatedAt    number    (Unix ms UTC)  ← used for merge conflict resolution
```

#### `shareTokens`
```
PK: token    (string)   — opaque random token
---
userId       string
slug         string   — the edition this share covers
createdAt    number
```
No automatic expiry. User explicitly revokes via DELETE /share/:token.

#### `syncState`
```
PK: slug        (string)   — festival slug
SK: tableName   (string)   — "artists" | "stages" | "categories" | "schedule"
---
lastOfficialUpdate   number   (Unix ms — from official /changes endpoint)
lastSyncedAt         number   (Unix ms — when we last rebuilt this table)
dataVersion          string   (hash or counter — for cache busting)
```

---

## API Endpoints (your AWS API Gateway)

| Method | Path | Description |
|---|---|---|
| GET | /:slug/artists | Full cleaned artist list for this edition |
| GET | /:slug/categories | Full category list for this edition |
| GET | /:slug/stages | All stages for this edition |
| GET | /:slug/schedule | All events for this edition (normalized, ID refs only) |
| GET | /:slug/validity/:time | Returns whether data has changed since client's last fetch |
| GET | /user/:slug/schedule | Authenticated user's interests for this edition |
| PUT | /user/:slug/schedule/:artistId | Set status for a band in this edition |
| DELETE | /user/:slug/schedule/:artistId | Remove status for a band in this edition |
| POST | /:slug/share | Generate a share token for this edition |
| GET | /share/:token | Read-only personal schedule via token |
| DELETE | /share/:token | Revoke share token (authenticated, must own token) |

All read endpoints for public data (`/:slug/artists`, `/:slug/schedule`, etc.) are served via **CloudFront**
with short TTLs. User endpoints bypass CloudFront (auth required, personalized).

> **CloudFront cache paths** use `/:slug/artists`, `/:slug/schedule`, etc. The slug is part of the
> cache key, so editions are cached independently.

---

## Official API Integration

### Source Endpoints (proxied, never exposed to frontend)

Base URL: `https://admin.best4fest.app`

```
GET /api/v2/{slug}/changes?time=0
GET /api/v3/{slug}/artists?time=0
GET /api/v3/{slug}/schedule?time=0    → contains: schedules[], categories[]
```

Note: `/changes` is at v2; `/artists` and `/schedule` are at v3.
Official slugs map directly to our DynamoDB `slug` key (e.g. `ba2026`, `ba2025`) — no remapping.

### `/changes` Response Shape

Returns an array of objects, one per internal DB table:
```json
[
  { "id": 2, "table": "db_artist",                      "time": 1754648838000, "count": 260 },
  { "id": 3, "table": "db_artist_localized",             "time": 1754648838000, "count": 520 },
  { "id": 19, "table": "db_schedule",                   "time": 1754648838000, "count": 311 },
  { "id": 20, "table": "db_schedule_category",          "time": 1754648838000, "count": 16  },
  { "id": 21, "table": "db_schedule_category_localized","time": 1754648838000, "count": 32  },
  { "id": 22, "table": "db_stage",                      "time": 1754648838000, "count": 13  },
  { "id": 23, "table": "db_stage_localized",            "time": 1754648838000, "count": 26  }
]
```

### Tables We Monitor

| Official table(s) | Triggers rebuild of | Our endpoint |
|---|---|---|
| `db_artist`, `db_artist_localized` | artists | /artists |
| `db_schedule`, `db_schedule_category`, `db_schedule_category_localized` | schedule + categories | /schedule, /categories |
| `db_stage`, `db_stage_localized` | stages | /stages |

### Key Observations
- `?time=0` returns the full dataset — we always use this (full rebuild, no incremental merging)
- `/changes` is polled to detect when any monitored table's `time` has advanced
- We store the max `time` seen across all monitored tables in `syncState`
- When any monitored table is dirty, we rebuild **all** our datasets (simplest correctness guarantee)
- No merge logic needed: official API is always the single source of truth

### Official Data Notes
- `schedule.schedules[]` embeds artist and stage data redundantly — we normalize this
- `schedule.categories[]` is the vertical grid axis (not the stage description)
- `stage` object on each event is often redundant — we extract stages separately and reference by ID

---

## Sync Architecture

### Two Lambdas

#### Sync Lambda (background, no user traffic)
Triggered by **EventBridge Scheduler**:
- Every 5 minutes during the festival
- Every 1 hour off-season

Flow:
```
1. GET official /changes
2. Read syncState from DynamoDB for selected tables (TBD)
3. For each dirty table (lastOfficialUpdate != lastSyncedAt):
   a. GET official /<endpoints>?time=lastSyncedAt (or time=0) for all endpoints we need (artists, schedule)
   b. Process + normalize data
   c. Overwrite DynamoDB table (BatchWrite — full rebuild, no merge)
   d. Invalidate CloudFront for affected paths
   e. Update syncState (lastSyncedAt, dataVersion)
4. If nothing dirty → exit, nothing written
```

#### API Lambda (user-facing)
- Reads from DynamoDB only — never hits the official API
- Always fast; resilient to official API downtime
- Returns `dataVersion` + `lastSyncedAt` in response headers

### CloudFront TTL + Invalidation

| Endpoint | TTL | Invalidated when |
|---|---|---|
| /artists | 1 hour | `artists` table dirty |
| /categories | 1 hour | `categories` dirty |
| /stages | 1 hour | `stage` or `stage_localization` dirty |
| /schedule | 2–5 min | `schedule` dirty |

Short TTL on `/schedule` ensures freshness even without explicit invalidation.
Explicit CloudFront invalidation is the fast path for immediate propagation.

### DynamoDB as Fallback
If the official API is unreachable, the API Lambda continues serving the last
known good data from DynamoDB. Users never see an error due to upstream outage.

### Client-side cache and freshness

The same fallback idea one level down: the app persists what it fetched, so its
own startup does not depend on the network either.

`cacheService` keeps the four datasets in memory and mirrors them to AsyncStorage
per slug (`festival:data:{slug}`, ~800 kB for a full edition). Only the **raw**
datasets are stored; `artistEventMap`, `festivalDays` and `layoutMap` are rebuilt
on load through `buildCacheData`, the same function `collector.build()` uses — a
restored cache therefore cannot differ in shape from a fetched one. A schema
version guards the stored copy, and a failed write (typically a web localStorage
quota overflow) costs only the offline start, never the running session.

Startup consequently runs **persisted data first, network second**: a restore
lifts the splash immediately and the freshness check continues behind an already
usable UI. A cold start with no connectivity opens on the last known schedule
instead of the error screen. Only a first-ever run with no stored data can still
end on the error screen.

**The freshness watermark is server time, not local time.** `/{slug}/validity/{t}`
answers `changed: lastSyncedAt > t`, where `lastSyncedAt` is when *the backend*
last rebuilt that edition. The client therefore stores the `lastSyncedAt` it was
told, alongside the data it belongs to, and sends that back on the next check:

```
validate(slug, watermark) → { upToDate, serverSyncedAt }
   upToDate && cached   → nothing to do
   otherwise            → populate() → store data + serverSyncedAt together
```

Two things that look like details and are not:

- Storing `Date.now()` instead would compare a wall clock against the server's
  rebuild time. The answer is then `changed: false` permanently and the app never
  updates again.
- The watermark must be read at the start of every run, not captured once when
  polling begins. A captured copy keeps asking about the state the app booted in,
  which always answers "changed" and turns every poll into a full re-download —
  every 60 s during the festival.

Both mistakes were present at once and masked each other: the captured value
stayed `0`, so updates did arrive, at the cost of re-downloading everything on
every cycle. Fixing either one alone would have made it worse.

---

## Auth & Anonymous → Login Merge Flow

```
1. First open → generate anonymous UUID, store locally
2. All interests saved locally with { slug, artistId, status, updatedAt }
3. User taps "Login" → Cognito OAuth flow
4. On successful login:
   a. Fetch cloud interests for this userId (all slugs)
   b. Merge with local interests: for each slug#artistId, keep the entry with the higher updatedAt
   c. Write merged set to DynamoDB under Cognito userId
   d. Clear local anonymous data
5. Future sessions: sync from DynamoDB, update on change
```

---

## Share Link Flow (V1)

```
1. User taps "Share my schedule"
2. POST /share → Lambda generates opaque random token, stores { token, userId, createdAt }
3. Returns shareable URL: https://app.brutalassault.cz/shared/{token}
4. Recipient opens URL → GET /share/{token} → read-only view of that user's personal schedule
```

Token has no userId exposed. No automatic expiry — user revokes via DELETE.

---

## Project Directory Structure (planned)

```
/
├── mobile/          # Expo React Native app (iOS + Android + Web)
├── backend/
│   ├── lambdas/
│   │   ├── api/     # User-facing API Lambda
│   │   └── sync/    # Background Sync Lambda
│   └── shared/      # Shared types, DynamoDB helpers, normalization logic
└── infra/           # AWS CDK stack (TypeScript)
```

---

## CDK Stack (planned resources)

- DynamoDB tables: artists, stages, categories, events, userInterests, shareTokens, syncState
- Cognito User Pool + Identity Pool (Google, Facebook, Apple, Anonymous)
- API Gateway (HTTP API)
- Lambda: api (Node.js/TS)
- Lambda: sync (Node.js/TS)
- EventBridge Rule: trigger sync Lambda on schedule
- CloudFront Distribution: in front of API Gateway, with cache behaviors per path
- IAM roles + policies (least privilege)

---

## Open Questions / To Be Resolved

- [x] Confirm exact shape of official `/changes` response — array of `{ id, table, time, count }`, see "Tables We Monitor" above
- [x] Confirm whether `?time={ts}` is incremental or always full — always full; full rebuild strategy adopted (`?time=0`)
- [x] Decide final web hosting — operator's own server
- [x] Share tokens: no automatic expiry; user revokes explicitly via `DELETE /share/:token`
- [ ] Design the friend overlay UX in timeline view (V2)
- [ ] Admin / observability endpoints — deferred, design later

---

## How to Start (Claude Code Instructions)

Read this file for full context, then begin with the CDK infrastructure stack:

1. Scaffold the CDK app in `/infra`
2. Define all DynamoDB tables with correct keys and TTL settings
3. Define Cognito User Pool with all identity providers
4. Define both Lambda functions (stub handlers for now)
5. Define API Gateway with routes matching `/API Endpoints` above
6. Define EventBridge rule targeting the Sync Lambda
7. Define CloudFront distribution with cache behaviors
8. Wire IAM permissions (least privilege)

Once infra is defined and deployable, move to:
- Backend Lambda implementation (sync logic first, then API handlers)
- Expo frontend (auth flow first, then timeline view)
