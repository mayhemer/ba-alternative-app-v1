import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ArtistRow } from './ArtistRow';
import { FeatureProviders } from '../../tests/setup/PerfProviders';
import type { DbArtist } from '../types/backend';

// ── An artist row with sparse data ────────────────────────────────────────────
//
// Lineups are announced in waves: an artist can arrive with no photo, genre or
// country yet. The row must still render its name and star, without a broken
// image.

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

const SPARSE = {
  artistId: 'sparse-1',
  name: 'A BAND WHOSE NAME IS FAR TOO LONG TO FIT ON ONE LINE OF A PHONE SCREEN',
  isPlayable: true,
  thumbUrl: '',
  localized: [],
} as unknown as DbArtist;

it('renders an artist with no photo, genre or country', async () => {
  const view = await render(
    <FeatureProviders>
      <ArtistRow artist={SPARSE} status="none" onPress={() => undefined} />
    </FeatureProviders>,
  );

  expect(screen.getByText(SPARSE.name)).toBeTruthy();
  expect(screen.getByLabelText('Toggle interest')).toBeTruthy();
  // One Text for the name, and no image element asked for an empty URL.
  expect(JSON.stringify(view.toJSON())).not.toContain('"uri":""');
});
