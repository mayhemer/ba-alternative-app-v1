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

```
GET /artists?time={unix-ms}
GET /schedule?time={unix-ms}     → contains: schedules[], categories[]
GET /changes                     → { tableName: lastUpdatedTimestamp, ... }
```

JSON response schemes for each official endpoint will be discussed in detail later.

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
