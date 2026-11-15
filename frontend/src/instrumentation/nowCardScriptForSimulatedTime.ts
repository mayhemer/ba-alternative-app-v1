import type { NowCardSegment, NowCardSet } from '../lib/nowCard';

// ── The lock-screen card under simulated time ─────────────────────────────────
//
// The phone draws the card and switches its states on its own, real clock,
// also while the app is not running (lib/nowCard: the script). Under a
// simulated time mode (timeMode.ts: live simulation, controlled E2E time) the
// app's "now" is elsewhere: Wednesday 14:10 of the festival week, while the
// phone reads this week's Wednesday 14:10. A script in festival times would lie
// wholly in the phone's past and show nothing.
//
// So every time the card runs on, the segments' spans and the sets' starts and
// ends (its countdowns and progress bars), is moved by real time minus the app's
// time: the festival's Wednesday 14:00 set goes live on the card at the real
// Wednesday 14:00. The printed times ("14:00–14:40") stay the festival's.

/** The script moved by `simulatedOffsetMs` (real time − the app's time); the same script when the clock is real. */
export function nowCardScriptForSimulatedTime(script: NowCardSegment[], simulatedOffsetMs: number): NowCardSegment[] {
  if (simulatedOffsetMs === 0) {
    return script;
  }
  const moved = (set: NowCardSet): NowCardSet => ({
    ...set,
    start: set.start + simulatedOffsetMs,
    end: set.end + simulatedOffsetMs,
  });
  return script.map((segment): NowCardSegment => {
    const from = segment.from + simulatedOffsetMs;
    const to = segment.to + simulatedOffsetMs;
    const { state } = segment;
    if (state.kind === 'break') {
      return { from, to, state: { kind: 'break', next: moved(state.next) } };
    }
    const next = state.next !== null ? moved(state.next) : null;
    return { from, to, state: { ...state, live: moved(state.live), next } };
  });
}
