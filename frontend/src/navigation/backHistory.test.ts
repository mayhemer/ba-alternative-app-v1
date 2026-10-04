import type { Appliers, Position } from './backHistory';
import type { LensScope } from '../utils/interestUtils';

// ── Back-button history ───────────────────────────────────────────────────────
//
// The stack is module state that deliberately outlives React, so every case
// loads a fresh copy of the module rather than resetting it.

type History = typeof import('./backHistory');

const WED = Date.parse('2025-08-06T06:00:00+02:00');
const THU = Date.parse('2025-08-07T06:00:00+02:00');
const DAY = 24 * 60 * 60 * 1000;

let history: History;
let depth: number;
let applied: Partial<Position>[];

/** Appliers that record what they were asked and apply it as given. */
function appliers(overrides: Partial<Appliers> = {}): Appliers {
  return {
    applyScreen: (screen) => { applied.push({ screen }); },
    applyDay: (day) => { applied.push({ day }); },
    applyScope: (scope) => { applied.push({ scope }); return scope; },
    applyArtist: (artistId) => artistId,
    applyConflict: (eventId) => eventId,
    ...overrides,
  };
}

/** Lets the coalescing window close, committing whatever was observed. */
function settle(): void {
  jest.advanceTimersByTime(150);
}

/** One user action: a patch, then the window closing. */
function move(patch: Partial<Position>): void {
  history.observe(patch);
  settle();
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.isolateModules(() => {
    history = require('./backHistory');
  });
  depth = 0;
  applied = [];
  history.setDepthListener((d) => { depth = d; });
  history.setAppliers(appliers());
  // The app's starting point: the artist list, as the first observation.
  move({ screen: 'ArtistList' });
});

afterEach(() => {
  jest.useRealTimers();
});

it('treats the first observation as the starting point, not a place to go back to', () => {
  expect(depth).toBe(0);
  expect(history.goBack()).toBe(false);
});

it('goes back one move per press', () => {
  move({ screen: 'Timeline', day: WED });
  move({ screen: 'Conflicts' });
  expect(depth).toBe(2);

  expect(history.goBack()).toBe(true);
  expect(applied.at(-1)).toEqual({ screen: 'Timeline' });
  expect(history.goBack()).toBe(true);
  expect(applied.at(-1)).toEqual({ screen: 'ArtistList' });
  expect(history.goBack()).toBe(false);
});

it('collapses the changes of one action into one entry', () => {
  // "Go to timeline" from the artist sheet: screen, day and sheet all move, and
  // they arrive through different commits.
  move({ artistId: 'a1' });
  history.observe({ screen: 'Timeline' });
  jest.advanceTimersByTime(40);
  history.observe({ day: THU });
  jest.advanceTimersByTime(40);
  history.observe({ artistId: null });
  settle();

  expect(depth).toBe(2);
  expect(history.goBack()).toBe(true);
  // Back to the open sheet over the list, in one press.
  expect(applied.at(-1)).toEqual({ screen: 'ArtistList' });
  expect(depth).toBe(1);
});

it('does not count the timeline restoring its day as a move', () => {
  move({ screen: 'Timeline' });
  expect(depth).toBe(1);
  // The day arrives on its own, after the screen.
  move({ day: WED });
  expect(depth).toBe(1);
});

it('counts a day switch the user makes', () => {
  move({ screen: 'Timeline' });
  move({ day: WED });
  move({ day: THU });
  expect(depth).toBe(2);

  history.goBack();
  expect(applied).toContainEqual({ day: WED });
});

it('treats dismissing a sheet as going back, not as a new place', () => {
  move({ artistId: 'a1' });
  expect(depth).toBe(1);
  // Swipe, backdrop or Escape: back where we were, so the entry is popped.
  move({ artistId: null });
  expect(depth).toBe(0);
  expect(history.goBack()).toBe(false);
});

it('commits a pending change before going back, so a fast press is not lost', () => {
  history.observe({ screen: 'Settings' });
  // No settle: the press arrives inside the coalescing window.
  expect(history.goBack()).toBe(true);
  expect(applied.at(-1)).toEqual({ screen: 'ArtistList' });
});

it('keeps the entry when nothing can apply it yet', () => {
  move({ screen: 'Settings' });
  const release = history.setAppliers(appliers());
  release();

  expect(history.goBack()).toBe(false);
  expect(depth).toBe(1);

  history.setAppliers(appliers());
  expect(history.goBack()).toBe(true);
});

it('records the position actually restored when part of it no longer resolves', () => {
  const friend: LensScope = { kind: 'friend', token: 't1', level: null };
  const all: LensScope = { kind: 'all' };
  move({ scope: friend });
  move({ screen: 'Timeline', day: WED });
  expect(depth).toBe(2);

  // The friend was removed meanwhile, so the lens falls back to everything.
  history.setAppliers(appliers({ applyScope: () => all }));
  history.goBack();
  expect(depth).toBe(1);

  // The tracker then observes the state the appliers produced. It is our own
  // restore, and must not be pushed as a new place.
  move({ screen: 'ArtistList', scope: all });
  expect(depth).toBe(1);
});

it('holds at most 50 entries', () => {
  move({ screen: 'Timeline', day: WED });
  for (let i = 1; i <= 60; i++) {
    move({ day: WED + i * DAY });
  }
  expect(depth).toBe(50);
});

it('starts over for another festival edition', () => {
  history.resetForSlug('ba2025');
  move({ screen: 'ArtistList' });
  move({ screen: 'Timeline' });
  move({ screen: 'Conflicts' });
  expect(depth).toBe(2);

  // Ids are scoped to an edition, so nothing from the old one may be restored.
  history.resetForSlug('ba2024');
  expect(depth).toBe(0);
  expect(history.goBack()).toBe(false);
});

it('keeps the history when the same edition is announced again', () => {
  history.resetForSlug('ba2025');
  move({ screen: 'ArtistList' });
  move({ screen: 'Timeline' });

  history.resetForSlug('ba2025');
  expect(depth).toBe(1);
});
