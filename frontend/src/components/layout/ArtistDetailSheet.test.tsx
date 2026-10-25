import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ArtistDetailSheet } from './ArtistDetailSheet';
import { PerfProviders } from '../../../tests/setup/PerfProviders';
import { useArtistDetail } from '../../context/ArtistDetailContext';
import { useInterestCycle } from '../../context/InterestContext';
import { createDataCollector, hydrateInterests, populateCache, setInterest } from '../../cache/cacheService';
import { rendersSinceReset, resetRenders } from '../../../tests/setup/countRenders';
import type { DbArtist, DbCategory, DbEvent, DbStage } from '../../types/backend';

// ── The artist sheet reacts to every input ────────────────────────────────────
//
// A small edition of its own (each test file has its own cache): BASTION plays
// Wednesday 13:00–14:00, Thursday 13:00–14:00 and Wednesday night 00:35–01:30;
// RIVAL plays Wednesday 13:30–14:30, over BASTION's first set. The inputs: my
// picks (BASTION's, RIVAL's) and a sync that moves RIVAL away. Then the render
// counts: which of the sheet's elements render again after one change — the
// title row by the artistId, each set row by its eventId.

jest.mock('@gorhom/bottom-sheet', () => ({ __esModule: true, ...require('@gorhom/bottom-sheet/mock') }));

jest.mock('../../store/AppContext', () => {
  const actual = jest.requireActual('../../store/AppContext');
  return { ...actual, useSelectedSlug: () => 'sheettest' };
});

// One auth value for the whole run, as the real provider memoises its own.
jest.mock('../../context/AuthContext', () => {
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

jest.mock('../artist/ArtistDetailTitle', () => {
  const { counted } = require('../../../tests/setup/countRenders');
  const actual = jest.requireActual('../artist/ArtistDetailTitle');
  return { ...actual, ArtistDetailTitle: counted(actual.ArtistDetailTitle) };
});
jest.mock('../artist/ArtistSetRow', () => {
  const { counted } = require('../../../tests/setup/countRenders');
  const actual = jest.requireActual('../artist/ArtistSetRow');
  return { ...actual, ArtistSetRow: counted(actual.ArtistSetRow) };
});

const SLUG = 'sheettest';
const at = (iso: string): number => Date.parse(iso);

function artist(artistId: string, name: string): DbArtist {
  return { slug: SLUG, artistId, name, isPlayable: true, imageUrl: '', thumbUrl: '', url: '', localized: [] };
}
function set(eventId: string, artistId: string, from: string, to: string): DbEvent {
  return { slug: SLUG, eventId, artistId, stageId: 's1', categoryId: 'c1', dateFrom: at(from), dateTo: at(to) };
}

const BASTION = artist('bastion', 'BASTION');
const RIVAL = artist('rival', 'RIVAL');
const EVENTS = [
  set('e-wed', 'bastion', '2025-08-06T13:00:00+02:00', '2025-08-06T14:00:00+02:00'),
  set('e-thu', 'bastion', '2025-08-07T13:00:00+02:00', '2025-08-07T14:00:00+02:00'),
  set('e-night', 'bastion', '2025-08-07T00:35:00+02:00', '2025-08-07T01:30:00+02:00'),
  set('e-rival', 'rival', '2025-08-06T13:30:00+02:00', '2025-08-06T14:30:00+02:00'),
];

function sync(events: DbEvent[]): void {
  const collector = createDataCollector();
  collector.setArtists([BASTION, RIVAL]);
  collector.setCategories([{ slug: SLUG, categoryId: 'c1', color: 0, localized: [] } as unknown as DbCategory]);
  collector.setStages([{ slug: SLUG, stageId: 's1', imageUrl: '', thumbUrl: '', localized: [{ language: 'en', name: 'Octagon' }] } as unknown as DbStage]);
  collector.setEvents(events);
  populateCache(SLUG, collector.build(), at('2025-08-06T09:00:00+02:00'));
}

let openDetail: (artist: DbArtist) => void;
let cycle: (artistId: string) => void;

function Controls() {
  const detail = useArtistDetail();
  const { cycleStatus } = useInterestCycle();
  openDetail = (a) => { detail.openDetail(a, 'expanded'); };
  cycle = (artistId) => { cycleStatus(artistId); };
  return null;
}

async function openSheet(picks: Record<string, 'maybe' | 'will_go'> = {}): Promise<void> {
  for (const [artistId, status] of Object.entries(picks)) {
    await setInterest(SLUG, artistId, status);
  }
  await hydrateInterests(SLUG);
  await render(<PerfProviders><><Controls /><ArtistDetailSheet /></></PerfProviders>);
  await act(async () => { openDetail(BASTION); });
}

const overlapLines = (): number => screen.queryAllByText('Overlaps with 1 other event(s)').length;

beforeEach(async () => {
  sync(EVENTS);
  await setInterest(SLUG, 'bastion', 'none');
  await setInterest(SLUG, 'rival', 'none');
  await hydrateInterests(SLUG);
});

it('lists each set with its stage, its calendar date and its time', async () => {
  await openSheet();
  expect(screen.getAllByText('Octagon')).toHaveLength(3);
  expect(screen.getAllByText('Wed 6')).toHaveLength(1);
  // The night set, 00:35 on Wednesday night, is dated Thursday.
  expect(screen.getAllByText('Thu 7')).toHaveLength(2);
  expect(screen.getByText('00:35–01:30')).toBeTruthy();
});

it('shows the clash once my star makes BASTION a Must-see next to RIVAL', async () => {
  await openSheet({ rival: 'will_go' });
  expect(overlapLines()).toBe(0);
  // none → Maybe → Must-see, by the sheet's own star.
  await fireEvent.press(screen.getByLabelText('Toggle interest'));
  expect(overlapLines()).toBe(0);
  await fireEvent.press(screen.getByLabelText('Toggle interest'));
  expect(overlapLines()).toBe(1);
});

it('drops the clash when a sync moves RIVAL away', async () => {
  await openSheet({ bastion: 'will_go', rival: 'will_go' });
  expect(overlapLines()).toBe(1);
  await act(async () => {
    sync(EVENTS.map((e) => (e.eventId === 'e-rival' ? { ...e, dateFrom: at('2025-08-06T18:00:00+02:00'), dateTo: at('2025-08-06T19:00:00+02:00') } : e)));
  });
  expect(overlapLines()).toBe(0);
});

describe('render counts', () => {
  it('a pick that makes a clash renders the title (its ⚠) and the clashing set\'s row only', async () => {
    await openSheet({ bastion: 'will_go', rival: 'maybe' });
    resetRenders();
    // Maybe → Must-see.
    await act(async () => { cycle('rival'); });
    expect(rendersSinceReset()).toEqual({ bastion: 1, 'e-wed': 1 });
  });

  it('a pick that changes nothing the sheet shows renders none of it', async () => {
    await openSheet({ bastion: 'will_go' });
    resetRenders();
    // none → Maybe: a Maybe does not clash.
    await act(async () => { cycle('rival'); });
    expect(rendersSinceReset()).toEqual({});
  });
});
