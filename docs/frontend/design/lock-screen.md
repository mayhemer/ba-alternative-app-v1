# Lock-screen now card: design

The now pill's answer (what is live, what is next, how long) on the lock screen, plus the stage, the
times and, while live, the next Must-see (flagged when it clashes). iOS shows it as a **Live Activity**, Android as an **ongoing
notification**. A tap opens My plan on today, scrolled to now.

Status: **implemented** (2026-11-04, branch `live-card`). Visual reference, the interactive
mockup: https://claude.ai/artifact/NUHF4ajkY5pM6GFRSnLkAU (private; open it with the owner's account).
This document wins over the mockup wherever they differ.

Related: [my-plan.md](my-plan.md) (the now pill, the plan rows this card copies),
[credentials.md](../build/credentials.md) (the extension's signing).

---

## Sources

- **Top row:** the now pill's set, through the pill's own selection (`nowPillSet`, `lib/nowPillSet.ts`):
  the latest live Must-see, or in a break the next one. The card never names a different set.
- **Next row** (while live): the day's next Must-see still to start, whether it clashes or not;
  none when the day has no more. **⚠** when it clashes with one live now: My plan's START rule
  (`clashesWithLive`, `lib/conflictUtils.ts`).
- **`+N`** (always on the live row): how many **other Must-sees are live** at the same moment, so only
  with two or more live; the now pill's own count (`nowPillSet`'s `others`). A band still to come
  never counts: the next row shows it.
- **Window:** exactly while the pill isn't the logo: from 08:00 (or the end of the last finished
  Must-see) until today's last Must-see ends. No card on a day without a Must-see.

All of it is computed once, in TypeScript, for the whole festival: `nowCardScript` (`lib/nowCard.ts`)
returns every state with its time span. Native code only picks the span holding now and draws it; it
holds no festival logic.

## Content

Both platforms use **layout #4**; the Android notification differs in a few points (below). The
mockup also keeps the earlier layouts #1–#3 for comparison.

### Layout #4

Each row: the band name, then its countdown with time and stage on the right. Countdowns as on iOS
18+; older iOS and Android show a clock (`−48:00`, `−1:30:12`; see "Both" below).

```
BETWEEN THE BURIED AND ME                       +1
● LIVE -48 min          19:00–20:00 · Jägermeister
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▨▨▨▨▨▨▨▨ (dark yellow played, yellow left; ▨ the next band's overlap)

NEXT: THE DILLINGER ESCAPE PLAN
-28 min ⚠ (blue; ⚠ red)   19:40–20:30 · Metal Gate

NEXT UP                                               (break)
NAPALM DEATH
-1 h 30 min               14:00–14:50 · Metal Gate
```

- **Live row:** the band name (22 heavy, ellipsis) with `+N` (17 bold red; other sets live now) at its end, then the status
  line: red dot, `LIVE` (12 bold caps, `planStrings.live`), the time left (14 bold, accent), and
  `time · stage` on the right (14; time `textMuted`, stage bold `textSecondary`). Then the bar: 5 pt,
  dark yellow (`livePassed`) for the time played from the left, yellow for the time left, as the pill's.
  When the next band clashes, the bar also stripes the stretch it overlaps, from its start to the
  live set's end (what going there costs): the app's clash hatch (`src/ui/stripes.ts`; rising 45°, as
  everywhere, ux-principles.md; 2 pt; `ClashStripes`), red lines only, so the played and left colours show through the gaps as
  the bar runs into it. Only the next band's overlap, not every overlap of the live set (My plan's
  clash bar shows those): the card is about what comes next.
- **Next row** (under the live row, when the day has a Must-see still to start): as the break row,
  with `NEXT:` before the name instead of a heading line (`planStrings.cardNextShort` with a colon,
  `textMuted`; "DALŠÍ:" in Czech); the name (16 heavy, ellipsis), then the countdown to its start
  (14 bold **blue**) with `time · stage` on the right. When it clashes with a live set, a red `⚠`
  after the countdown; the countdown stays blue: it is the time to its start, not a time it has been
  live. The break row's sizes (22, 18) would make the card 170 pt, past iOS's 160.
- **Break row:** a grey heading `NEXT UP` (13 semibold caps, `muted`; `planStrings.cardNext`; Czech
  "NÁSLEDUJE"),
  the name (22 heavy), then the countdown to the next Must-see (18 bold blue) with `time · stage` on
  the right.
- **One line always:** a countdown line never takes a second line (that could push the card past
  160 pt). The countdown keeps its width; when `time · stage` doesn't fit beside it, it ends in `…`
  (the stage first). The iOS 18 countdown is short (`-1 h 20 min`), so it rarely comes to that.
- **Countdown width:** iOS draws the ticking text in its own process and can't tell the layout how wide
  it gets, so a bare timer takes all the width offered. Each countdown sits on an invisible sample of
  its widest text until the next drawing, in the same font, chosen when the card is drawn (each
  refresh and the stale switch). iOS 18+: the hours as they are with two-digit minutes from an hour
  left (`-1 h 59 min`), `-59 min` below (which also covers a count past zero, `12 min`). Older iOS:
  `−0:00:00` from an hour left, `−00:00` from 10 minutes, `−0:00` below. If the text gets shorter
  before the next drawing, a gap opens on its right, before the right-aligned `time · stage`, where
  it doesn't show.
- Card padding: 16 pt at the sides, 18 on top, 20 at the bottom; 22 pt between the live and the next
  row, 3 pt between a row's lines, 8 pt above the bar. Live + next come to 158 pt, under iOS's 160:
  more space anywhere has to come out of somewhere else. The island's expanded view insets the card
  further, so its corners don't cut the text.

### Layout #4 on Android

Two lines: the first 18 sp (the band name bold), the second at the notification's text size (14 sp),
every text without font padding (`includeFontPadding="false"`), so the collapsed card stays near
44 dp, under the ~48 dp Android gives it. Collapsed is what the lock
screen shows, and on older Androids (the Nokia 3, Android 9) the only view; where Android offers an
expanded view, a live card adds the next row there.

```
BETWEEN THE BURIED AND ME                     ⚠ +1     live, collapsed (⚠: the hidden next band clashes; +1: another set live)
● LIVE −48:00 (yellow)  19:00–20:00 · Jägermeister

BETWEEN THE BURIED AND ME                        +1    live, expanded
● LIVE −48:00 (yellow)  19:00–20:00 · Jägermeister
──────────────────────────────────────────────────
NEXT: THE DILLINGER ESCAPE PLAN
−28:00 (blue) ⚠           19:40–20:30 · Metal Gate

NEXT: HOODED MENACE                                    break
−1:30:00 (blue)               11:30–12:10 · Octagon
```

- **Live:** the name (18 bold) with `+N` (red) at its end, always, collapsed and expanded; then the
  red dot, `LIVE`, the time left (14 bold, accent) and `time · stage` on the right (stage bold).
- **Live, collapsed:** the next row is hidden, so a red `⚠` before `+N` on the name line says the next
  band clashes with a live one.
- **Live, expanded** (when the day has a Must-see still to start): the live card without that `⚠`, a
  1 px line with 6 dp above and below, then the next row: the break card's layout for the next band
  at the iPhone next row's sizes (`NEXT:` and the name 16 sp, the blue countdown 14 sp, as
  `time · stage`), with a red `⚠` after the countdown when it clashes. A clashing next row also
  gets a striped clash bar on its right edge (6 dp, `nc_clash_stripes`, the same rising hatch): Android has no
  live bar to stripe, as iOS does.
- **Break:** `NEXT:` (`planStrings.cardNextShort` with a colon, "DALŠÍ:" in Czech; iOS's break row
  keeps `NEXT UP`; the name's size, the time range's colour), the name (18 bold); then the countdown
  (18 bold blue, to `time · stage` as on iOS) on one baseline with `time · stage`.
- A live card with no next band, and the break card, have no expanded view of their own: Android shows
  the same card, in its larger expanded frame, which makes it a little taller (open).
- No bar (see Battery). A long stage name ends in an ellipsis: RemoteViews can't move it to a line of
  its own.
- **Colours** tell the state as on iOS. The shade follows the system's dark mode on Android 10+ and is
  light on older ones, so `values/colors.xml` darkens the yellow, red and blue; `values-night` uses
  the app's tokens.

### Both

- **Countdowns:** always a text the OS redraws on its own, with no updates (see Battery); which one
  depends on what the OS can draw (`targets/now-card/Countdown.swift` picks it per iOS version):
  - **iOS 18+:** whole minutes, short, the same on the bright and the dimmed always-on screen:
    `-1 h 20 min`, `-32 min`, `0 min`. `Text(.durationOffset(to:), format: Duration.UnitsFormatStyle
    .attributed)`: hours and minutes, `.condensedAbbreviated`, Czech short units (`cs_CZ`) in either
    app language (the app's `h` and `min`; English gives `hr`). Rounded to the nearest minute, as the
    pill's `formatDuration`. The **minus is iOS's**, a hyphen-minus (U+002D): the duration to the end
    is negative. **Past zero it counts up** (`2 min`, no minus), only on a card iOS hasn't drawn again
    since the switch (the dimmed screen until it wakes): accepted for a short, readable countdown.
    iOS redraws the dimmed screen rarely: it trims a text whose parts are labelled (hours, minutes)
    and blanks the digits of any other; this format's attributed output labels its parts and changes
    once a minute (under test on a device). Rejected: `Date.ComponentsFormatStyle` (no labels: dashes
    or no minutes when dimmed); Apple's timer at minute precision (`-1 hour, 20 minutes`: too long for
    one line); a dimmed-only branch (drew the two texts over each other).
  - **iOS 16.4–17 and Android:** a ticking clock, `−48:00`, `−1:30:12`, stopping at 0:00, the minus
    the card's own (U+2212). Android shows `−08:12` under an hour, iOS `−8:12`.
  iOS sizes each countdown from a hidden sample of its longest text in the same font.
- Names truncate with an ellipsis; countdowns, `LIVE`, the dot, `+N` and stages never shrink.

### iOS (Live Activity)

- Up to 160 pt tall: the live row and the next row take 158. A countdown line never wraps, so they
  stay there.
- **Dynamic Island** (`IslandState`): compact = a glyph on the left, a countdown on the right; minimal
  = the glyph; expanded = the lock-screen card, inset 8 / 6 pt and with 12 pt between its rows
  (not 22): at 22 the island cut off the next row's bottom.
  - live: red dot, the time left (yellow);
  - clash: red ⚠, the countdown to the next set's start when it clashes (blue, the next row's value);
  - break: white `›` (bold), the countdown to the next Must-see (blue).
  A live set whose next set doesn't clash (or with none left) shows as live.
- **Switching:** each refresh hands the card the spans from now on, in order, as many as fit
  ActivityKit's 4 KB (about 10 even with long names; the controller drops spans from the end past
  3,500 bytes). The current span's end is the stale date. Whenever iOS draws the card, it shows the
  span holding that moment. Apple documents the stale date only as the card's state turning stale,
  not as a redraw. Seen on a device (2026-11-06): the first switch shows when the screen is woken
  after the stale date, and a screen dimmed across it keeps the old span; later switches don't
  happen until the next refresh (app open). **Not shippable as is**: push updates or a rethink are
  being weighed. Until a redraw the card stays on its last drawn span, its countdowns at zero
  (iOS 18+: counting up past it, `2 min`; `0:00` before iOS 18). After the day's last span it reads "Today's Must-sees are over"; after the last
  span of a list cut to fit, it stays on that span.
- **Refreshes:** every app open (the hand-over, below), plus background refresh when iOS grants it
  (asked for at each next change; no JS runs).
- A card lives at most 8 hours; a refresh in the front restarts one older than 7.
- No permission prompt: Live Activities have their own per-app switch in the system settings, on by
  default. The card appears at the first app open inside the window (an automatic 08:00 start needs
  iOS 26's scheduled start, which requires an alert; not used).

### Android (ongoing notification)

- Silent, ongoing, shown on the lock screen (`VISIBILITY_PUBLIC`), low-importance channel "Lock-screen
  now card".
- **Content:** see "Layout #4 on Android" above.
- **No progress bar:** it can only move by reposting the notification, which costs wakeups.
- **Status-bar icon** per state, as the iPhone's Dynamic Island: dot (live), triangle (a clashing next set
  to come), `›` (break).
- **Light system theme:** the shade is light, so the yellow, red and blue are darker there
  (`values/colors.xml`); the dark theme uses the app's tokens (`values-night`).
- **Swiped away:** hidden until that day's card would end; the next day it is back.
- **Permission:** on by default. On the first app open of a festival day that still has a Must-see to
  show, the app asks for `POST_NOTIFICATIONS` once (13+; `shouldAskNowCardPermission`). Settings has an
  on/off switch ("Lock screen › Now card"); switching it on after a denial opens the system settings.

## Tap

`ba://my-plan/now` (`NOW_CARD_URL`, `navigation/nowCardLink.ts`; Live Activity `widgetURL`, Android
content intent). `shell/useNowCardLinkHandler` opens My plan on today, scrolled to now, the same step
as the now pill off My plan (`shell/openPlanAtNow.ts`); an open search closes first. On a cold start it
waits for the navigator's restored state, then lands on top of it.

## Hand-over and switching

- `shell/NowCardSync` (renders nothing, its own component so a star press doesn't re-render AppShell)
  computes the script from the deferred picks and hands it to the native module
  (`modules/now-card`) whenever it changes (`sameNowCardScript`) and whenever the app comes to the
  front.
- **iOS:** the hand-over is the refresh: start, update or end the Live Activity
  (`NowCardController.swift`).
- **Android:** the script is stored; one **exact** alarm (`USE_EXACT_ALARM`) at each next change redraws
  the notification without JS (`NowCardScheduler.kt`). An inexact alarm can arrive up to ¾ of its wait
  late, with the countdown running below zero meanwhile. Also redrawn after a reboot, an app update, and
  a clock or time-zone change (the countdowns count against the time since boot).
  `USE_EXACT_ALARM` is restricted by Google Play to alarm and calendar apps: if the app is ever
  published there, this needs a justification or a fallback to inexact alarms.

## Battery

Every wakeup the card causes, for the battery audit:

| | When | How often |
|---|---|---|
| iOS countdowns, bar | drawn by iOS | 0 |
| iOS refresh | each app open | with use |
| iOS background refresh | at each next change, when iOS grants it | 0 to a few a day |
| Android countdowns | drawn by the system while visible | 0 |
| Android alarm | each state change | ~2 per Must-see + window start/end |
| Android reboot / update / clock change | as they happen | rare |

## Code

| Part | Where |
|---|---|
| Script, states, permission rule | `src/lib/nowCard.ts` |
| The pill's selection, shared | `src/lib/nowPillSet.ts` |
| Hand-over, permission ask | `src/shell/NowCardSync.tsx` |
| Tap | `src/navigation/nowCardLink.ts`, `src/shell/useNowCardLinkHandler.ts`, `src/shell/openPlanAtNow.ts` |
| Native module (JS side) | `modules/now-card/index.ts` |
| iOS: start/update/end, background refresh | `modules/now-card/ios/` |
| iOS: the card's look | `targets/now-card/` (widget extension, `@bacons/apple-targets`) |
| iOS Info.plist keys | `plugins/withNowCard.js` |
| Android | `modules/now-card/android/` |
| Android switch | `src/screens/settings/SettingsScreen.tsx` |

`NowCardAttributes.swift` exists twice (module and extension, as ActivityKit needs); a Jest test keeps
the copies identical.

## Later

- Push "replayer" for iOS, only if field use shows the card goes stale too often: the device uploads
  its script and Live Activity push tokens; a scheduled Lambda sends the switches over APNs. No
  festival logic on the server.
