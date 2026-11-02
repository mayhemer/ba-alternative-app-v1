import { useCallback, useSyncExternalStore } from 'react';

// ── The landed set's highlight ────────────────────────────────────────────────
//
// After a jump to a set (search, the artist sheet's "jump to timeline", My plan)
// its block or row shows a frame (ui/LandingRing). One set at a time. Each
// element asks only about its own set, so a landing renders again just the
// element it lands on, and the one it moves from.
//
// The element that shows the frame ends it (endLandingHighlight), timed from
// when it was put on screen. A clock started here, with the landing, raced the
// screen switch and the day's mount: on a phone the frame could reach the
// screen only just before such a clock ran out, or after it.
//
// A module store rather than a context: like utils/overlayHub it holds no
// rendering state of its own, and it needs no provider.

/** A landing no element ends (its set was never drawn) ends by itself after this. */
export const LANDING_UNCLAIMED_MS = 10_000;

let current: { eventId: string; token: number } | null = null;
let nextToken = 1;
let unclaimed: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => { listener(); });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Lights the set's element, replacing any other; the same set again starts over. */
export function showLandingHighlight(eventId: string): void {
  if (unclaimed !== null) {
    clearTimeout(unclaimed);
  }
  const token = nextToken;
  nextToken += 1;
  current = { eventId, token };
  unclaimed = setTimeout(() => { endLandingHighlight(token); }, LANDING_UNCLAIMED_MS);
  notify();
}

/** Ends the landing `token` names; a newer landing stays lit. */
export function endLandingHighlight(token: number): void {
  if (current === null || current.token !== token) {
    return;
  }
  if (unclaimed !== null) {
    clearTimeout(unclaimed);
    unclaimed = null;
  }
  current = null;
  notify();
}

/**
 * Non-null while the set is highlighted: a token that changes on every new
 * landing, so a ring keyed by it starts over.
 */
export function useLandingHighlight(eventId: string): number | null {
  const get = useCallback((): number | null => (current !== null && current.eventId === eventId ? current.token : null), [eventId]);
  return useSyncExternalStore(subscribe, get, get);
}
