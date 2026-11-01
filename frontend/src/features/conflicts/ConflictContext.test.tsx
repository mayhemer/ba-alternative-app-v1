import React from 'react';
import { act, render } from '@testing-library/react-native';
import { FeatureProviders } from '../../../tests/setup/PerfProviders';
import { useConflicts } from './ConflictContext';
import { useInterestCycle, type InterestStatus } from '../interests/InterestContext';
import { createDataCollector, hydrateInterests, populateCache, setInterest } from '../../cache/cacheService';
import type { DbArtist, DbCategory, DbEvent, DbStage } from '../../types/backend';

// ── Who renders when the conflicts are recomputed ─────────────────────────────
//
// Every pick recomputes the conflicts (in a deferred render). A reader renders
// only when the result changed: a pick that makes or ends no clash leaves the
// same list, and nobody reading it renders.
//
// The edition: ALPHA plays Wednesday 13:00–14:00, BRAVO 13:30–14:30 (over
// ALPHA's set), CHARLIE 18:00–19:00 (clashing with nothing).

jest.mock('../../store/AppContext', () => {
  const actual = jest.requireActual('../../store/AppContext');
  return { ...actual, useSelectedSlug: () => 'conflictctx' };
});

jest.mock('../../auth/AuthContext', () => {
  const auth = {
    isLoggedIn: false,
    isRestoringSession: false,
    userId: null,
    email: null,
    name: null,
    getAccessToken: async () => null,
    signIn: async () => undefined,
    signOut: async () => undefined,
  };
  return { useAuth: () => auth };
});

const SLUG = 'conflictctx';
const at = (iso: string): number => Date.parse(iso);

function artist(artistId: string): DbArtist {
  return { slug: SLUG, artistId, name: artistId.toUpperCase(), isPlayable: true, imageUrl: '', thumbUrl: '', url: '', localized: [] };
}
function set(eventId: string, artistId: string, from: string, to: string): DbEvent {
  return { slug: SLUG, eventId, artistId, stageId: 's1', categoryId: 'c1', dateFrom: at(from), dateTo: at(to) };
}

function sync(): void {
  const collector = createDataCollector();
  collector.setArtists([artist('alpha'), artist('bravo'), artist('charlie')]);
  collector.setCategories([{ slug: SLUG, categoryId: 'c1', color: 0, localized: [] } as unknown as DbCategory]);
  collector.setStages([{ slug: SLUG, stageId: 's1', imageUrl: '', thumbUrl: '', localized: [{ language: 'en', name: 'Octagon' }] } as unknown as DbStage]);
  collector.setEvents([
    set('e-alpha', 'alpha', '2025-08-06T13:00:00+02:00', '2025-08-06T14:00:00+02:00'),
    set('e-bravo', 'bravo', '2025-08-06T13:30:00+02:00', '2025-08-06T14:30:00+02:00'),
    set('e-charlie', 'charlie', '2025-08-06T18:00:00+02:00', '2025-08-06T19:00:00+02:00'),
  ]);
  populateCache(SLUG, collector.build(), at('2025-08-06T09:00:00+02:00'));
}

let readerRenders = 0;
let shownCount = 0;
let choose: (artistId: string, status: InterestStatus) => void;

function Reader() {
  const { count } = useConflicts();
  readerRenders += 1;
  shownCount = count;
  return null;
}

function Controls() {
  const { setStatus } = useInterestCycle();
  choose = (artistId, status) => { setStatus(artistId, status); };
  return null;
}

async function mountWith(picks: Record<string, InterestStatus>): Promise<void> {
  sync();
  for (const id of ['alpha', 'bravo', 'charlie']) {
    await setInterest(SLUG, id, picks[id] ?? 'none');
  }
  await hydrateInterests(SLUG);
  await render(<FeatureProviders><Controls /><Reader /></FeatureProviders>);
  readerRenders = 0;
}

it('a pick that makes no clash renders no reader', async () => {
  await mountWith({ alpha: 'will_go' });
  // CHARLIE plays alone: a Must-see that clashes with nothing.
  await act(async () => { choose('charlie', 'will_go'); });
  expect(readerRenders).toBe(0);
  expect(shownCount).toBe(0);
});

it('a pick that makes a clash renders each reader once, with it', async () => {
  await mountWith({ alpha: 'will_go' });
  await act(async () => { choose('bravo', 'will_go'); });
  expect(readerRenders).toBe(1);
  expect(shownCount).toBe(2);
});

it('a pick that ends a clash renders each reader once, without it', async () => {
  await mountWith({ alpha: 'will_go', bravo: 'will_go' });
  await act(async () => { choose('bravo', 'maybe'); });
  expect(readerRenders).toBe(1);
  expect(shownCount).toBe(0);
});
