# Background Sync Service

`src/sync/backgroundSyncService.ts`

## Flow

1. On app start, `startSync` bootstraps **persisted data first, network second**:
   `hydrateFestivalCache(slug)` — a successful restore finishes first load immediately, so a cold
   start with no connectivity opens on the last known schedule instead of the error screen.
2. Then `runSync`, then poll on a date-aware interval.
3. Each cycle:
   a. `adapter.validate(slug, getSyncWatermark(slug))` — the watermark is re-read from the cache
      every run, never captured in a closure.
   b. `invalidateBiosIfStale(slug, artistsSyncedAt)`; kick off `syncBios` unawaited.
   c. If `upToDate` and data is cached → done.
   d. Otherwise create a `DataCollector`, `adapter.populate(...)`, then
      `cacheService.populateCache(slug, data, serverSyncedAt)`.
   e. Nothing to announce — `populateCache` notified the cache store itself.
4. Can be triggered manually (`triggerManualSync()`), which refreshes the current run.

## Runs and supersession

State that used to be module-global — the first-load flag and the poll timer — belongs to a
**`SyncRun`**: one per `startSync` call, holding its slug, the gate's callbacks, its own
`isFirstLoad` and its own timer. Exactly one run is current at a time (`activeRun`), and that
object's **identity is the generation token**: every continuation re-checks `isStale(run)` after
each `await`, so a superseded run goes quiet instead of racing the run that replaced it.

This is what closes the edition-switch hang. Sharing `isFirstLoad` let an outgoing run's late
continuation spend the incoming run's flag; the incoming run then found it already spent, never
called `onFirstLoadSuccess`, and `StartupGate`'s `Promise.all` never settled — splash up, no
error. A run can now only ever spend its own flag.

`clearTimeout` cancels only the *next* poll; a fetch already in flight cannot be called back. So a
superseded run is not cancelled, it is **discarded** — allowed to finish, but forbidden to touch
the cache, the gate or the schedule on its way out, and its pending promise abandoned. Truly
aborting the request would need an `AbortController` threaded through the adapter.

`activeRun` is assigned in exactly two places (`startSync`, after `stop()`; and `stop()`, to
`null`), so every supersession clears the outgoing timer. `syncBios` is deliberately *not* tied to
a run: bios are keyed by slug and stay correct even once that edition leaves the screen, and it
touches only the cache. Its in-flight marker is a `Set` of slugs, not one slug, so two overlapping
runs cannot clear each other's.

## Interval configuration

Date-aware intervals are live (`src/sync/festivalConfig.ts`, `getSyncInterval(slug)`):

| Phase                  | Interval    |
|------------------------|-------------|
| Outside festival dates | 30 minutes  |
| During festival        | 3 minutes   |
| Unknown slug           | 5 minutes   |

The during-festival poll is the backend's most-requested path — every running app hits it on this
timer. One minute produced roughly three times the requests of three minutes for no practical
gain; a schedule change still surfaces within a few minutes either way.

## Error handling

| Situation                         | Behaviour                            |
|-----------------------------------|--------------------------------------|
| First load, no cache, fetch fails | Show error screen with retry button  |
| Subsequent fetch fails (cache ok) | Silent fail; retry per schedule      |
| Bio fetch fails                   | Never rejects; detail screen says so |
