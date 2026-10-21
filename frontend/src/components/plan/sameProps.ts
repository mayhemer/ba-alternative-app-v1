// ── Memo compare for My plan's elements ───────────────────────────────────────
//
// The plan rebuilds its models whenever any input changes (a new minute, a sync,
// a pick), so an element's model is a new object even when nothing it shows
// changed. An element draws only its props, so equal props by value mean equal
// output: comparing them that way lets each element skip exactly the renders
// that would repaint the same thing. Callbacks compare by identity.
//
// Models are small plain data (numbers, strings, the set and artist records),
// so the walk is cheap next to a render.

function equalValues(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    return a.every((value, i) => equalValues(value, b[i]));
  }
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(right).length) {
    return false;
  }
  return keys.every((key) => Object.prototype.hasOwnProperty.call(right, key) && equalValues(left[key], right[key]));
}

/** React.memo's compare for an element whose output depends on its props alone. */
export function sameProps<P extends object>(prev: P, next: P): boolean {
  return equalValues(prev, next);
}
