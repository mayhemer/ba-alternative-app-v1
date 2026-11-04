import ActivityKit
import Foundation

// ── Showing the stored script as a Live Activity ──────────────────────────────
//
// refresh() makes the card match "now": starts it, updates it, or ends it.
// Each update carries the current span and the next one, with the current
// span's end as the stale date, so the card switches to the next span once by
// itself (the extension draws `next` when `context.isStale`). Further switches
// need another refresh: the next app open, or a background refresh iOS grants.
//
// Starting needs the app in the foreground (canStart); a background refresh
// can only update a running card. A card lives at most 8 hours, so a refresh
// in the foreground restarts one that is older than 7.

enum NowCardController {
  private static let restartAfter: TimeInterval = 7 * 60 * 60

  static func refresh(now: Date = Date(), canStart: Bool) async {
    guard ActivityAuthorizationInfo().areActivitiesEnabled, let script = NowCardStore.load() else {
      await endAll()
      return
    }
    guard let span = script.spans(at: now) else {
      await endAll()
      return
    }
    let state = NowCardAttributes.ContentState(
      current: span.current,
      next: span.next,
      liveLabel: script.liveLabel,
      overText: script.overText
    )
    let content = ActivityContent(state: state, staleDate: span.current.to)

    let running = Activity<NowCardAttributes>.activities.filter {
      $0.activityState == .active || $0.activityState == .stale
    }
    for extra in running.dropFirst() {
      await extra.end(nil, dismissalPolicy: .immediate)
    }
    guard let card = running.first else {
      if canStart {
        start(content, now: now)
      }
      return
    }
    let tooOld = NowCardStore.startedAt.map { now.timeIntervalSince($0) > restartAfter } ?? true
    if canStart && tooOld {
      await card.end(nil, dismissalPolicy: .immediate)
      start(content, now: now)
    } else {
      await card.update(content)
    }
  }

  static func endAll() async {
    for card in Activity<NowCardAttributes>.activities {
      await card.end(nil, dismissalPolicy: .immediate)
    }
    NowCardStore.startedAt = nil
  }

  private static func start(_ content: ActivityContent<NowCardAttributes.ContentState>, now: Date) {
    do {
      _ = try Activity.request(attributes: NowCardAttributes(), content: content, pushType: nil)
      NowCardStore.startedAt = now
    } catch {
      // Not allowed now (app not in front, or the user turned Live Activities off): try again at the next refresh.
    }
  }
}
