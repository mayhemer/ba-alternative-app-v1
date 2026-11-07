// Screen-exclusivity hub.
//
// Overlays that must not be shown at the same time (nav drawer, lens panel, …)
// register a `close` callback here instead of knowing about each other. When one
// is about to open it tells the hub, and the hub closes every *other* member.
// That keeps the "not myself" rule in one place, and adding a third overlay
// costs one registration rather than edits to all the existing ones.
//
// Close-only members (the detail sheets, the star selector) may sit over the
// exclusive ones — the artist sheet opens over the search results — so an
// opening leaves them alone. closeAll closes both kinds: a tap on the
// lock-screen now card clears the screen with it.
//
// Deliberately not a React context: the hub holds no rendering state, only
// callbacks, so it needs no provider and causes no re-renders. Membership is
// keyed by object identity, so two overlays can never collide.

export type ExclusiveOverlay = {
  /** Must be idempotent — it is called whenever any sibling opens. */
  close: () => void;
  /** Closed only by closeAll, never by another member opening. */
  closeOnly?: boolean;
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
 * Announce that `opening` is about to be shown: closes every other exclusive
 * member and leaves `opening` and the close-only members untouched. Pass `null`
 * to close all the exclusive members.
 */
export function onOpening(opening: object | null): void {
  for (const [id, overlay] of registry) {
    if (id !== opening && overlay.closeOnly !== true) {
      overlay.close();
    }
  }
}

/** Closes every member, close-only ones included. */
export function closeAll(): void {
  for (const overlay of registry.values()) {
    overlay.close();
  }
}
