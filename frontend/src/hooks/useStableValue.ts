import { useState } from 'react';

// ── Keep the previous value while a new one equals it ─────────────────────────
//
// A memo recomputes whenever an input changes, and hands back a new object even
// when the result is the same. Passed on as a context value or a prop, that new
// object renders every reader for nothing. This hook hands back the previous
// value instead while the new one equals it, so readers render only when the
// result changed.
//
// Pure: it keeps the value in state, updated during render (React's pattern for
// information from previous renders), never in a ref. `value` must be stable
// between renders with the same inputs (from useMemo), or it would update forever.

export function useStableValue<T>(value: T, isEqual: (a: T, b: T) => boolean): T {
  const [kept, setKept] = useState(value);
  if (kept === value || isEqual(kept, value)) {
    return kept;
  }
  setKept(value);
  return value;
}
