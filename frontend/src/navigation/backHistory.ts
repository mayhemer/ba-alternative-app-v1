import type { DrawerParamList } from './AppNavigator';
import type { LensScope } from '../utils/interestUtils';
import type { DetailPresentationState } from '../context/ArtistDetailContext';

// Back-button history — the positions the hardware (or browser) back button
// returns to.
//
// Every action that counts as "somewhere you can go back to" is a change to one
// small tuple: which screen, which festival day, which lens scope, and which
// sheet is open. So rather than pushing an undo entry at each of the ~8 mutation
// sites, this module watches that tuple and remembers its previous value; going
// back re-applies it through the ordinary context setters. Nothing has to be
// edited when a screen, or a new way of opening a sheet, is added.
//
// The tuple stores *ids*, never DbArtist/DbEvent objects: ids are re-resolved
// against the live cache at apply time, so an entry can never reopen a sheet
// over data a refresh has since dropped — it just doesn't reopen.
//
// Deliberately not a React context (same reasoning as utils/overlayHub): it
// holds no rendering state, and it must outlive the full provider remount that a
// festival-edition switch causes. Not persisted either — a cold start must not
// retrace last session.

export type ScreenName = keyof DrawerParamList;

export type Position = {
  screen: ScreenName;
  /** Unix ms of the selected festival day; 0 = not yet initialized. */
  day: number;
  scope: LensScope;
  artistId: string | null;
  presentation: DetailPresentationState;
  conflictEventId: string | null;
};

export type Appliers = {
  applyScreen: (screen: ScreenName) => void;
  applyDay: (day: number) => void;
  /** @returns the scope actually applied — a removed friend falls back to 'all'. */
  applyScope: (scope: LensScope) => LensScope;
  /** @returns the artist id actually shown, or null when it no longer resolves. */
  applyArtist: (artistId: string | null, presentation: DetailPresentationState) => string | null;
  /** @returns the event id actually shown, or null when it no longer resolves. */
  applyConflict: (eventId: string | null) => string | null;
};

// One tap can move several fields, and they do not all land in the same commit —
// the screen arrives through NavigationContainer's onStateChange, the rest
// through a React effect. Changes inside this window collapse into one entry, so
// "open artist → go to its event" (screen + day + sheet close) costs one back
// press. It also absorbs the deliberate 50 ms sheet handoff in
// ConflictDetailSheet. `goBack` flushes the window first, so a fast back press
// on a slow device behaves the same as on a fast one.
const COALESCE_MS = 100;

const MAX_DEPTH = 50;

const INITIAL: Position = {
  screen: 'ArtistList',
  day: 0,
  scope: { kind: 'all' },
  artistId: null,
  presentation: 'collapsed',
  conflictEventId: null,
};

let ownerSlug: string | null = null;
let appliers: Appliers | null = null;
let depthListener: ((depth: number) => void) | null = null;

/** The latest known truth, patched by every observation. */
let draft: Position = INITIAL;
/** The last position committed to history; null until the first observation. */
let committed: Position | null = null;
const stack: Position[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

// ── Identity ──────────────────────────────────────────────────────────────────

// `presentation` is deliberately absent: expanding the artist sheet is not a
// position, but it is still carried in the tuple so a restore is faithful.
function key(p: Position): string {
  return `${p.screen}|${p.day}|${JSON.stringify(p.scope)}|${p.artistId ?? ''}|${p.conflictEventId ?? ''}`;
}

function keyWithoutDay(p: Position): string {
  return key({ ...p, day: 0 });
}

function notifyDepth(): void {
  if (depthListener !== null) {
    depthListener(stack.length);
  }
}

// ── Observation ───────────────────────────────────────────────────────────────

/**
 * Commit the accumulated draft. Called by the coalescing timer, and
 * synchronously by `goBack` so a back press never races the timer.
 */
function flush(): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }

  if (committed === null) {
    committed = draft;
    return;
  }
  // Still the same position, but keep the fields the key ignores current — the
  // sheet's expanded/collapsed state has to be right if we ever restore here.
  if (key(draft) === key(committed)) {
    committed = draft;
    return;
  }

  // The festival day arriving for the first time is initialization (the timeline
  // screen restoring its persisted day), not a move the user made. Only swallow
  // it when the day is the *only* thing that changed.
  if (committed.day === 0 && keyWithoutDay(draft) === keyWithoutDay(committed)) {
    committed = draft;
    return;
  }

  // Returning to where we just were — dismissing a sheet by swipe, backdrop or
  // Escape — is a backward move. Popping rather than pushing is what keeps every
  // alternative dismissal path in sync without touching a single call site.
  const top = stack[stack.length - 1];
  if (top !== undefined && key(draft) === key(top)) {
    stack.pop();
    committed = draft;
    notifyDepth();
    return;
  }

  stack.push(committed);
  if (stack.length > MAX_DEPTH) {
    stack.shift();
  }
  committed = draft;
  notifyDepth();
}

/** Report a change to part of the current position. */
export function observe(patch: Partial<Position>): void {
  draft = { ...draft, ...patch };
  if (timer === null) {
    timer = setTimeout(flush, COALESCE_MS);
  }
}

// ── Going back ────────────────────────────────────────────────────────────────

/** @returns whether a position was restored; false leaves the press to the caller. */
export function goBack(): boolean {
  flush();

  // Checked before popping, so a press that arrives while nothing can apply it
  // does not silently eat an entry.
  if (appliers === null || stack.length === 0) {
    return false;
  }
  const target = stack.pop() as Position;

  // Day before screen: BaseTimelineScreen's init effect leaves a valid day alone,
  // but only if the day has landed before the newly focused screen renders — and
  // freezeOnBlur defers that render until it is shown.
  if (target.day !== 0) {
    appliers.applyDay(target.day);
  }
  const scope = appliers.applyScope(target.scope);
  const artistId = appliers.applyArtist(target.artistId, target.presentation);
  const conflictEventId = appliers.applyConflict(target.conflictEventId);
  appliers.applyScreen(target.screen);

  // Record what was actually achieved, not what was asked for: a reference that
  // no longer resolves applied as null (or as the fallback scope), and the
  // observation this triggers must be recognized as our own rather than pushed
  // as a new entry.
  committed = { ...target, scope, artistId, conflictEventId };
  draft = committed;
  notifyDepth();
  return true;
}

// ── Registration ──────────────────────────────────────────────────────────────

export function setAppliers(next: Appliers): () => void {
  appliers = next;
  return () => {
    if (appliers === next) {
      appliers = null;
    }
  };
}

/** Notified with the stack depth after every change — used by the web mirror. */
export function setDepthListener(next: (depth: number) => void): () => void {
  depthListener = next;
  return () => {
    if (depthListener === next) {
      depthListener = null;
    }
  };
}

/**
 * Artist and event ids are scoped to a festival edition, so an entry from
 * another one could resolve to a *different* artist. Switching editions reboots
 * the whole tree under StartupGate anyway, so an empty stack is the right state.
 */
export function resetForSlug(slug: string): void {
  if (ownerSlug === slug) {
    return;
  }
  ownerSlug = slug;
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  stack.length = 0;
  committed = null;
  draft = INITIAL;
  notifyDepth();
}
