import SwiftUI

// ── The now card's countdowns: one style per iOS version ──────────────────────
//
// Every countdown on the card and in the Dynamic Island is a `Countdown`. It
// picks the newest style this iOS can draw:
//   iOS 18+      MinutesCountdown   "-1 h 20 min", "-32 min"   (minus by iOS, U+002D)
//   iOS 16.4+    ClockCountdown     "−48:00", "−1:30:12"       (minus ours, U+2212)
// Each style is self-contained: its ticking text and the invisible sample that
// sizes it (SizedCountdown) are built together. To support an older iOS, add a
// style here and a branch in `Countdown.body`; nothing else on the card changes.
//
// iOS draws the ticking text in its own process, so every style uses a text
// iOS updates on its own, with no refresh from the app.

struct Countdown: View {
  let to: Date
  let from: Date
  var alignment: Alignment = .leading

  var body: some View {
    if #available(iOS 18.0, *) {
      MinutesCountdown(to: to, from: from, alignment: alignment)
    } else {
      ClockCountdown(to: to, from: from, alignment: alignment)
    }
  }
}

/** Seconds left at the moment the card is drawn; counted from `from` while that is still ahead. */
private func secondsLeft(to: Date, from: Date, now: Date = Date()) -> TimeInterval {
  to.timeIntervalSince(min(max(from, now), to))
}

/**
 * "-1 h 20 min", "-32 min", "0 min" (iOS 18+): whole minutes, short, the same
 * on the bright and the dimmed always-on screen.
 *
 * iOS hands the format the time to the end as a negative duration
 * (`durationOffset(to:)`), so the minus is the format's own, a hyphen-minus
 * (U+002D). Past the end it counts up without a minus ("2 min"): only on a card
 * iOS hasn't drawn again since the switch (the dimmed screen until it wakes).
 *
 * The dimmed screen is redrawn rarely. iOS trims a text whose parts are
 * labelled (hours, minutes) to what that allows, and blanks the digits of any
 * other. This format's attributed output labels its parts, and it changes once
 * a minute. Rounded to the nearest minute, as the app's `formatDuration`.
 *
 * Czech short units in either app language: "h" and "min", as the app's. The
 * locale is set on the format and on the text, so it holds whatever SwiftUI
 * resolves. Short, so a countdown line never needs a second line.
 */
@available(iOS 18.0, *)
private struct MinutesCountdown: View {
  let to: Date
  let from: Date
  let alignment: Alignment

  private static let locale = Locale(identifier: "cs_CZ")
  private static let format = Duration.UnitsFormatStyle(
    allowedUnits: [.hours, .minutes],
    width: .condensedAbbreviated,
    fractionalPart: .hide(rounded: .toNearestOrAwayFromZero)
  ).locale(locale)

  var body: some View {
    SizedCountdown(sample: sample(left: secondsLeft(to: to, from: from)), alignment: alignment) {
      Text(.durationOffset(to: to), format: Self.format.attributed)
        .environment(\.locale, Self.locale)
    }
  }

  /**
   * The widest text from now until the card is drawn again: from an hour, the
   * hours as they are now with two-digit minutes ("-1 h 59 min"); below, two
   * digits ("-59 min"), which also covers a count past the end ("12 min").
   */
  private func sample(left: TimeInterval) -> String {
    let widest = left >= 3600 ? (left / 3600).rounded(.down) * 3600 + 59 * 60 : 59 * 60
    return Self.format.format(.seconds(-widest))
  }
}

/** "−48:00", "−1:30:12": a clock iOS draws on its own, stopping at 0:00 (iOS 16.4+). */
private struct ClockCountdown: View {
  let to: Date
  let from: Date
  let alignment: Alignment

  var body: some View {
    let left = secondsLeft(to: to, from: from)
    // "0:00:00" from an hour left, "00:00" from 10 minutes, "0:00" below.
    let sample = left >= 3600 ? "0:00:00" : (left >= 600 ? "00:00" : "0:00")
    SizedCountdown(sample: sample, prefix: "\u{2212}", alignment: alignment) {
      Text(timerInterval: min(from, to)...to, countsDown: true)
    }
  }
}

/**
 * A ticking text (after our own `prefix`, if any), sized by an invisible sample.
 *
 * iOS can't tell this layout how wide the ticking text will get, so on its own
 * it takes all the width it's offered. It is laid over a hidden `sample` in the
 * same font instead, which gives it a fixed width that follows the font size.
 * The sample is the widest text until the card is drawn again (each refresh,
 * and the stale switch). A text that gets shorter meanwhile leaves a gap; the
 * alignment says on which side: `.trailing` keeps it away from what follows.
 */
private struct SizedCountdown<Ticking: View>: View {
  let sample: String
  var prefix: String? = nil
  let alignment: Alignment
  let ticking: Ticking

  init(sample: String, prefix: String? = nil, alignment: Alignment, @ViewBuilder ticking: () -> Ticking) {
    self.sample = sample
    self.prefix = prefix
    self.alignment = alignment
    self.ticking = ticking()
  }

  var body: some View {
    // Built as the countdown is (the prefix a text of its own), plus 1 pt, so it is never narrower.
    HStack(spacing: 0) {
      if let prefix {
        Text(verbatim: prefix)
      }
      Text(verbatim: sample)
        .monospacedDigit()
    }
    .lineLimit(1)
    .padding(.trailing, 1)
    .hidden()
    .overlay(alignment: alignment) {
      HStack(spacing: 0) {
        if let prefix {
          Text(verbatim: prefix)
        }
        ticking
          .monospacedDigit()
      }
      .lineLimit(1)
    }
    .fixedSize()
  }
}
