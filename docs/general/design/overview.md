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
| Auth | AWS Cognito (Google, Apple ID, Anonymous) |
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
  - The drawer lists "Program" only when some playable artist has an event in a known category, and "Support Program" only when some non-playable artist does; whether a timeline can be built is decided by `cacheService.hasTimelineCategories(slug, isPlayable)` alone (a later fallback could derive lanes from stages there)
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
- Social login: Google, Apple ID (via AWS Cognito)
- Anonymous → login migration with timestamp-based merge

### Sharing (V1)
- Generate a **secret link** → read-only view of a user's personal schedule
- Link contains an opaque share token (not userId)
- Token stored in DynamoDB with optional expiry

### Future Features (architecture must support, not built in V1)

Status added after the fact — this was the V1 brief, and most of the list has since shipped.

| Feature | Status |
|---|---|
| Conflict detection — flag overlapping "Will Go" slots | **Shipped** — `conflictUtils` + `ConflictContext`, striped bars on timeline blocks and on My plan's rows, a detail sheet; the Conflicts screen was replaced by My plan's "Only conflicts" filter |
| My plan — today / now / next of your picks | **Shipped** — the `MyPlan` screen, the now pill in the TopBar centre, per-day view with the day switcher; see [my-plan.md](../../frontend/design/my-plan.md) |
| Push notifications / reminders before a set starts | Not built |
| Friends' schedules — follow another user's personal schedule | **Shipped** — share tokens, `SocialContext`, friend facepile in the artist list |
| Overlay a friend's schedule on top of your own in the timeline | **Partial** — the lens scope switches the timeline to a friend's picks; there is no simultaneous two-schedule overlay, and no friend indicator on timeline blocks |
| Offline mode — full local-first data layer, sync on reconnect | **Shipped** — festival cache persisted per slug and loaded before the network; interests are local-first and merge on login |
| Share with a specific account (not just a secret link) | Not built |
| Band genre / bio / media | **Shipped** — genre/country on artist rows, bios fetched from `/{slug}/bios` and cached separately |

---

## Open Questions / To Be Resolved

- [x] Confirm exact shape of official `/changes` response — array of `{ id, table, time, count }`, see "Tables We Monitor" in [official-api.md](../../backend/design/official-api.md)
- [x] Confirm whether `?time={ts}` is incremental or always full — always full; full rebuild strategy adopted (`?time=0`)
- [x] Decide final web hosting — operator's own server
- [x] Share tokens: no automatic expiry; user revokes explicitly via `DELETE /share/:token`
- [ ] Friend overlay UX in the timeline (V2) — partially answered by the lens scope (view the
      timeline *as* a friend); a simultaneous overlay of your schedule and theirs is still open
- [ ] Admin / observability endpoints — deferred, design later
