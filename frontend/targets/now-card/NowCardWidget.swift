import ActivityKit
import SwiftUI
import WidgetKit

// ── The lock-screen now card: how it looks ────────────────────────────────────
//
// Spec: docs/frontend/design/lock-screen.md; visual reference: the mockup it
// links. Rows are My plan's two lines without frame or fill:
//   live   NAME ……………… ● LIVE −48:00     break  −1:30:12 › NAME
//          19:00–20:00 …… Stage                    19:00–20:00 …… Stage
//          ▔▔▔▔▔▔▔▔▔▔ (time left, yellow)
//   clash  −28:00 › NAME ………… ⚠ +1
//          19:40–20:30 …… Stage
// Every countdown and the bar are drawn by iOS from absolute dates, so they
// move with no updates. Once stale (the current span is over) the card draws
// the next span it was given, or the day's end.

private enum Palette {
  // styling/tokens.js
  static let background = Color(hex: 0x0A0A0A)
  static let text = Color.white
  static let textSecondary = Color(hex: 0xDDDDDD)
  static let textMuted = Color(hex: 0xBBBBBB)
  static let accent = Color(hex: 0xE8C84A)
  static let danger = Color(hex: 0xFF4444)
  static let breakBlue = Color(hex: 0x5B9BFF)
}

private extension Color {
  init(hex: UInt32) {
    self.init(
      red: Double((hex >> 16) & 0xFF) / 255,
      green: Double((hex >> 8) & 0xFF) / 255,
      blue: Double(hex & 0xFF) / 255
    )
  }
}

private let cardURL = URL(string: "ba://my-plan/now")

@main
struct NowCardBundle: WidgetBundle {
  var body: some Widget {
    NowCardLiveActivity()
  }
}

struct NowCardLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: NowCardAttributes.self) { context in
      NowCardView(state: context.state, isStale: context.isStale)
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .activityBackgroundTint(Palette.background.opacity(0.95))
        .activitySystemActionForegroundColor(Palette.text)
        .widgetURL(cardURL)
    } dynamicIsland: { context in
      // Not designed for v1: iOS requires these regions, so they hold the bare minimum.
      let segment = shown(context.state, isStale: context.isStale)
      return DynamicIsland {
        DynamicIslandExpandedRegion(.bottom) {
          NowCardView(state: context.state, isStale: context.isStale)
        }
      } compactLeading: {
        StateGlyph(segment: segment)
      } compactTrailing: {
        if let segment {
          Countdown(to: segment.kind == "live" ? segment.top.end : segment.top.start, from: segment.from)
            .font(.system(size: 14, weight: .bold))
            .foregroundStyle(segment.kind == "live" ? Palette.accent : Palette.breakBlue)
            .frame(maxWidth: 64)
        }
      } minimal: {
        StateGlyph(segment: segment)
      }
      .widgetURL(cardURL)
    }
  }
}

/** The span the card draws: the current one, or once stale the next (nil: the day is over). */
private func shown(_ state: NowCardAttributes.ContentState, isStale: Bool) -> NowCardSegment? {
  isStale ? state.next : state.current
}

struct NowCardView: View {
  let state: NowCardAttributes.ContentState
  let isStale: Bool

  var body: some View {
    if let segment = shown(state, isStale: isStale) {
      VStack(alignment: .leading, spacing: 10) {
        if segment.kind == "live" {
          LiveRow(set: segment.top, label: state.liveLabel, from: segment.from)
          if let clash = segment.clash {
            ClashRow(set: clash, more: segment.more, from: segment.from)
          } else if segment.more > 0 {
            HStack {
              Spacer()
              More(count: segment.more)
            }
          }
        } else {
          BreakRow(set: segment.top, from: segment.from)
        }
      }
    } else {
      Text(state.overText)
        .font(.system(size: 14))
        .foregroundStyle(Palette.textSecondary)
        .frame(maxWidth: .infinity)
    }
  }
}

/**
 * "−48:00", "−1:30:12": a countdown iOS draws on its own, stopping at 0:00.
 * Sized for its longest text from `from`, the span's start, so a short one
 * does not leave a gap and a long one is never cut.
 */
struct Countdown: View {
  let to: Date
  let from: Date

  var body: some View {
    HStack(spacing: 0) {
      Text("\u{2212}")
      Text(timerInterval: min(from, to)...to, countsDown: true)
        .monospacedDigit()
        .frame(width: to.timeIntervalSince(from) >= 3600 ? 62 : 44, alignment: .leading)
    }
  }
}

/** Row 2 of every row: time range left, stage right. */
struct TimeAndStage: View {
  let set: NowCardSet

  var body: some View {
    HStack {
      Text(set.timeText)
        .font(.system(size: 13))
        .monospacedDigit()
        .foregroundStyle(Palette.textMuted)
      Spacer(minLength: 8)
      Text(set.stage)
        .font(.system(size: 13))
        .foregroundStyle(Palette.textSecondary)
        .lineLimit(1)
    }
  }
}

struct LiveRow: View {
  let set: NowCardSet
  let label: String
  let from: Date

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      HStack(spacing: 6) {
        Text(set.name)
          .font(.system(size: 15, weight: .bold))
          .foregroundStyle(Palette.text)
          .lineLimit(1)
          .truncationMode(.tail)
          .layoutPriority(0)
        Spacer(minLength: 6)
        Circle()
          .fill(Palette.danger)
          .frame(width: 7, height: 7)
        Text(label)
          .font(.system(size: 11, weight: .bold))
          .kerning(0.9)
          .foregroundStyle(Palette.text)
          .fixedSize()
        Countdown(to: set.end, from: from)
          .font(.system(size: 14, weight: .bold))
          .foregroundStyle(Palette.accent)
          .fixedSize()
      }
      TimeAndStage(set: set)
      // The yellow part is the time left, on the right, as the now pill's bar:
      // a draining bar, mirrored so it shrinks towards the right.
      ProgressView(timerInterval: set.start...set.end, countsDown: true, label: { EmptyView() }, currentValueLabel: { EmptyView() })
        .progressViewStyle(.linear)
        .tint(Palette.accent)
        .scaleEffect(x: -1, y: 1)
    }
  }
}

struct BreakRow: View {
  let set: NowCardSet
  let from: Date

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      HStack(spacing: 7) {
        Countdown(to: set.start, from: from)
          .font(.system(size: 17, weight: .bold))
          .foregroundStyle(Palette.breakBlue)
          .fixedSize()
        Chevron()
        Text(set.name)
          .font(.system(size: 15, weight: .bold))
          .foregroundStyle(Palette.text)
          .lineLimit(1)
          .truncationMode(.tail)
        Spacer(minLength: 0)
      }
      TimeAndStage(set: set)
    }
  }
}

struct ClashRow: View {
  let set: NowCardSet
  let more: Int
  let from: Date

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      HStack(spacing: 7) {
        Countdown(to: set.start, from: from)
          .font(.system(size: 15, weight: .bold))
          .foregroundStyle(Palette.danger)
          .fixedSize()
        Chevron()
        Text(set.name)
          .font(.system(size: 15, weight: .bold))
          .foregroundStyle(Palette.text)
          .lineLimit(1)
          .truncationMode(.tail)
        Spacer(minLength: 6)
        if more > 0 {
          More(count: more)
        }
      }
      TimeAndStage(set: set)
    }
  }
}

struct Chevron: View {
  var body: some View {
    Image(systemName: "chevron.right")
      .font(.system(size: 11, weight: .bold))
      .foregroundStyle(Palette.textMuted)
  }
}

/** "⚠ +2": the clash group's bands the card doesn't show. */
struct More: View {
  let count: Int

  var body: some View {
    HStack(spacing: 2) {
      Image(systemName: "exclamationmark.triangle")
        .font(.system(size: 13, weight: .semibold))
      Text("+\(count)")
        .font(.system(size: 14, weight: .bold))
        .monospacedDigit()
    }
    .foregroundStyle(Palette.danger)
    .fixedSize()
  }
}

/** The Dynamic Island's glyph: ⚠ in a clash, the live dot, or an hourglass in a break. */
struct StateGlyph: View {
  let segment: NowCardSegment?

  var body: some View {
    if let segment {
      if segment.kind == "live" && (segment.clash != nil || segment.more > 0) {
        Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(Palette.danger)
      } else if segment.kind == "live" {
        Circle().fill(Palette.danger).frame(width: 9, height: 9)
      } else {
        Image(systemName: "hourglass").foregroundStyle(Palette.breakBlue)
      }
    }
  }
}
