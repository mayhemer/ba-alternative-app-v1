import React from 'react';
import { measureRenders } from 'reassure';
import { act } from '@testing-library/react-native';
import { DrawerButton } from './DrawerButton';
import { MEASURE_OPTIONS } from '../../../tests/setup/perfOptions';

// ── Render counts for the hamburger ───────────────────────────────────────────
//
// The button listens to every navigation state change to keep its label right,
// but must re-render only when the drawer opens or closes. Which cases render
// is pinned down in DrawerButton.test.tsx.

type HistoryEntry = { type: 'route'; key: string } | { type: 'drawer'; status: 'open' };

const ROUTE: HistoryEntry = { type: 'route', key: 'ArtistList' };

const mockNav = {
  history: [] as HistoryEntry[],
  listeners: new Set<() => void>(),
};

jest.mock('../../navigation/navigationRef', () => ({
  navigationRef: {
    isReady: () => true,
    dispatch: () => undefined,
    getRootState: () => ({ history: mockNav.history }),
    addListener: (_event: string, callback: () => void) => {
      mockNav.listeners.add(callback);
      return () => { mockNav.listeners.delete(callback); };
    },
  },
}));

jest.mock('../../hooks/useLayoutMode', () => ({
  useLayoutMode: () => ({ isWide: false }),
}));

async function navigate(history: HistoryEntry[]): Promise<void> {
  await act(async () => {
    mockNav.history = history;
    mockNav.listeners.forEach((callback) => { callback(); });
  });
}

test('hamburger: a screen switch with the drawer closed', async () => {
  await measureRenders(<DrawerButton />, {
    ...MEASURE_OPTIONS,
    beforeEach: () => { mockNav.history = [ROUTE]; },
    scenario: () => navigate([{ type: 'route', key: 'Timeline' }]),
  });
});
