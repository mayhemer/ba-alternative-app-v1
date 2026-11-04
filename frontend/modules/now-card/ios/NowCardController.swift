import ActivityKit
import Foundation

// ── Showing the stored script as a Live Activity ──────────────────────────────
//
// refresh() makes the card match "now": starts it, updates it, or ends it.
// Each update carries the spans from now on (as many as fit ActivityKit's
// 4 KB), with the current span's end as the stale date. iOS draws the card
// again at least then, and the extension shows the span holding the moment of
// drawing: so the first switch is sure, later ones happen whenever iOS draws
// the card again on its own (not documented when, or whether), and otherwise
// at the next refresh: the next app open, or a background refresh iOS grants.
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
    guard let run = script.run(at: now) else {
      await endAll()
      return
    }
    let state = fitting(NowCardAttributes.ContentState(
      spans: run.spans,
      endsDay: run.endsDay,
      liveLabel: script.liveLabel,
      nextLabel: script.nextLabel,
      overText: script.overText
    ))
    let content = ActivityContent(state: state, staleDate: run.spans[0].to)

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

  /** ActivityKit refuses content over 4 KB: drops spans from the end until it fits, with room to spare. */
  static let maxContentBytes = 3_500

  static func fitting(_ state: NowCardAttributes.ContentState) -> NowCardAttributes.ContentState {
    var state = state
    while state.spans.count > 1, (try? JSONEncoder().encode(state).count) ?? Int.max > maxContentBytes {
      state.spans.removeLast()
      state.endsDay = false
    }
    return state
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
