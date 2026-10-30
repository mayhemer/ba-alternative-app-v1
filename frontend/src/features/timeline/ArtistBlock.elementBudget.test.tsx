import React from 'react';
import { render } from '@testing-library/react-native';
import { ArtistBlock } from './ArtistBlock';
import { artistBlockModel, type ArtistBlockInputs } from './ArtistBlock.model';
import { FeatureProviders } from '../../../tests/setup/PerfProviders';
import { countElements, expectWithinBudget, formatCensus } from '../../../tests/setup/countElements';
import type { DbArtist, DbEvent } from '../../types/backend';

import artistsFixture from '../../../tests/fixtures/generated/ba2025/artists.json';
import scheduleFixture from '../../../tests/fixtures/generated/ba2025/schedule.json';

// ── Per-component element budget: one timeline block ──────────────────────────
//
// Budgeting a whole screen turned out to be too coarse to catch what matters: an
// extra wrapper per block hides inside any headroom a screen-level ceiling needs
// to avoid being brittle (verified on the artist list, whose screen budget did
// not notice exactly that regression injected per row).
//
// A single block is the right unit. It is small, fully deterministic, and
// multiplies by the number on screen: ArtistBlock's own comment records dropping
// a row wrapper because it "only ever added one more native view per block — and
// there are ~75 blocks in a day". This budget is what stops that coming back.
// The artist row has the same kind of budget (ArtistRow.elementBudget.test.tsx);
// the screens' own are in screens/screenBudgets.test.tsx.
//
// Still a proxy, not a native view count — see tests/setup/countElements.ts.

jest.mock('../../store/AppContext', () => {
  const actual = jest.requireActual('../../store/AppContext');
  return { ...actual, useSelectedSlug: () => 'ba2025' };
});

jest.mock('../../auth/AuthContext', () => ({
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
// first.
const ARTIST = (artistsFixture as unknown as DbArtist[]).find(
  (a) => a.isPlayable
    && a.localized.some((l) => l.genre !== '' && l.country !== '')
    && a.thumbUrl !== '',
)!;
const EVENT = (scheduleFixture as unknown as DbEvent[]).find((e) => e.artistId === ARTIST.artistId)
  ?? (scheduleFixture as unknown as DbEvent[])[0];

// Exact, not approximate: this tree is small and fully deterministic, so any
// slack would just be room for a regression to hide in. A legitimate addition
// means changing the number here with a note saying what was added — which is
// the whole point of the budget.
//
// The figure is for the plain case: no conflict on the block (the striped bar is
// SVG and costs more). That is the common case and the one that multiplies.
const BUDGET = {
  artistBlock: 6, // 4 View, 2 Text
};

describe('one timeline block', () => {
  it('stays within its element budget', async () => {
    const view = await render(
      <FeatureProviders>
        <ArtistBlock
          item={artistBlockModel({
            event: EVENT,
            artist: ARTIST,
            dayStart: EVENT.dateFrom,
            status: 'none',
            categoryColor: '#888888',
            labelRepeat: 400,
            subRow: 0,
            overlaps: undefined,
            muted: false,
          })}
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

  it('costs no extra view when muted', async () => {
    const block = (muted: boolean) => render(
      <FeatureProviders>
        <ArtistBlock
          item={artistBlockModel({ event: EVENT, artist: ARTIST, dayStart: EVENT.dateFrom, status: 'none', categoryColor: '#888888', labelRepeat: 400, subRow: 0, overlaps: undefined, muted })}
          onPress={() => undefined}
        />
      </FeatureProviders>,
    );
    expect(countElements((await block(true)).toJSON()).total).toBe(countElements((await block(false)).toJSON()).total);
  });

  it('adds views for a conflict only when there is one', async () => {
    const common: ArtistBlockInputs = {
      event: EVENT,
      artist: ARTIST,
      dayStart: EVENT.dateFrom,
      status: 'will_go',
      categoryColor: '#888888',
      labelRepeat: 400,
      subRow: 0,
      overlaps: undefined,
      muted: false,
    };
    const clean = await render(<FeatureProviders><ArtistBlock item={artistBlockModel(common)} onPress={() => undefined} /></FeatureProviders>);
    const clashing = await render(
      <FeatureProviders>
        <ArtistBlock item={artistBlockModel({ ...common, overlaps: [{ from: EVENT.dateFrom, to: EVENT.dateTo }] })} onPress={() => undefined} />
      </FeatureProviders>,
    );

    // The striped bar is SVG and costs real elements; a block with no clash must
    // not pay for it. Most blocks in a day have none.
    expect(countElements(clashing.toJSON()).total)
      .toBeGreaterThan(countElements(clean.toJSON()).total);
  });
});
