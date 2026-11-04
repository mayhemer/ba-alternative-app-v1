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

Rows are My plan's two lines, without frame or fill.

```
LIVE (+ CLASH)                           BREAK
GOJIRA               ● LIVE −48:00       −1:30:12 › NAPALM DEATH
19:00–20:00           Jägermeister       14:00–14:50       Metal Gate
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ (iOS: time left)
−28:00 › BATUSHKA            ⚠ +1
19:40–20:30             Metal Gate
```

- **Live row:** name (15 bold, ellipsis) left; red dot, `LIVE` (11 bold caps, `planStrings.live`) and the
  time left (14 bold, accent) right. Line 2: time range (13, `textMuted`) left, stage (13,
  `textSecondary`) right. iOS only: a thin bar under it, yellow for the time left, on the right as the
  pill's.
- **Break row:** countdown to the next Must-see (17 bold blue), a grey chevron, the name (15 bold). Line 2
  as the live row's.
- **Clash row:** countdown to its start (15 bold red), chevron, name (15 bold); `⚠ +N` right-aligned at
  the end of the line. Line 2 as above.
- **`⚠ +N` with no clash row** (every band of the group already live): on a line of its own,
  right-aligned.
- **Countdowns:** `−48:00`, `−1:30:12`, ticking. Not the pill's `−37 min`: only a ticking clock can be
  redrawn by the OS with no updates (see Battery). Android shows `−08:12` under an hour, iOS `−8:12`.
- Names truncate with an ellipsis; countdowns, `LIVE`, the dot, `⚠ +N` and stages never shrink.

### iOS (Live Activity)

- Up to 160 pt tall: the live row, the clash row (or the `⚠ +N` line) fit.
- **Dynamic Island:** not designed. iOS requires it, so it holds the minimum: a state glyph (dot, ⚠,
  hourglass) and the countdown; expanded, the lock-screen card.
- **Stale:** each refresh hands the card its current span and the next one, with the current span's
  end as the stale date, so it switches once by itself. Without another refresh it then freezes on the
  next span with its countdowns at 0:00 (iOS can't mark it old: the stale switch is spent). When the
  day's last Must-see ends with the current span, the stale card reads "Today's Must-sees are over".
- **Refreshes:** every app open (the hand-over, below), plus background refresh when iOS grants it
  (asked for at each next change; no JS runs).
- A card lives at most 8 hours; a refresh in the front restarts one older than 7.
- No permission prompt: Live Activities have their own per-app switch in the system settings, on by
  default. The card appears at the first app open inside the window (an automatic 08:00 start needs
  iOS 26's scheduled start, which requires an alert; not used).

### Android (ongoing notification)

- Silent, ongoing, shown on the lock screen (`VISIBILITY_PUBLIC`), low-importance channel "Lock-screen
  now card".
- **Collapsed** (about 48 dp, what the lock screen shows): the top row only, plus a red `⚠` after the
  live countdown when the expanded card has a clash row or a `⚠ +N`.
- **Expanded:** all rows; a 1 px line between row 1 and row 2, with equal space above and below.
- **No progress bar:** it can only move by reposting the notification, which costs wakeups.
- **Status-bar icon** per state: dot (live), triangle (clash), hourglass (break).
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
- Dynamic Island design.
