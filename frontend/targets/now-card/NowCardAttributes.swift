// ── The lock-screen now card: what a Live Activity carries ────────────────────
//
// KEEP IDENTICAL to targets/now-card/NowCardAttributes.swift: the app (this
// module) starts and updates the activity, the widget extension draws it, and
// ActivityKit hands the state between them by this type. A Jest test
// (modules/now-card/nativeCopies.test.ts) fails when the copies differ.

import ActivityKit
import Foundation

/** One set as the card draws it: texts in festival time, absolute times. */
struct NowCardSet: Codable, Hashable {
  var name: String
  var stage: String
  /** "19:00–20:00" in festival time. */
  var timeText: String
  var start: Date
  var end: Date
}

/** One state of the card and the time it holds (lib/nowCard.ts, NowCardSegment). */
struct NowCardSegment: Codable, Hashable {
  /** "break": `top` is the next Must-see. "live": `top` is the latest live one. */
  var kind: String
  var top: NowCardSet
  /** The next Must-see clashing with a live one; live only. */
  var clash: NowCardSet?
  /** The clash group's unfinished bands not on the card (`⚠ +N`); 0 shows nothing. */
  var more: Int
  var from: Date
  var to: Date
}

struct NowCardAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    /**
     * The card's states from now on, in order and without gaps: the first holds
     * the moment the content was sent, its end is the stale date. At most what
     * fits ActivityKit's 4 KB. Each time iOS draws the card, it shows the one
     * holding that moment.
     */
    var spans: [NowCardSegment]
    /** Whether the day's card ends with the last span (then `overText`); false when the list was cut to fit. */
    var endsDay: Bool
    /** The live row's label: "LIVE" / "HRAJE". */
    var liveLabel: String
    /** The break row's heading: "NEXT UP" / "NÁSLEDUJE". */
    var nextLabel: String
    /** Shown after the last span when `endsDay`: the day is over. */
    var overText: String
  }
}
