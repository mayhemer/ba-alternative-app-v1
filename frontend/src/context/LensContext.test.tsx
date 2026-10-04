import React from 'react';
import { Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { LensProvider, useLens } from './LensContext';
import { getUiState, setLensScope } from '../store/uiStatePersistence';
import type { LensScope } from '../utils/interestUtils';

// ── The lens at startup ───────────────────────────────────────────────────────
//
// StartupGate loads the remembered scope with the rest of the UI state, before
// the providers mount. The lens must start from it, not catch up in an effect:
// catching up re-rendered every list and timeline after their first paint, and
// the back history recorded the late change as a move the user made.

let setScope: (scope: LensScope) => void;

function Probe() {
  const lens = useLens();
  setScope = lens.setScope;
  return <Text>{lens.scope.kind}</Text>;
}

afterEach(() => {
  setLensScope({ kind: 'all' });
});

it('starts from the remembered scope, on the very first render', async () => {
  // What StartupGate's hydration leaves in the snapshot.
  setLensScope({ kind: 'me', level: null });

  await render(<LensProvider><Probe /></LensProvider>);

  expect(screen.getByText('me')).toBeTruthy();
});

it('remembers a scope the user picks', async () => {
  await render(<LensProvider><Probe /></LensProvider>);

  await act(async () => { setScope({ kind: 'me', level: 'must_see' }); });

  expect(getUiState('lensScope')).toEqual({ kind: 'me', level: 'must_see' });
});

it('does not remember a friend\'s scope', async () => {
  await render(<LensProvider><Probe /></LensProvider>);

  await act(async () => { setScope({ kind: 'friend', token: 't1', level: null }); });

  expect(screen.getByText('friend')).toBeTruthy();
  expect(getUiState('lensScope')).toEqual({ kind: 'all' });
});
