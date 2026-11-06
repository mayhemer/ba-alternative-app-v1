import Foundation

// ── The script the app handed over, kept for the background refresh ──────────
//
// The JSON is lib/nowCard.ts's NowCardSegment[] inside modules/now-card's
// NowCardPayload; times are Unix ms. Kept in UserDefaults, so a background
// refresh can update the card without starting the JS runtime.

struct NowCardScript {
  var segments: [NowCardSegment]
  var liveLabel: String
  var nextLabel: String
  var nextShortLabel: String
  var overText: String

  /**
   * The span holding `now` and those following it without a gap, up to the end
   * of the day's card (nil when no span holds `now`). `endsDay`: the run ends
   * there, so the card ends after its last span.
   */
  func run(at now: Date) -> (spans: [NowCardSegment], endsDay: Bool)? {
    guard let i = segments.firstIndex(where: { $0.from <= now && now < $0.to }) else {
      return nil
    }
    var run = [segments[i]]
    var j = i + 1
    while j < segments.count && segments[j].from == run[run.count - 1].to {
      run.append(segments[j])
      j += 1
    }
    return (run, true)
  }

  /** The next moment the card changes after `now`: the end of its span, or the start of the next one. */
  func nextChange(after now: Date) -> Date? {
    if let spans = run(at: now)?.spans {
      return spans[0].to
    }
    return segments.first(where: { $0.from > now })?.from
  }
}

private struct SetDTO: Decodable {
  let name: String
  let stage: String
  let timeText: String
  let start: Double
  let end: Double

  var set: NowCardSet {
    NowCardSet(name: name, stage: stage, timeText: timeText, start: date(start), end: date(end))
  }
}

private struct StateDTO: Decodable {
  let kind: String
  /** In a break the set counted down to; while live the next row's set. */
  let next: SetDTO?
  let live: SetDTO?
  let nextClashes: Bool?
  let more: Int?
}

private struct SegmentDTO: Decodable {
  let from: Double
  let to: Double
  let state: StateDTO
}

private struct StringsDTO: Decodable {
  let live: String
  /** Absent in a script stored by an older app version. */
  let next: String?
  let nextShort: String?
  let over: String
}

private struct PayloadDTO: Decodable {
  let version: Int
  let segments: [SegmentDTO]
  let strings: StringsDTO
}

private func date(_ ms: Double) -> Date {
  Date(timeIntervalSince1970: ms / 1000)
}

enum NowCardStore {
  private static let scriptKey = "nowCard.script"
  private static let startedKey = "nowCard.startedAt"

  static func save(_ json: String) {
    UserDefaults.standard.set(json, forKey: scriptKey)
  }

  static func clear() {
    UserDefaults.standard.removeObject(forKey: scriptKey)
    UserDefaults.standard.removeObject(forKey: startedKey)
  }

  /** When the running card was started: it lives at most 8 h. */
  static var startedAt: Date? {
    get { UserDefaults.standard.object(forKey: startedKey) as? Date }
    set { UserDefaults.standard.set(newValue, forKey: startedKey) }
  }

  static func load() -> NowCardScript? {
    guard let json = UserDefaults.standard.string(forKey: scriptKey) else {
      return nil
    }
    return decode(json)
  }

  static func decode(_ json: String) -> NowCardScript? {
    guard let data = json.data(using: .utf8),
          let payload = try? JSONDecoder().decode(PayloadDTO.self, from: data),
          payload.version == 2 else {
      return nil
    }
    let segments: [NowCardSegment] = payload.segments.compactMap { seg in
      let isLive = seg.state.kind == "live"
      let top = isLive ? seg.state.live : seg.state.next
      guard let top else {
        return nil
      }
      return NowCardSegment(
        kind: seg.state.kind,
        top: top.set,
        next: isLive ? seg.state.next?.set : nil,
        nextClashes: isLive && (seg.state.nextClashes ?? false),
        more: seg.state.more ?? 0,
        from: date(seg.from),
        to: date(seg.to)
      )
    }
    return NowCardScript(
      segments: segments,
      liveLabel: payload.strings.live,
      nextLabel: payload.strings.next ?? "NEXT UP",
      nextShortLabel: payload.strings.nextShort ?? "NEXT",
      overText: payload.strings.over
    )
  }
}
