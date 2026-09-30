import React from 'react';
import { render } from '@testing-library/react-native';
import { ArtistRow } from './ArtistRow';
import { ArtistBlock } from './timeline/ArtistBlock';
import { FeatureProviders } from '../../tests/setup/PerfProviders';
import { countElements, expectWithinBudget, formatCensus } from '../../tests/setup/countElements';
import type { DbArtist, DbEvent } from '../types/backend';

import artistsFixture from '../../tests/fixtures/generated/ba2025/artists.json';
import scheduleFixture from '../../tests/fixtures/generated/ba2025/schedule.json';

// ── Per-component element budgets ─────────────────────────────────────────────
//
// Budgeting a whole screen turned out to be too coarse to catch what matters:
// the artist list mounts only about seven rows in this environment, so an extra
// wrapper per row adds seven elements — comfortably inside any headroom a
// screen-level ceiling needs to avoid being brittle. Verified by injecting
// exactly that regression, which the screen budget did not notice.
//
// A single row or block is the right unit. It is small, fully deterministic, and
// multiplies by the number on screen: ArtistBlock's own comment records dropping
// a row wrapper because it "only ever added one more native view per block — and
// there are ~75 blocks in a day". These budgets are what stop that coming back.
//
// Still a proxy, not a native view count — see tests/setup/countElements.ts.

jest.mock('../store/AppContext', () => {
  const actual = jest.requireActual('../store/AppContext');
  return { ...actual, useSelectedSlug: () => 'ba2025' };
});

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    isLoggedIn: false,
    isRestoringSession: false,
    userId: null,
    email: null,
    name: null,
    getAccessToken: async () => null,
    signIn: async () => undefined,
    signOut: async () => undefined,
  }),
}));

// Chosen for having every optional field populated, so the count does not move
// when the fixture capture is refreshed and a different artist happens to sort
// first. A row with no genre or country renders fewer Text nodes.
const ARTIST = (artistsFixture as unknown as DbArtist[]).find(
  (a) => a.isPlayable
    && a.localized.some((l) => l.genre !== '' && l.country !== '')
    && a.thumbUrl !== '',
)!;
const EVENT = (scheduleFixture as unknown as DbEvent[]).find((e) => e.artistId === ARTIST.artistId)
  ?? (scheduleFixture as unknown as DbEvent[])[0];

// Exact, not approximate: these trees are small and fully deterministic, so any
// slack would just be room for a regression to hide in. A legitimate addition
// means changing the number here with a note saying what was added — which is
// the whole point of the budget.
//
// Both figures are for the plain case: no friends on the row (the facepile costs
// more) and no conflict on the block (the striped bar is SVG and costs more).
// Those are the common cases and the ones that multiply.
const BUDGET = {
  artistRow: 9,   // 4 View, 4 Text, 1 image
  artistBlock: 6, // 4 View, 2 Text
};

describe('one artist row', () => {
  it('stays within its element budget', async () => {
    const view = await render(
      <FeatureProviders>
        <ArtistRow artist={ARTIST} status="none" onPress={() => undefined} />
      </FeatureProviders>,
    );

    // Multiplied by every row the list mounts, and again by every row it
    // re-mounts while scrolling.
    expectWithinBudget(view.toJSON(), BUDGET.artistRow, 'artist row');
  });

  it('costs the same with a star as without', async () => {
    const plain = await render(
      <FeatureProviders>
        <ArtistRow artist={ARTIST} status="none" onPress={() => undefined} />
      </FeatureProviders>,
    );
    const starred = await render(
      <FeatureProviders>
        <ArtistRow artist={ARTIST} status="must_see" onPress={() => undefined} />
      </FeatureProviders>,
    );

    // The star is an icon swap, not an extra view — if this diverges, the
    // interested state has started costing more than the uninterested one.
    expect(countElements(starred.toJSON()).total).toBe(countElements(plain.toJSON()).total);
  });
});

describe('one timeline block', () => {
  it('stays within its element budget', async () => {
    const view = await render(
      <FeatureProviders>
        <ArtistBlock
          event={EVENT}
          artist={ARTIST}
          dayStart={EVENT.dateFrom}
          status="none"
          categoryColor="#888888"
          labelRepeat={400}
          onPress={() => undefined}
        />
      </FeatureProviders>,
    );

    // ~75 blocks in a festival day, so one extra element here is ~75 more views
    // per day switch — the interaction that once pinned a low-end Android's UI
    // thread for over a second.
    const census = expectWithinBudget(view.toJSON(), BUDGET.artistBlock, 'timeline block');
    expect(formatCensus(census)).toContain('elements');
  });

  it('adds views for a conflict only when there is one', async () => {
    const common = {
      event: EVENT,
      artist: ARTIST,
      dayStart: EVENT.dateFrom,
      status: 'must_see' as const,
      categoryColor: '#888888',
      labelRepeat: 400,
      onPress: () => undefined,
    };
    const clean = await render(<FeatureProviders><ArtistBlock {...common} /></FeatureProviders>);
    const clashing = await render(
      <FeatureProviders>
        <ArtistBlock {...common} conflictOverlaps={[{ from: EVENT.dateFrom, to: EVENT.dateTo }]} />
      </FeatureProviders>,
    );

    // The striped bar is SVG and costs real elements; a block with no clash must
    // not pay for it. Most blocks in a day have none.
    expect(countElements(clashing.toJSON()).total)
      .toBeGreaterThan(countElements(clean.toJSON()).total);
  });
});
