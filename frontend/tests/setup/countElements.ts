// ── Rendered element census ───────────────────────────────────────────────────
//
// Counts the nodes in a rendered tree, as a stand-in for the native views the
// same tree would create on a device.
//
// Why it is worth measuring: the app's most expensive documented interaction is
// mounting a festival day, which "creates several hundred native views of which
// about a tenth can be seen" and once pinned a low-end Android's UI thread for
// well over a second (see TimelineView). Nothing in Node can measure native view
// creation — but the *number of elements asked for* is exactly what drives it,
// and that number is fully deterministic, unlike any timing.
//
// It is a proxy, not a view count. react-native-web and Fabric both map these
// elements to host views, but not always one-to-one, and a host component may
// create several platform views internally. Treat the figure as a budget to hold
// steady, not as a measurement of the device.

type Json = { type?: string; children?: unknown } | string | number | null;

export type ElementCensus = {
  total: number;
  /** Count per host component type, largest first. */
  byType: Record<string, number>;
};

export function countElements(tree: unknown): ElementCensus {
  const byType: Record<string, number> = {};
  let total = 0;

  const walk = (node: Json | unknown): void => {
    if (node === null || node === undefined) {
      return;
    }
    if (Array.isArray(node)) {
      for (const child of node) { walk(child); }
      return;
    }
    // Text content is not an element; only host nodes carry a `type`.
    if (typeof node !== 'object') {
      return;
    }
    const element = node as { type?: string; children?: unknown };
    if (typeof element.type === 'string') {
      total += 1;
      byType[element.type] = (byType[element.type] ?? 0) + 1;
    }
    walk(element.children);
  };

  walk(tree);
  return { total, byType };
}

/** The census as a single line, heaviest types first — for failure messages. */
export function formatCensus(census: ElementCensus): string {
  const parts = Object.entries(census.byType)
    .sort((a, b) => b[1] - a[1])
    .map(([type, n]) => `${type}=${n}`);
  return `${census.total} elements (${parts.join(' ')})`;
}

/**
 * Fails with the full census when a tree exceeds its budget, so the message says
 * what grew rather than only that a number got bigger.
 */
export function expectWithinBudget(tree: unknown, budget: number, label: string): ElementCensus {
  const census = countElements(tree);
  if (census.total > budget) {
    throw new Error(
      `${label}: element budget exceeded — ${formatCensus(census)}, budget ${budget}.\n` +
      'Something is asking for more views per row or per block. Raise the budget only ' +
      'deliberately, with a note saying what was added.',
    );
  }
  return census;
}
