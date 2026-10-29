import React from 'react';
import { render } from '@testing-library/react-native';
import { ArtistRow } from './ArtistRow';
import { artistRowModel } from './ArtistRow.model';
import { FeatureProviders } from '../../../tests/setup/PerfProviders';
import { countElements, expectWithinBudget } from '../../../tests/setup/countElements';
import type { DbArtist } from '../../types/backend';

import artistsFixture from '../../../tests/fixtures/generated/ba2025/artists.json';

// ── Per-component element budget: one artist row ──────────────────────────────
//
// Budgeting a whole screen turned out to be too coarse to catch what matters:
// the artist list mounts only about seven rows in this environment, so an extra
// wrapper per row adds seven elements — comfortably inside any headroom a
// screen-level ceiling needs to avoid being brittle. Verified by injecting
// exactly that regression, which the screen budget did not notice.
//
// A single row is the right unit. It is small, fully deterministic, and
// multiplies by the number on screen. The timeline block has the same kind of
// budget (ArtistBlock.elementBudget.test.tsx); the screens' own are in
// screens/screenBudgets.test.tsx.
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
// first. A row with no genre or country renders fewer Text nodes.
const ARTIST = (artistsFixture as unknown as DbArtist[]).find(
  (a) => a.isPlayable
    && a.localized.some((l) => l.genre !== '' && l.country !== '')
    && a.thumbUrl !== '',
)!;

// Exact, not approximate: this tree is small and fully deterministic, so any
// slack would just be room for a regression to hide in. A legitimate addition
// means changing the number here with a note saying what was added — which is
// the whole point of the budget.
//
// The figure is for the plain case: no friends on the row (the facepile costs
// more). That is the common case and the one that multiplies.
const BUDGET = {
  // 5 View, 4 Text, 1 image. The fifth View wraps the touchable and the star as
  // siblings, so iOS exposes the star to VoiceOver as its own button.
  artistRow: 10,
};

describe('one artist row', () => {
  it('stays within its element budget', async () => {
    const view = await render(
      <FeatureProviders>
        <ArtistRow item={artistRowModel({ artist: ARTIST, status: 'none', friends: undefined })} onPress={() => undefined} />
      </FeatureProviders>,
    );

    // Multiplied by every row the list mounts, and again by every row it
    // re-mounts while scrolling.
    expectWithinBudget(view.toJSON(), BUDGET.artistRow, 'artist row');
  });

  it('costs the same with a star as without', async () => {
    const plain = await render(
      <FeatureProviders>
        <ArtistRow item={artistRowModel({ artist: ARTIST, status: 'none', friends: undefined })} onPress={() => undefined} />
      </FeatureProviders>,
    );
    const starred = await render(
      <FeatureProviders>
        <ArtistRow item={artistRowModel({ artist: ARTIST, status: 'will_go', friends: undefined })} onPress={() => undefined} />
      </FeatureProviders>,
    );

    // The star is an icon swap, not an extra view — if this diverges, the
    // interested state has started costing more than the uninterested one.
    expect(countElements(starred.toJSON()).total).toBe(countElements(plain.toJSON()).total);
  });
});
