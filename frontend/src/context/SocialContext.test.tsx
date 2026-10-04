import React from 'react';
import { Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SocialProvider, useSocialActions, useSocialData } from './SocialContext';
import { hydrateSocial, type FriendSchedule } from '../cache/socialCache';

// ── Friends at startup ────────────────────────────────────────────────────────
//
// StartupGate loads the edition's friends and own share before the providers
// mount. The provider must start from them, not catch up in an effect, which
// re-rendered every list and timeline after their first paint.
//
// Each case takes an edition of its own: what is loaded is module state keyed
// by slug.

let mockCurrentSlug = 'ba2025';

jest.mock('../store/AppContext', () => ({
  useSelectedSlug: () => mockCurrentSlug,
}));

jest.mock('./AuthContext', () => ({
  useAuth: () => ({ getAccessToken: async () => null }),
}));

let slugCounter = 0;

beforeEach(() => {
  mockCurrentSlug = `socialctx${++slugCounter}`;
});

function friend(token: string): FriendSchedule {
  return { token, label: `Friend ${token}`, slug: mockCurrentSlug, interests: { a1: 'will_go' }, fetchedAt: 0 };
}

let removeFriend: (token: string) => Promise<void>;

function Probe() {
  const { friends, myShare, friendsByArtist } = useSocialData();
  removeFriend = useSocialActions().removeFriend;
  return (
    <Text>
      {friends.map((f) => f.label).join(',')}|{myShare?.label ?? 'no share'}|{friendsByArtist.a1?.length ?? 0}
    </Text>
  );
}

it('shows the friends the startup gate loaded, on the very first render', async () => {
  await AsyncStorage.setItem(`social:friends:${mockCurrentSlug}`, JSON.stringify([friend('t1')]));
  await AsyncStorage.setItem(`social:myshare:${mockCurrentSlug}`, JSON.stringify({ token: 'mine', url: 'u', label: 'Me' }));
  // What StartupGate's hydration does before the providers mount.
  await hydrateSocial(mockCurrentSlug);

  // No flush: the friends must be there before any effect has run.
  await render(<SocialProvider><Probe /></SocialProvider>);

  expect(screen.getByText('Friend t1|Me|1')).toBeTruthy();
});

it('starts empty for an edition with nothing stored', async () => {
  await hydrateSocial(mockCurrentSlug);

  await render(<SocialProvider><Probe /></SocialProvider>);

  expect(screen.getByText('|no share|0')).toBeTruthy();
});

it('keeps a change for the next mount, as after an edition switch and back', async () => {
  await AsyncStorage.setItem(`social:friends:${mockCurrentSlug}`, JSON.stringify([friend('t1'), friend('t2')]));
  await hydrateSocial(mockCurrentSlug);
  const view = await render(<SocialProvider><Probe /></SocialProvider>);

  await act(async () => { await removeFriend('t1'); });
  await view.unmount();
  await render(<SocialProvider><Probe /></SocialProvider>);

  expect(screen.getByText('Friend t2|no share|1')).toBeTruthy();
});
