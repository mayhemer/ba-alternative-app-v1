# Deferred / known gaps

- ~~**Sync service is a module singleton, not an instance.**~~ **Done** — state is per `SyncRun`
  and supersession is detected by run identity; see *Runs and supersession* in [background-sync.md](background-sync.md). Still untested
  automatically: there is no test suite in `frontend/`, so the edition-switch race is verified by
  hand (switch edition on a throttled network while the first load is in flight).
- ~~**The cache→React bridge is an event emitter, not a subscribable store.**~~ **Done** — the
  emitter was replaced by `useSyncExternalStore` over a version counter owned by `cacheService`
  (see *Cache change notification* in [data-layer.md](data-layer.md)). The patches it existed to work around are gone with it: the
  epoch latch in `useCacheRefresh`, the eslint-disables in `ConflictContext`, `useTimelineData`
  and `BaseTimelineScreen`, and the `void cacheRevision` trick in `ConflictDetailSheet`.

- Smaller open items: 
`slugAdapter` is still a mockup; category **reorder** persistence was planned
and never built (hiding is persisted); `AppContext` has a TODO to roll the default slug forward
automatically once an edition is over; `scheduleNext` has no `AppState` handling for
sleep/resume/kill.

- Three `exhaustive-deps` suppressions remain in the tree (`InterestContext`, and two in `TimelineView`). They concern scroll/day/uth effect *triggers*, not cache reads, and are out of scope for the cache-store work above.
