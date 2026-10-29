import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { SideDrawerContent } from './SideDrawerContent';
import { createDataCollector, populateCache } from '../cache/cacheService';
import type { DbArtist, DbCategory, DbEvent } from '../types/backend';

// ── Timeline items in the drawer ──────────────────────────────────────────────
//
// "Program" and "Support Program" are listed only when hasTimelineCategories
// says there is something to lay their lanes out by. The matrix below walks
// every input that decides it — whether the edition has categories at all, and,
// for each side (playable / support), whether there is such an artist, whether
// it has events, and whether those events sit in a category that exists — and
// checks the rendered drawer, not the function, so the wiring is covered too.
//
// Each case seeds its own slug: the cache is module state and would otherwise
// carry one case's data into the next.

let mockSlug = '';

jest.mock('../store/AppContext', () => {
  const actual = jest.requireActual('../store/AppContext');
  return { ...actual, useSelectedSlug: () => mockSlug };
});

let mockConflictCount = 0;

jest.mock('../features/conflicts/ConflictContext', () => ({
  useConflicts: () => ({ count: mockConflictCount }),
}));

const SYNCED_AT = Date.parse('2025-08-06T09:00:00+02:00');
const KNOWN_CATEGORY = '1';
const UNKNOWN_CATEGORY = '99';

/** What one side (playable or support) of the lineup looks like in a case. */
type Side =
  | 'no artist'
  | 'artist without events'
  | 'event in unknown category'
  | 'event in known category';

const SIDES: Side[] = [
  'no artist',
  'artist without events',
  'event in unknown category',
  'event in known category',
];

let slugCounter = 0;
const freshSlug = (): string => `drawertest${++slugCounter}`;

function artist(slug: string, artistId: string, isPlayable: boolean): DbArtist {
  return {
    slug,
    artistId,
    name: artistId,
    isPlayable,
    imageUrl: '',
    thumbUrl: '',
    url: '',
    localized: [],
  };
}

function event(slug: string, artistId: string, categoryId: string): DbEvent {
  return {
    slug,
    eventId: `${artistId}-event`,
    dateFrom: SYNCED_AT,
    dateTo: SYNCED_AT + 60 * 60 * 1000,
    artistId,
    stageId: '1',
    categoryId,
  };
}

function category(slug: string, categoryId: string): DbCategory {
  return { slug, categoryId, color: 0, localized: [] };
}

/** Adds one side's artist and events to the lists, as `side` describes. */
function addSide(
  slug: string,
  side: Side,
  isPlayable: boolean,
  artists: DbArtist[],
  events: DbEvent[],
): void {
  if (side === 'no artist') { return; }
  const artistId = isPlayable ? 'playable' : 'support';
  artists.push(artist(slug, artistId, isPlayable));
  if (side === 'event in unknown category') { events.push(event(slug, artistId, UNKNOWN_CATEGORY)); }
  if (side === 'event in known category') { events.push(event(slug, artistId, KNOWN_CATEGORY)); }
}

function seed(slug: string, hasCategories: boolean, playable: Side, support: Side): void {
  const artists: DbArtist[] = [];
  const events: DbEvent[] = [];
  addSide(slug, playable, true, artists, events);
  addSide(slug, support, false, artists, events);

  const collector = createDataCollector();
  collector.setArtists(artists);
  collector.setCategories(hasCategories ? [category(slug, KNOWN_CATEGORY)] : []);
  collector.setStages([]);
  collector.setEvents(events);
  populateCache(slug, collector.build(), SYNCED_AT);
}

const drawerProps = {
  navigation: { navigate: jest.fn(), dispatch: jest.fn() },
  state: { index: 0, routes: [{ key: 'ArtistList', name: 'ArtistList' }] },
} as unknown as DrawerContentComponentProps;

async function renderDrawer(slug: string): Promise<void> {
  mockSlug = slug;
  await render(<SideDrawerContent {...drawerProps} />);
}

function expectItem(label: string, present: boolean): void {
  if (present) {
    expect(screen.getByText(label)).toBeTruthy();
  } else {
    expect(screen.queryByText(label)).toBeNull();
  }
}

type Case = { hasCategories: boolean; playable: Side; support: Side; program: boolean; supportProgram: boolean };

const CASES: Case[] = [true, false].flatMap((hasCategories) =>
  SIDES.flatMap((playable) =>
    SIDES.map((support) => ({
      hasCategories,
      playable,
      support,
      program: hasCategories && playable === 'event in known category',
      supportProgram: hasCategories && support === 'event in known category',
    })),
  ),
);

describe('timeline items in the drawer', () => {
  it.each(CASES)(
    'categories: $hasCategories, playable: $playable, support: $support → Program: $program, Support Program: $supportProgram',
    async ({ hasCategories, playable, support, program, supportProgram }) => {
      const slug = freshSlug();
      seed(slug, hasCategories, playable, support);

      await renderDrawer(slug);

      expectItem('Program', program);
      expectItem('Support Program', supportProgram);
      // The rest of the drawer does not depend on the timeline data.
      expectItem('Artists', true);
      expectItem('My plan', true);
      expectItem('Settings', true);
      expectItem('Conflicts', false);
    },
  );

  it('shows the items once a sync brings the categories in', async () => {
    const slug = freshSlug();
    seed(slug, false, 'event in known category', 'event in known category');
    await renderDrawer(slug);
    expectItem('Program', false);
    expectItem('Support Program', false);

    await act(async () => {
      seed(slug, true, 'event in known category', 'event in known category');
    });

    expectItem('Program', true);
    expectItem('Support Program', true);
  });

  it('hides the items again once a sync drops the categories', async () => {
    const slug = freshSlug();
    seed(slug, true, 'event in known category', 'event in known category');
    await renderDrawer(slug);
    expectItem('Program', true);
    expectItem('Support Program', true);

    await act(async () => {
      seed(slug, false, 'event in known category', 'event in known category');
    });

    expectItem('Program', false);
    expectItem('Support Program', false);
  });
});

// ── My plan entry ─────────────────────────────────────────────────────────────
//
// My plan replaced the Conflicts screen. It leads the drawer, and when picks
// clash it carries a red warning sign with the count: a bare number next to
// "My plan" would not say what it counts.

describe('My plan in the drawer', () => {
  afterEach(() => {
    mockConflictCount = 0;
  });

  it('leads the drawer', async () => {
    const slug = freshSlug();
    seed(slug, true, 'event in known category', 'event in known category');
    await renderDrawer(slug);
    const labels = screen.getAllByTestId(/^drawer-item-/).map((node) => node.props.testID as string);
    expect(labels[0]).toBe('drawer-item-MyPlan');
  });

  it('shows no conflict marker while nothing clashes', async () => {
    const slug = freshSlug();
    seed(slug, true, 'event in known category', 'event in known category');
    await renderDrawer(slug);
    expect(screen.queryByTestId('drawer-conflict-marker')).toBeNull();
  });

  it('shows the warning sign with the number of clashing sets', async () => {
    mockConflictCount = 2;
    const slug = freshSlug();
    seed(slug, true, 'event in known category', 'event in known category');
    await renderDrawer(slug);
    expect(screen.getByTestId('drawer-conflict-marker')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });
});
