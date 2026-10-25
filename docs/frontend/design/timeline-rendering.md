# Timeline rendering

## Landscape trade-off on the timeline

Landscape roughly doubles the visible time span but costs lane height. After BottomBar, ruler and
safe areas a 390 pt viewport shows ~2.5 category lanes rather than 4–5 — dropping the TopBar is
what keeps that from being ~2.

`LANE_HEIGHT` stays fixed: it is read by `ArtistBlock`, `NowLine`, the cached sub-row layout behind
`cacheService.getCategoryDayLayout` and `ConflictTimeline` in the conflict sheet, so making it
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

## Timeline landing position

A day the user has never scrolled opens 30 minutes before its first event, not at the window's left
edge. Note the left edge is 08:30 by construction — `VIEW_START_H` is where the scrollable window
starts — so "scroll offset 0" *is* 08:30; there is no 08:30 default anywhere to change.

`defaultScrollX(firstEventMs, dayStart)` in `timelineLayout.ts` owns the calculation, and
`TimelineView` calls it at both places that need it: the day-restore effect and the progressive-mount
anchor. Those two must agree or the mount window prepares a different span from the one the view
lands on. The 06:00 boundary needs no handling — `dayStart` is already the 06:00 start and `timeToX`
is relative to it. `firstEventMs` comes from `eventsByCategory`, i.e. the day as *this screen*
renders it, so the support timeline aims at its own first event.

The view **mounts** at that offset via the ScrollView's `contentOffset` rather than scrolling there
afterwards, and `scrollX` is seeded to the same value. Both native platforms honour the prop
(react-native-web does not; the restore effect's first-mount branch is its fallback). The prop object
must keep a stable identity — iOS re-applies `contentOffset` whenever it changes, which would yank a
scrolled view back.

That is not polish, it is what makes the offset race-free. While a view is scrolling *towards* its
position, `scrollX` still holds the old one, and every path that persists a scroll offset — including
losing focus and switching days — would record a place the user was never at. Mounting in position
leaves no such window, and so needs no logic to tell our own scrolling apart from the user's.

The one case ordering cannot fix: a day with no events to aim at. The default is then 0, and
persisting it would outrank the real default once the day does have events (lens switched back to
"all", say). `persistCurrentScroll` therefore stores nothing while the day is empty, and the
focus-loss path routes through it for the same reason.

This whole area is the worked example behind `.claude/skills/derived-state-races`.

## Timeline rendering: never counter-animate against scroll

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
