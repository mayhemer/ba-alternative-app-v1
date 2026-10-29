# Layout, Orientation & App Chrome

The app rotates freely (`app.json` → `orientation: "default"`) on phones, tablets and web. There
is no orientation library and no per-screen lock; every screen reflows.

## Layout mode

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

## Chrome layout

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
Settings still gets a hamburger.

The TopBar's centre holds the **now pill** (`components/plan/NowPill`, spec in
[my-plan.md](my-plan.md)), which falls back to the logo. It is not moved
anywhere on short viewports: there is no pill in landscape.

The centre slot is capped at `DAY_SWITCHER_MAX_FRACTION` (40 %) of the viewport width — stretched
across an 844 pt landscape phone the day buttons look out of proportion. `DaySwitcher` needs no
knowledge of this: it is already `width: '100%'`, `alignSelf: 'center'`, capped at
`CONTENT_MAX_WIDTH`, so it fills whatever slot it is given.

## Floating BottomBar (short viewports)

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
four scrollers (`TimelineView`'s canvas, `ArtistListScreen`'s `SectionList`, `MyPlanScreen`'s `FlatList`,
`SettingsScreen`) and subtracted from `LensPanel`'s `maxHeight`. It is deliberately a generous
constant rather than the bar's measured height — the clearance only has to be *at least* the bar
height, and a few extra px at the end of a scroll are invisible, whereas coupling the two would
mean either pinning the bar to a fixed height (risking a clipped `DaySwitcher`) or plumbing an
`onLayout` measurement through a context.

`DrawerButton` (`src/components/layout/DrawerButton.tsx`) is shared between the two bars rather
than duplicated: it carries the coupling that opening the drawer dismisses the lens panel — the
counterpart to the same rule in `LensChip`. It closes the drawer when it is open, and its label
("Open menu" / "Close menu") follows the drawer through `useIsDrawerOpen`, which re-renders it only
when the drawer opens or closes, not on every navigation change. It renders nothing when `isWide`,
where the drawer is permanent.

`LeftComponent` exists in `TopBarConfig` but no screen sets it; the BottomBar ignores it.

## Overlays across rotation

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

## Chrome elements and their sources

- **Bottom bar** (`layout/BottomBar.model.ts`): a row under a screen with content for it, nothing
  under one without; on a short viewport it floats over the content, carrying the TopBar's controls.
- **Feedback toast** (`layout/FeedbackToast.model.ts`): the band clear of the star column
  (`toastBand`), and its content — the interest strip after a star tap, else the message — and
  whether a tap dismisses it.
- **Friend avatar and facepile** (`social/FriendAvatar.model.ts`, `FriendFacepile.model.ts`): the
  photo or the initial, the pick's badge, sized from the avatar; three faces and "+N".
