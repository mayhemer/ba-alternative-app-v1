package cz.janbambas.nowcard

import android.content.Context
import org.json.JSONObject

// ── The script the app handed over ────────────────────────────────────────────
//
// lib/nowCard.ts's NowCardSegment[] inside modules/now-card's NowCardPayload,
// as JSON; times are Unix ms. Kept in SharedPreferences, so the alarms and the
// boot receiver can redraw the card without starting the JS runtime.

data class CardSet(
  val name: String,
  val stage: String,
  /** "19:00–20:00" in festival time. */
  val timeText: String,
  val start: Long,
  val end: Long,
)

/** One state of the card and the time it holds: from (inclusive) to (exclusive). */
data class CardSegment(
  /** "break": `top` is the next Must-see. "live": `top` is the latest live one. */
  val kind: String,
  val top: CardSet,
  val clash: CardSet?,
  /** The clash group's unfinished bands not on the card (`⚠ +N`). */
  val more: Int,
  val from: Long,
  val to: Long,
) {
  val isLive: Boolean get() = kind == "live"
  /** The clashing bands the card doesn't name (`⚠ +N`): the next clashing one and the group's others. */
  val unnamedClashes: Int get() = if (isLive) (if (clash != null) 1 else 0) + more else 0
}

class CardScript(
  val segments: List<CardSegment>,
  val liveLabel: String,
  /** Before the next Must-see's name in a break, with a colon: "NEXT" / "DALŠÍ". */
  val nextLabel: String,
  val channelName: String,
  val url: String,
) {
  fun spanAt(now: Long): CardSegment? = segments.firstOrNull { it.from <= now && now < it.to }

  /** The next moment the card changes after `now`: the end of its span, or the next span's start. */
  fun nextChange(now: Long): Long? = spanAt(now)?.to ?: segments.firstOrNull { it.from > now }?.from

  /** Where the run of back-to-back spans holding `now` ends: the end of the day's card. */
  fun windowEnd(now: Long): Long? {
    var current = spanAt(now) ?: return null
    for (segment in segments) {
      if (segment.from == current.to) {
        current = segment
      }
    }
    return current.to
  }

  companion object {
    fun parse(json: String): CardScript? = try {
      val root = JSONObject(json)
      if (root.getInt("version") != 1) {
        null
      } else {
        val strings = root.getJSONObject("strings")
        val list = root.getJSONArray("segments")
        val segments = (0 until list.length()).mapNotNull { i -> segment(list.getJSONObject(i)) }
        CardScript(
          segments,
          strings.getString("live"),
          // Absent in a script stored by an older app version.
          strings.optString("nextShort", "NEXT"),
          strings.getString("channel"),
          root.getString("url"),
        )
      }
    } catch (e: Exception) {
      null
    }

    private fun segment(json: JSONObject): CardSegment? {
      val state = json.getJSONObject("state")
      val kind = state.getString("kind")
      val top = cardSet(state.optJSONObject(if (kind == "live") "live" else "next")) ?: return null
      return CardSegment(
        kind = kind,
        top = top,
        clash = cardSet(state.optJSONObject("clash")),
        more = state.optInt("more", 0),
        from = json.getLong("from"),
        to = json.getLong("to"),
      )
    }

    private fun cardSet(json: JSONObject?): CardSet? = json?.let {
      CardSet(
        name = it.getString("name"),
        stage = it.getString("stage"),
        timeText = it.getString("timeText"),
        start = it.getLong("start"),
        end = it.getLong("end"),
      )
    }
  }
}

/** The card's own storage: the script, the user's switch, and a dismissal. */
class NowCardStore(context: Context) {
  private val prefs = context.getSharedPreferences("nowCard", Context.MODE_PRIVATE)

  var scriptJson: String?
    get() = prefs.getString("script", null)
    set(value) = prefs.edit().putString("script", value).apply()

  val script: CardScript? get() = scriptJson?.let { CardScript.parse(it) }

  /** Settings' switch; on by default. */
  var enabled: Boolean
    get() = prefs.getBoolean("enabled", true)
    set(value) = prefs.edit().putBoolean("enabled", value).apply()

  /** Swiped away: hidden until this moment, the end of that day's card. */
  var dismissedUntil: Long
    get() = prefs.getLong("dismissedUntil", 0L)
    set(value) = prefs.edit().putLong("dismissedUntil", value).apply()

  fun clear() {
    prefs.edit().remove("script").remove("dismissedUntil").apply()
  }
}
