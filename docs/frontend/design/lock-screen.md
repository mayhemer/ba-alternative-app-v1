# Lock-screen now card: design

The now pill's answer (what is live, what is next, how long) on the lock screen, plus the stage, the
times and the next clashing set. iOS shows it as a **Live Activity**, Android as an **ongoing
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
- **Clash row:** My plan's START rule (`clashesWithLive`, `lib/conflictUtils.ts`): the next Must-see
  still to start that clashes with one live now. Only that one.
- **`⚠ +N`:** the main set's clash group (`conflictGroupOf`, the groups My plan titles), only in a group
  of **three or more** bands: N = the group's bands not on the card that haven't finished yet.
- **Window:** exactly while the pill isn't the logo: from 08:00 (or the end of the last finished
  Must-see) until today's last Must-see ends. No card on a day without a Must-see.

All of it is computed once, in TypeScript, for the whole festival: `nowCardScript` (`lib/nowCard.ts`)
returns every state with its time span. Native code only picks the span holding now and draws it; it
holds no festival logic.

## Content

Both platforms use **layout #4**; the Android notification differs in a few points (below). The
mockup also keeps the earlier layouts #1–#3 for comparison.

### Layout #4

Each row: the band name, then its countdown with time and stage on the right.

```
BETWEEN THE BURIED AND ME
● LIVE −48:00           19:00–20:00 · Jägermeister
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ (dark yellow played, yellow left)

THE DILLINGER ESCAPE PLAN                       +1
−28:00 ⚠                  19:40–20:30 · Metal Gate

NEXT UP                                               (break)
NAPALM DEATH
−1:30:12                  14:00–14:50 · Metal Gate
```

- **Live row:** the band name (22 heavy, ellipsis), then the status line: red dot, `LIVE` (12 bold caps,
  `planStrings.live`), the time left (14 bold, accent), and `time · stage` on the right (14; time
  `textMuted`, stage bold `textSecondary`). Then the bar: 5 pt, dark yellow (`livePassed`) for the time
  played from the left, yellow for the time left, as the pill's.
- **Clash row:** the name (16 heavy, ellipsis) with `+N` (16 bold red) at its end; under it the
  countdown to its start (14 bold red) and a red `⚠`, with `time · stage` on the right. No heading: a
  `CONFLICT:` line would make the card 177 pt.
- **Break row:** a grey heading `NEXT UP` (13 semibold caps, `muted`; `planStrings.cardNext`; Czech
  "NÁSLEDUJE"),
  the name (22 heavy), then the countdown to the next Must-see (18 bold blue) with `time · stage` on
  the right.
- **Time · stage:** when it doesn't fit beside its countdown, it moves under it, right-aligned.
- **`+N` with no clash row** (every band of the group already live): at the end of the live row's name
  line.
- **Countdown width:** iOS draws the ticking text in its own process and can't tell the layout how wide
  it gets, so a bare timer takes all the width offered. Each countdown sits on an invisible sample of
  its text in the same font, chosen when the card is drawn (each refresh and the stale switch):
  `−0:00:00` from an hour left, `−00:00` from 10 minutes, `−0:00` below. If the text gets shorter
  before the next drawing (crossing an hour or 10 minutes), a gap opens on its right, before the
  right-aligned `time · stage`, where it doesn't show.
- Card padding: 16 pt at the sides, 18 on top, 20 at the bottom; 22 pt between the live and the clash
  row, 3 pt between a row's lines, 8 pt above the bar. Live + clash come to 158 pt, under iOS's 160:
  more space anywhere has to come out of somewhere else. The island's expanded view insets the card
  further, so its corners don't cut the text.

### Layout #4 on Android

Two lines: the first 18 sp (the band name bold), the second at the notification's text size (14 sp),
every text without font padding (`includeFontPadding="false"`), so the collapsed card stays near
44 dp, under the ~48 dp Android gives it. Collapsed is what the lock
screen shows, and on older Androids (the Nokia 3, Android 9) the only view; where Android offers an
expanded view, a clash adds iOS's clash row there.

```
BETWEEN THE BURIED AND ME                    ⚠ +2      live (+ clash), collapsed
● LIVE −48:00 (yellow)  19:00–20:00 · Jägermeister

BETWEEN THE BURIED AND ME                              live + clash, expanded
● LIVE −48:00 (yellow)  19:00–20:00 · Jägermeister
──────────────────────────────────────────────────
THE DILLINGER ESCAPE PLAN                       +1
−28:00 ⚠ (red)            19:40–20:30 · Metal Gate

NEXT: HOODED MENACE                                    break
−1:30:00 (blue)               11:30–12:10 · Octagon
```

- **Live:** the name (18 bold); then the red dot, `LIVE`, the time left (14 bold, accent) and
  `time · stage` on the right (stage bold).
- **Clash, collapsed:** the live card with `⚠ +N` at the end of the name line: N = the clashing bands
  it doesn't name (the next clashing Must-see, plus the group's other unfinished ones).
- **Clash, expanded:** the live card without `⚠ +N`, a 1 px line with 6 dp above and below, then the
  clash row as on iOS: the name (16 bold, smaller than the live name) with `+N` (the group's other unfinished bands) at its end;
  the countdown to its start (14 bold red), `⚠`, `time · stage`.
- **Break:** `NEXT:` (`planStrings.cardNextShort` with a colon, "DALŠÍ:" in Czech; Android only, iOS
  keeps `NEXT UP`; the name's size, the time range's colour), the name (18 bold); then the countdown (18 bold blue, to `time · stage` as on iOS)
  on one baseline with `time · stage`.
- Live and break have no expanded view of their own: Android shows the same card, in its larger
  expanded frame, which makes it a little taller (open).
- No bar (see Battery). A long stage name ends in an ellipsis: RemoteViews can't move it to a line of
  its own.
- **Colours** tell the state as on iOS. The shade follows the system's dark mode on Android 10+ and is
  light on older ones, so `values/colors.xml` darkens the yellow, red and blue; `values-night` uses
  the app's tokens.

### Both

- **Countdowns:** `−48:00`, `−1:30:12`, ticking. Not the pill's `−37 min`: only a ticking clock can be
  redrawn by the OS with no updates (see Battery). Android shows `−08:12` under an hour, iOS `−8:12`.
  iOS sizes each countdown from a hidden sample of its longest text in the same font, so it never wraps.
- Names truncate with an ellipsis; countdowns, `LIVE`, the dot, `+N` and stages never shrink.

### iOS (Live Activity)

- Up to 160 pt tall: the live row and the clash row take 158. A stage name long enough to wrap a
  countdown line passes 160, and iOS cuts the bottom off.
- **Dynamic Island** (`IslandState`): compact = a glyph on the left, a countdown on the right; minimal
  = the glyph; expanded = the lock-screen card.
  - live: red dot, the time left (yellow);
  - clash: red ⚠, the countdown to the clashing set's start (red, the clash row's value);
  - break: white `›` (bold), the countdown to the next Must-see (blue).
  A live set whose clash group is all live (`+N`, no clash row) has nothing to count down to and
  shows as live.
- **Switching:** each refresh hands the card the spans from now on, in order, as many as fit
  ActivityKit's 4 KB (about 10 even with long names; the controller drops spans from the end past
  3,500 bytes). The current span's end is the stale date. Whenever iOS draws the card, it shows the
  span holding that moment. iOS draws it at least at the stale date, so the first switch is sure;
  later switches happen whenever iOS draws the card again on its own (not documented when, or
  whether), else at the next refresh. Until then the card stays on its last drawn span with its
  countdowns at 0:00. After the day's last span it reads "Today's Must-sees are over"; after the last
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
- **Status-bar icon** per state, as the iPhone's Dynamic Island: dot (live), triangle (a clashing set
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
