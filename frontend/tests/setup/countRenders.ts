import React from 'react';

// ── Per-element render counts ─────────────────────────────────────────────────
//
// Reassure counts commits of a whole tree: one commit that repaints every row
// and one that repaints a single row both count as 1. To see which elements
// re-rendered, a test swaps an element component for a counting copy:
//
//   jest.mock('./PlanGap', () => {
//     const { counted } = require('../../tests/setup/countRenders');
//     const actual = jest.requireActual('./PlanGap');
//     return { ...actual, PlanGap: counted(actual.PlanGap) };
//   });
//
// The copy renders exactly what the original does, and keeps the original's
// memo and its compare function, so it skips exactly when the original would.
// Every render of its body is recorded under the element's `item.key`.

const renders = new Map<string, number>();

type Keyed = { item: { key: string } };

/** A counting copy of an element component whose props carry `item.key`. */
export function counted<P extends Keyed>(component: React.ComponentType<P>): React.ComponentType<P> {
  const memoType = component as unknown as { $$typeof?: symbol; type?: (props: P) => React.ReactNode; compare?: (a: P, b: P) => boolean };
  if (memoType.$$typeof === Symbol.for('react.memo') && memoType.type !== undefined) {
    const inner = memoType.type;
    const Counted = (props: P): React.ReactNode => {
      renders.set(props.item.key, (renders.get(props.item.key) ?? 0) + 1);
      return inner(props);
    };
    return React.memo(Counted, memoType.compare ?? undefined) as unknown as React.ComponentType<P>;
  }
  const render = component as (props: P) => React.ReactNode;
  return (props: P): React.ReactNode => {
    renders.set(props.item.key, (renders.get(props.item.key) ?? 0) + 1);
    return render(props);
  };
}

/** Forgets every count so far. */
export function resetRenders(): void {
  renders.clear();
}

/** The keys rendered since the last reset, sorted, each with its count. */
export function rendersSinceReset(): Record<string, number> {
  return Object.fromEntries([...renders.entries()].sort(([a], [b]) => a.localeCompare(b)));
}
