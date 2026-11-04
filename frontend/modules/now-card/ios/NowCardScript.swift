import Foundation

// ── The script the app handed over, kept for the background refresh ──────────
//
// The JSON is lib/nowCard.ts's NowCardSegment[] inside modules/now-card's
// NowCardPayload; times are Unix ms. Kept in UserDefaults, so a background
// refresh can update the card without starting the JS runtime.

struct NowCardScript {
  var segments: [NowCardSegment]
  var liveLabel: String
  var overText: String

  /** The span holding `now`, and the one right after it if it follows without a gap. */
  func spans(at now: Date) -> (current: NowCardSegment, next: NowCardSegment?)? {
    guard let i = segments.firstIndex(where: { $0.from <= now && now < $0.to }) else {
      return nil
    }
    let current = segments[i]
    let following = i + 1 < segments.count ? segments[i + 1] : nil
    return (current, following?.from == current.to ? following : nil)
  }

  /** The next moment the card changes after `now`: the end of its span, or the start of the next one. */
  func nextChange(after now: Date) -> Date? {
    if let span = spans(at: now) {
      return span.current.to
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
  let next: SetDTO?
  let live: SetDTO?
  let clash: SetDTO?
  let more: Int?
}

private struct SegmentDTO: Decodable {
  let from: Double
  let to: Double
  let state: StateDTO
}

private struct StringsDTO: Decodable {
  let live: String
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
          payload.version == 1 else {
      return nil
    }
    let segments: [NowCardSegment] = payload.segments.compactMap { seg in
      let top = seg.state.kind == "live" ? seg.state.live : seg.state.next
      guard let top else {
        return nil
      }
      return NowCardSegment(
        kind: seg.state.kind,
        top: top.set,
        clash: seg.state.clash?.set,
        more: seg.state.more ?? 0,
        from: date(seg.from),
        to: date(seg.to)
      )
    }
    return NowCardScript(segments: segments, liveLabel: payload.strings.live, overText: payload.strings.over)
  }
}
