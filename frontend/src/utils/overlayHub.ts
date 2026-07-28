// Screen-exclusivity hub.
//
// Overlays that must not be shown at the same time (nav drawer, lens panel, …)
// register a `close` callback here instead of knowing about each other. When one
// is about to open it tells the hub, and the hub closes every *other* member.
// That keeps the "not myself" rule in one place, and adding a third overlay
// costs one registration rather than edits to all the existing ones.
//
// Deliberately not a React context: the hub holds no rendering state, only
// callbacks, so it needs no provider and causes no re-renders. Membership is
// keyed by object identity, so two overlays can never collide.

export type ExclusiveOverlay = {
  /** Must be idempotent — it is called whenever any sibling opens. */
  close: () => void;
};

const registry = new Map<object, ExclusiveOverlay>();

/**
 * Join the hub. Returns the unregister function, so callers can hand it
 * straight back from a `useEffect`.
 */
export function register(id: object, overlay: ExclusiveOverlay): () => void {
  registry.set(id, overlay);
  return () => { registry.delete(id); };
}

/**
 * Announce that `opening` is about to be shown: closes every other member and
 * leaves `opening` untouched. Pass `null` to close all of them.
 */
export function onOpening(opening: object | null): void {
  for (const [id, overlay] of registry) {
    if (id !== opening) {
      overlay.close();
    }
  }
}
