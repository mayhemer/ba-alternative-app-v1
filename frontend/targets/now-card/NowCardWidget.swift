import ActivityKit
import SwiftUI
import WidgetKit

// ── The lock-screen now card: how it looks ────────────────────────────────────
//
// Spec: docs/frontend/design/lock-screen.md; visual reference: the mockup it
// links (layout #4). Each row: the band name, then its countdown with time and
// stage on the right:
//   live   BETWEEN THE BURIED AND ME            (22)
//          ● LIVE −48:00 ……… 19:00–20:00 · Stage
//          ▔▔▔▔▔▔▔▔▔▔▔▔ (dark yellow played, yellow left)
//   clash  THE DILLINGER ESCAPE PLAN ……… +1     (16)
//          −28:00 ⚠ ……………… 19:40–20:30 · Stage
//   break  NEXT UP                              (grey heading)
//          NAPALM DEATH                         (22)
//          −1:30:12 ………………… 14:00–14:50 · Stage
// When a status and "time · stage" don't fit on one line, "time · stage"
// moves under the status, right-aligned.
// Every countdown and the bar are drawn by iOS from absolute dates, so they
// move with no updates. Which span the card shows is picked each time iOS
// draws it (`shown`).

private enum Palette {
  // styling/tokens.js
  static let background = Color(hex: 0x0A0A0A)
  static let text = Color.white
  static let textSecondary = Color(hex: 0xDDDDDD)
  static let textMuted = Color(hex: 0xBBBBBB)
  static let muted = Color(hex: 0x7F7F7F)
  static let accent = Color(hex: 0xE8C84A)
  static let livePassed = Color(hex: 0x4A3F17)
  static let danger = Color(hex: 0xFF4444)
  static let breakBlue = Color(hex: 0x5B9BFF)
}

private enum Size {
  // The card is cut off past 160 pt: live + clash rows must stay within it.
  static let padding: CGFloat = 16
  static let paddingTop: CGFloat = 18
  static let paddingBottom: CGFloat = 20
  static let rowSpacing: CGFloat = 22
  static let lineSpacing: CGFloat = 3
  static let meta: CGFloat = 14
  static let label: CGFloat = 12
  /** The live and clash countdowns, the size of "time · stage". */
  static let countdown: CGFloat = 14
  /** The break countdown, alone on its line under the name. */
  static let breakCountdown: CGFloat = 18
  /** The clash row's name and +N. */
  static let clashName: CGFloat = 16
  static let heading: CGFloat = 13
  static let name: CGFloat = 22
  static let more: CGFloat = 17
  static let barHeight: CGFloat = 5
  static let barGap: CGFloat = 8
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
        .padding(.horizontal, Size.padding)
        .padding(.top, Size.paddingTop)
        .padding(.bottom, Size.paddingBottom)
        .activityBackgroundTint(Palette.background.opacity(0.95))
        .activitySystemActionForegroundColor(Palette.text)
        .widgetURL(cardURL)
    } dynamicIsland: { context in
      // Compact: the state's glyph on the left, its countdown on the right
      // (IslandState); minimal: the glyph; expanded: the lock-screen card.
      let island = IslandState(shown(context.state, isStale: context.isStale))
      return DynamicIsland {
        DynamicIslandExpandedRegion(.bottom) {
          // Inset, so the island's round corners don't cut into the text.
          NowCardView(state: context.state, isStale: context.isStale)
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
        }
      } compactLeading: {
        // Nudged in from the island's rounded edge.
        island?.glyph
          .padding(.leading, 4)
      } compactTrailing: {
        if let island {
          Countdown(to: island.to, from: island.from)
            .font(.system(size: 14, weight: .bold))
            .foregroundStyle(island.color)
        }
      } minimal: {
        island?.glyph
      }
      .widgetURL(cardURL)
    }
  }
}

/**
 * The span the card draws: the one holding the moment iOS draws it (nil: the
 * day is over). Once stale, never the first: iOS may draw a moment early.
 * Past the last span it stays on it, frozen, unless the day ends there.
 */
func shown(_ state: NowCardAttributes.ContentState, isStale: Bool, now: Date = Date()) -> NowCardSegment? {
  guard let first = state.spans.first, let last = state.spans.last else {
    return nil
  }
  let at = isStale ? max(now, first.to) : now
  if let span = state.spans.first(where: { $0.from <= at && at < $0.to }) {
    return span
  }
  if at >= last.to {
    return state.endsDay ? nil : last
  }
  return first
}

struct NowCardView: View {
  let state: NowCardAttributes.ContentState
  let isStale: Bool

  var body: some View {
    if let segment = shown(state, isStale: isStale) {
      VStack(alignment: .leading, spacing: Size.rowSpacing) {
        if segment.kind == "live" {
          // +N goes to the clash row; with no clash row (every clashing band is
          // live), to the live row's name line.
          LiveRow(set: segment.top, label: state.liveLabel, more: segment.clash == nil ? segment.more : 0, from: segment.from)
          if let clash = segment.clash {
            ClashRow(set: clash, more: segment.more, from: segment.from)
          }
        } else {
          BreakRow(set: segment.top, heading: state.nextLabel, from: segment.from)
        }
      }
    } else {
      Text(state.overText)
        .font(.system(size: 15))
        .foregroundStyle(Palette.textSecondary)
        .frame(maxWidth: .infinity)
    }
  }
}

/**
 * "−48:00", "−1:30:12": a countdown iOS draws on its own, stopping at 0:00.
 *
 * iOS draws the ticking text in its own process and can't tell this layout how
 * wide it will get, so a timer text takes all the width it's offered. It is
 * laid over an invisible sample in the same font instead, which gives it a
 * fixed width that follows the font size. The sample matches the text when the
 * card is drawn (each refresh, and the stale switch): "−0:00:00" from an hour
 * left, "−00:00" from 10 minutes, "−0:00" below. A text that gets shorter
 * before the next drawing (crossing 1 hour or 10 minutes) leaves a gap; the
 * alignment says on which side: `.trailing` keeps it away from what follows.
 */
struct Countdown: View {
  let to: Date
  let from: Date
  var alignment: Alignment = .leading

  var body: some View {
    let left = to.timeIntervalSince(min(max(from, Date()), to))
    let sample = left >= 3600 ? "0:00:00" : (left >= 600 ? "00:00" : "0:00")
    // Built as the countdown is (the minus a text of its own), plus 1 pt, so it is never narrower.
    HStack(spacing: 0) {
      Text("\u{2212}")
      Text(sample)
        .monospacedDigit()
    }
    .lineLimit(1)
    .padding(.trailing, 1)
    .hidden()
    .overlay(alignment: alignment) {
      HStack(spacing: 0) {
        Text("\u{2212}")
        Text(timerInterval: min(from, to)...to, countsDown: true)
          .monospacedDigit()
      }
      .lineLimit(1)
    }
    .fixedSize()
  }
}

/** "19:00–20:00 · Stage": the time muted, the stage bold and brighter. */
struct TimeAndStage: View {
  let set: NowCardSet

  var body: some View {
    (Text(set.timeText).foregroundColor(Palette.textMuted).monospacedDigit()
      + Text(" · ").foregroundColor(Palette.textMuted)
      + Text(set.stage).foregroundColor(Palette.textSecondary).bold())
      .font(.system(size: Size.meta))
      .lineLimit(1)
      .truncationMode(.tail)
  }
}

/**
 * A row's countdown line: its status on the left, "time · stage" on the
 * right; when they don't fit side by side, "time · stage" goes under the
 * status, right-aligned.
 */
struct StatusLine<Status: View>: View {
  let set: NowCardSet
  /** `.firstTextBaseline` when the status is one text of another size (the break row's countdown). */
  var alignment: VerticalAlignment = .center
  let status: Status

  init(set: NowCardSet, alignment: VerticalAlignment = .center, @ViewBuilder status: () -> Status) {
    self.set = set
    self.alignment = alignment
    self.status = status()
  }

  var body: some View {
    ViewThatFits(in: .horizontal) {
      HStack(alignment: alignment, spacing: 8) {
        status
        Spacer(minLength: 0)
        TimeAndStage(set: set).fixedSize()
      }
      VStack(alignment: .leading, spacing: 2) {
        status
        HStack(spacing: 0) {
          Spacer(minLength: 0)
          TimeAndStage(set: set)
        }
      }
    }
  }
}

/** A row's name line: the band name (large; smaller in the clash row) and the red "+N" at its end. */
struct NameLine: View {
  let name: String
  let more: Int
  var size: CGFloat = Size.name

  var body: some View {
    HStack(alignment: .firstTextBaseline, spacing: 7) {
      Text(name)
        .font(.system(size: size, weight: .heavy))
        .foregroundStyle(Palette.text)
        .lineLimit(1)
        .truncationMode(.tail)
      Spacer(minLength: 3)
      if more > 0 {
        Text("+\(more)")
          .font(.system(size: min(Size.more, size), weight: .bold))
          .monospacedDigit()
          .foregroundStyle(Palette.danger)
          .fixedSize()
      }
    }
  }
}

/**
 * The live set's bar, as the now pill's: dark yellow for the time played, from
 * the left; yellow for the time left. iOS moves it on its own, but draws its
 * own grey track, so the timed bar only masks the yellow, over a dark yellow
 * base; the mirror makes it drain towards the right.
 */
struct LiveBar: View {
  let set: NowCardSet

  var body: some View {
    ZStack {
      Capsule().fill(Palette.livePassed)
      Palette.accent.mask {
        ProgressView(timerInterval: set.start...set.end, countsDown: true, label: { EmptyView() }, currentValueLabel: { EmptyView() })
          .progressViewStyle(.linear)
          .tint(.white)
          .scaleEffect(x: -1, y: Size.barHeight / 4)
      }
      .clipShape(Capsule())
    }
    .frame(height: Size.barHeight)
  }
}

struct LiveRow: View {
  let set: NowCardSet
  let label: String
  let more: Int
  let from: Date

  var body: some View {
    VStack(alignment: .leading, spacing: Size.lineSpacing) {
      NameLine(name: set.name, more: more)
      StatusLine(set: set) {
        HStack(spacing: 6) {
          Circle()
            .fill(Palette.danger)
            .frame(width: 7, height: 7)
          Text(label)
            .font(.system(size: Size.label, weight: .bold))
            .kerning(0.9)
            .foregroundStyle(Palette.text)
          Countdown(to: set.end, from: from)
            .font(.system(size: Size.countdown, weight: .bold))
            .foregroundStyle(Palette.accent)
        }
        .fixedSize()
      }
      LiveBar(set: set)
        .padding(.top, Size.barGap - Size.lineSpacing)
    }
  }
}

struct ClashRow: View {
  let set: NowCardSet
  let more: Int
  let from: Date

  var body: some View {
    VStack(alignment: .leading, spacing: Size.lineSpacing) {
      NameLine(name: set.name, more: more, size: Size.clashName)
      StatusLine(set: set) {
        HStack(spacing: 5) {
          Countdown(to: set.start, from: from)
            .font(.system(size: Size.countdown, weight: .bold))
            .foregroundStyle(Palette.danger)
          Text(Image(systemName: "exclamationmark.triangle"))
            .font(.system(size: Size.countdown, weight: .semibold))
            .foregroundStyle(Palette.danger)
        }
        .fixedSize()
      }
    }
  }
}

struct BreakRow: View {
  let set: NowCardSet
  let heading: String
  let from: Date

  var body: some View {
    VStack(alignment: .leading, spacing: Size.lineSpacing) {
      Text(heading)
        .font(.system(size: Size.heading, weight: .semibold))
        .kerning(0.6)
        .foregroundStyle(Palette.muted)
      NameLine(name: set.name, more: 0)
      StatusLine(set: set, alignment: .firstTextBaseline) {
        Countdown(to: set.start, from: from)
          .font(.system(size: Size.breakCountdown, weight: .bold))
          .foregroundStyle(Palette.breakBlue)
      }
    }
  }
}

/**
 * The Dynamic Island's compact view: a glyph and a countdown, both in the
 * state's colour.
 *   live      red dot, the time left (yellow)
 *   clash     red ⚠, the countdown to the clashing set's start (red, as the clash row's)
 *   break     white ›, the countdown to the next Must-see (blue)
 * A live set whose clash group is all live (`+N`, no clash row) has no set to
 * count down to, so it shows as live.
 */
struct IslandState {
  enum Kind { case live, clash, rest }

  let kind: Kind
  let to: Date
  let from: Date

  init?(_ segment: NowCardSegment?) {
    guard let segment else {
      return nil
    }
    from = segment.from
    if segment.kind != "live" {
      kind = .rest
      to = segment.top.start
    } else if let clash = segment.clash {
      kind = .clash
      to = clash.start
    } else {
      kind = .live
      to = segment.top.end
    }
  }

  var color: Color {
    switch kind {
    case .live: return Palette.accent
    case .clash: return Palette.danger
    case .rest: return Palette.breakBlue
    }
  }

  @ViewBuilder var glyph: some View {
    switch kind {
    case .live:
      Circle().fill(Palette.danger).frame(width: 9, height: 9)
    case .clash:
      Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(Palette.danger)
    case .rest:
      // The bold white "›" the break row had in layouts #1–#3.
      Image(systemName: "chevron.right")
        .font(.system(size: 14, weight: .black))
        .foregroundStyle(Palette.text)
    }
  }
}
