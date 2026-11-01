# UI responsiveness: urgent first, the rest deferred

The rule is in CLAUDE.md (*UI responsiveness*). This file is how it is done in this codebase, with the
places that already follow it. It came from the star press in the artist list. On a slow Android
phone, the pressed star and the star selector showed late, because the same commit also sorted the
whole list again, rendered every mounted row and scanned for conflicts.

## Urgent and deferred

A React update is either urgent (rendered and committed at once, blocking) or deferred (rendered
after the urgent commit, can be interrupted and restarted). Urgent is only what the user looks at
while touching: the pressed star, the selector it opens, the text typed into a search field.
Everything that follows from the change is deferred: conflicts, the now pill, summaries, counts,
other screens.

- **Write side:** a state change in an event handler is urgent. `startTransition` makes a state
  update deferred, but not an external store update (see below).
- **Read side:** `useDeferredValue(value)` hands back the previous value during the urgent render,
  then renders again with the new one in a deferred render. This is the tool used here.

## Patterns

### Read only your own piece

An element that reacts to a touch subscribes to exactly the data it shows. Then a change renders
the elements it changes and nothing else.

- `useInterestStatus(artistId)` (`features/interests/InterestContext.tsx`) renders its user only
  when that artist's pick changes. Used by `ConnectedArtistRow`, the open `StarSelector` and the
  artist sheet's header (its star); the sheet's body reads no pick at all.
- Never hand a whole map, or a getter whose identity changes with every update, to many
  elements. A `getStatus` that changes with every pick re-renders every row.
- A callback that needs the current value at call time reads it through a stable getter
  (`useInterestCycle().getStatus`), not through a subscription.

### Defer what follows

A consumer of the change that the user is not touching reads the deferred value and feeds its
memos with it. For picks, that is `useDeferredInterests()`: `InterestProvider` makes one deferred
copy of the picks and hands it to every reader, so elements that show related information read the
same value by construction and never disagree.

```tsx
const interests = useDeferredInterests();
const entries = useMemo(() => computeConflictEntries(interests, inputs), [interests, inputs]);
```

Readers: `ConflictProvider`, `NowPill`, `MyPlanScreen` and `PlanDaySwitcher`, the timeline
(`useTimelineData`) and the conflict sheet's `ConflictTimeline`. A deferred render is thrown away
when a newer change arrives, so quick taps cost one conflict scan, not one per tap.

One reader stays urgent on purpose: the artist list's lens filter (`ArtistListScreen`). Under a
picks lens the row the user is touching appears or goes with the star. On *Everything* it costs the
screen's own render only; the sections and the list keep their identity.

### Hand on a result only when it changed

A memo recomputes whenever an input changes and returns a new object, even when the result is the
same. As a context value, that new object renders every reader for nothing.
`useStableValue(value, isEqual)` (`hooks/useStableValue.ts`) hands back the previous value while
the new one equals it. `ConflictProvider` keeps its conflict list this way (compared with
`equalValues` from `ui/sameProps.ts`), so a pick that makes or ends no clash renders none of its
readers. Everything that shows conflicts follows this one run: the timelines' bars
(`useConflicts().overlaps`), My plan's list and its day switcher's stripes (`buildPlanDay` and
`daysWithClash` take the provider's result), the sheets and the drawer. A pick runs the
calculation once (*the conflict calculation per pick* in `MyPlanScreen.test.tsx`).

### External stores update synchronously

`useSyncExternalStore` (the interest store, `store/cacheStore.ts`, `PlanContext`,
`TimelineFilterContext`, `AppContext`) always renders synchronously. A transition cannot defer it,
because React keeps no old version of an outside store to show meanwhile. Defer on the read side
with `useDeferredValue(snapshot)`. This only works when snapshots are immutable: each change is a
new object, and an unchanged read returns the same object (a snapshot that allocates on every read
re-renders forever; see the note in `store/cacheStore.ts`).

### Split a computation by its inputs

A memo reruns when any of its inputs changes, so a computation that mixes slow and fast inputs runs
in full for the fast one. Split it into steps, each memoised on its own inputs.

- The artist list (`screens/artist-list/ArtistList.model.ts`): `sortedArtistList` groups and sorts
  on the lineup and the search only. `withLens` filters the sorted sections, keeping their order.
  On the *Everything* lens, it hands back the sorted list unchanged. A pick never sorts again.

### Lists

- Rows subscribe to their own data (`ConnectedArtistRow`), so `renderItem` does not depend on it and
  stays stable.
- `SectionList` (and `FlatList`) hand their cells a new `renderItem` on every render of their own,
  so any render of the list renders every mounted cell again. Put the list in a `React.memo` child
  with stable props: module-level `keyExtractor`, section header and empty component, and a
  memoised `ListHeaderComponent` and content style. See `ArtistSectionList` in
  `screens/artist-list/ArtistListScreen.tsx`.

### Renders stay pure

A deferred render can run more than once, or be thrown away and never committed. A render body
only computes. Saving, syncing, timers, logging and perf marks go in event handlers (the cause is
known there) or effects (they run once per commit). Example: the `star:shown` mark is in an effect in
`StarSelector`, not in its render.

## Tests

- A deferred consumer adds a commit: the urgent one, then the deferred one. Render-count tests
  expect it and say why; e.g. *a changed pick commits three times* in `MyPlanScreen.test.tsx`.
- That a consumer is deferred is tested by order, not by count (`act()` flushes both renders): a
  probe reads the pick the way the star does and, in a layout effect, notes what had rendered by
  the commit that shows the new pick. Nothing of the consumer may have. See *what a pick renders
  first* in `MyPlanScreen.test.tsx`, `BaseTimelineScreen.test.tsx` and `ConflictTimeline.test.tsx`.
- Each narrow subscription gets a test that a change renders only its own element. Example:
  *a pick builds only its own row again, not the list* in `ArtistListScreen.test.tsx`.
- `act()` flushes deferred renders, so behaviour tests see the final state unchanged.

## Measuring

The `star:press` → `star:shown` marks on the `preview-perfinst` build time a star press on a device
by hand; see [device-perf.md](../../instructions/device-perf.md).

## Not reviewed yet

Readers of the cache (`useArtists`, `useStages`, `useArtistEventMap`) render urgently when a sync
lands. Each one needs a decision: is it urgent here or not?
