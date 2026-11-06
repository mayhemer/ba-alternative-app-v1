import ActivityKit
import SwiftUI
import WidgetKit

// ── The lock-screen now card: how it looks ────────────────────────────────────
//
// Spec: docs/frontend/design/lock-screen.md; visual reference: the mockup it
// links (layout #4). Each row: the band name, then its countdown with time and
// stage on the right:
//   live   BETWEEN THE BURIED AND ME ……… +1     (22; +N: other sets live now)
//          ● LIVE -48 min …… 19:00–20:00 · Stage
//          ▔▔▔▔▔▔▔▔▔▨▨▨ (dark yellow played, yellow left; ▨ red stripes:
//                        the stretch a clashing next band overlaps)
//   next   NEXT: THE DILLINGER ESCAPE PLAN      (16; the day's next Must-see)
//          -28 min ⚠ ………… 19:40–20:30 · Stage   (blue; ⚠ red when it clashes)
//   break  NEXT UP                              (grey heading)
//          NAPALM DEATH                         (22)
//          -1 h 30 min ……… 14:00–14:50 · Stage
// A countdown line never takes a second line: a long stage ends in "…".
// Every countdown (Countdown.swift; a ticking clock before iOS 18) and the bar
// are drawn by iOS from absolute dates, so they move with no updates. Which
// span the card shows is picked each time iOS draws it (`shown`).

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
  // The card is cut off past 160 pt: live + next rows must stay within it.
  static let padding: CGFloat = 16
  static let paddingTop: CGFloat = 18
  static let paddingBottom: CGFloat = 20
  static let rowSpacing: CGFloat = 22
  /** Between the rows in the island's expanded view, which cuts the card's bottom off at 22. */
  static let islandRowSpacing: CGFloat = 12
  static let lineSpacing: CGFloat = 3
  static let meta: CGFloat = 14
  static let label: CGFloat = 12
  /** The live and next countdowns, the size of "time · stage". */
  static let countdown: CGFloat = 14
  /** The break countdown, alone on its line under the name. */
  static let breakCountdown: CGFloat = 18
  /** The next row's name, under the live row. */
  static let nextName: CGFloat = 16
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
          // Inset, so the island's round corners don't cut into the text; the
          // rows closer together, so the card fits the island's height.
          NowCardView(state: context.state, isStale: context.isStale, rowSpacing: Size.islandRowSpacing)
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
  var rowSpacing: CGFloat = Size.rowSpacing

  var body: some View {
    if let segment = shown(state, isStale: isStale) {
      VStack(alignment: .leading, spacing: rowSpacing) {
        if segment.kind == "live" {
          LiveRow(
            set: segment.top,
            label: state.liveLabel,
            more: segment.more,
            from: segment.from,
            clashFrom: segment.nextClashes ? segment.next?.start : nil
          )
          if let next = segment.next {
            NextRow(set: next, prefix: state.nextShortLabel, clashes: segment.nextClashes, from: segment.from)
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
 * right. Always one line: the status keeps its width, and when the two don't
 * fit, "time · stage" ends in "…" (the stage first). A second line could push
 * the card past iOS's 160 pt.
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
    HStack(alignment: alignment, spacing: 8) {
      status
        .layoutPriority(1)
      Spacer(minLength: 0)
      TimeAndStage(set: set)
    }
  }
}

/**
 * A row's name line: the band name (large; smaller in the next row, after
 * "NEXT:" in the time's grey) and the red "+N" at its end (the live row's).
 */
struct NameLine: View {
  let name: String
  let more: Int
  var size: CGFloat = Size.name
  var prefix: String? = nil

  var body: some View {
    HStack(alignment: .firstTextBaseline, spacing: 7) {
      nameText
        .font(.system(size: size, weight: .heavy))
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

  private var nameText: Text {
    let band = Text(name).foregroundColor(Palette.text)
    guard let prefix else {
      return band
    }
    return Text(verbatim: "\(prefix): ").foregroundColor(Palette.textMuted) + band
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
  /** When the next set clashes: its start. The bar stripes from there to the set's end. */
  var clashFrom: Date? = nil

  var body: some View {
    ZStack {
      Capsule().fill(Palette.livePassed)
      Palette.accent.mask {
        ProgressView(timerInterval: set.start...set.end, countsDown: true, label: { EmptyView() }, currentValueLabel: { EmptyView() })
          .progressViewStyle(.linear)
          .tint(.white)
          .scaleEffect(x: -1, y: Size.barHeight / 4)
      }
      if let zone = clashZone {
        GeometryReader { geo in
          ClashStripes()
            .stroke(Palette.danger, lineWidth: ClashStripes.width)
            .frame(width: geo.size.width * (zone.upperBound - zone.lowerBound))
            .clipped()
            .offset(x: geo.size.width * zone.lowerBound)
        }
      }
    }
    .clipShape(Capsule())
    .frame(height: Size.barHeight)
  }

  /** The stretch the next set overlaps, as fractions of the set: its start to the set's end. */
  private var clashZone: ClosedRange<CGFloat>? {
    guard let clashFrom, set.end > set.start, clashFrom < set.end else {
      return nil
    }
    let length = set.end.timeIntervalSince(set.start)
    let from = max(0, clashFrom.timeIntervalSince(set.start) / length)
    return CGFloat(from)...1
  }
}

/**
 * The app's clash hatch (src/ui/stripes.ts): rising 45° lines ("/"), as clash
 * stripes are everywhere (ux-principles.md), 2 pt wide, bands and gaps equally
 * wide. Stroked in red only, so the gaps show
 * what is under them: on the live bar, the time played and the time left run
 * through.
 */
struct ClashStripes: Shape {
  static let width: CGFloat = 2
  /** Horizontal spacing between line starts: at 45° the gap equals the band. */
  static let step: CGFloat = width * 2 * 2.squareRoot()

  func path(in rect: CGRect) -> Path {
    var path = Path()
    var x = rect.minX - rect.height
    while x < rect.maxX {
      path.move(to: CGPoint(x: x, y: rect.maxY))
      path.addLine(to: CGPoint(x: x + rect.height, y: rect.minY))
      x += Self.step
    }
    return path
  }
}

struct LiveRow: View {
  let set: NowCardSet
  let label: String
  let more: Int
  let from: Date
  /** The next set's start when it clashes: the bar stripes from there. */
  var clashFrom: Date? = nil

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
      LiveBar(set: set, clashFrom: clashFrom)
        .padding(.top, Size.barGap - Size.lineSpacing)
    }
  }
}

/**
 * Under the live row: the day's next Must-see, as the break row shows one
 * ("NEXT:" before the name instead of a heading line; the countdown to its
 * start blue), at the sizes the card's 160 pt leave. When it clashes with a
 * live set, a red ⚠ after the countdown; the countdown stays blue: it is the
 * time to its start, not a time it has been live.
 */
struct NextRow: View {
  let set: NowCardSet
  let prefix: String
  let clashes: Bool
  let from: Date

  var body: some View {
    VStack(alignment: .leading, spacing: Size.lineSpacing) {
      NameLine(name: set.name, more: 0, size: Size.nextName, prefix: prefix)
      StatusLine(set: set) {
        HStack(spacing: 5) {
          Countdown(to: set.start, from: from)
            .font(.system(size: Size.countdown, weight: .bold))
            .foregroundStyle(Palette.breakBlue)
          if clashes {
            Text(Image(systemName: "exclamationmark.triangle"))
              .font(.system(size: Size.countdown, weight: .semibold))
              .foregroundStyle(Palette.danger)
          }
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
 * The Dynamic Island's compact view: a glyph and a countdown.
 *   live      red dot, the time left (yellow)
 *   clash     red ⚠, the countdown to the next set's start, which clashes with
 *             a live one (blue, as the next row's)
 *   break     white ›, the countdown to the next Must-see (blue)
 * A live set whose next set doesn't clash (or with none left) shows as live.
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
    } else if let next = segment.next, segment.nextClashes {
      kind = .clash
      to = next.start
    } else {
      kind = .live
      to = segment.top.end
    }
  }

  var color: Color {
    switch kind {
    case .live: return Palette.accent
    case .clash: return Palette.breakBlue
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
