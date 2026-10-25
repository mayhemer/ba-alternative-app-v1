# Client-side cache and freshness

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

**The freshness watermark is server time, not local time.** `/{slug}/validity`
reports `lastSyncedAt`, when *the backend* last rebuilt that edition, and the
client compares it against its own stored copy. The client therefore stores the
`lastSyncedAt` it was told, alongside the data it belongs to, and compares that
on the next check:

```
validate(slug, watermark) → { upToDate, serverSyncedAt, artistsSyncedAt }
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
