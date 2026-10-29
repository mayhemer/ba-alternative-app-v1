import React from 'react';
import { Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SocialProvider, useSocialActions, useSocialData } from './SocialContext';
import { hydrateSocial, type FriendSchedule } from '../../cache/socialCache';

// ── Friends at startup ────────────────────────────────────────────────────────
//
// StartupGate loads the edition's friends and own share before the providers
// mount. The provider must start from them, not catch up in an effect, which
// re-rendered every list and timeline after their first paint.
//
// Each case takes an edition of its own: what is loaded is module state keyed
// by slug.

let mockCurrentSlug = 'ba2025';

jest.mock('../../store/AppContext', () => ({
  useSelectedSlug: () => mockCurrentSlug,
}));

jest.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ getAccessToken: async () => null }),
}));

const mockFetchShared = jest.fn();
jest.mock('../../adapters/baShareApiAdapter', () => ({
  ...jest.requireActual('../../adapters/baShareApiAdapter'),
  fetchSharedSchedule: (token: string) => mockFetchShared(token),
}));

let slugCounter = 0;

beforeEach(() => {
  mockCurrentSlug = `socialctx${++slugCounter}`;
});

function friend(token: string): FriendSchedule {
  return { token, label: `Friend ${token}`, slug: mockCurrentSlug, interests: { a1: 'will_go' }, fetchedAt: 0 };
}

let removeFriend: (token: string) => Promise<void>;
let addFriend: (token: string) => Promise<FriendSchedule>;

function Probe() {
  const { friends, myShare, friendsByArtist } = useSocialData();
  ({ removeFriend, addFriend } = useSocialActions());
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

// ── What a friend's schedule shows ────────────────────────────────────────────
//
// The share data carries every stored status. Only 'maybe' and 'will_go' are
// shown; anything else ('dont_go', 'none', a status a newer server adds) must be
// dropped — before dont_go existed, the views drew any non-'will_go' as a maybe.

it('shows only maybe and will_go from a fetched share', async () => {
  await hydrateSocial(mockCurrentSlug);
  await render(<SocialProvider><Probe /></SocialProvider>);
  mockFetchShared.mockResolvedValue({
    slug: mockCurrentSlug,
    label: 'Friend t1',
    interests: [
      { userId: 'u', slugArtistId: `${mockCurrentSlug}#a1`, status: 'dont_go', updatedAt: 1 },
      { userId: 'u', slugArtistId: `${mockCurrentSlug}#a2`, status: 'none', updatedAt: 1 },
      { userId: 'u', slugArtistId: `${mockCurrentSlug}#a3`, status: 'some_future_status', updatedAt: 1 },
      { userId: 'u', slugArtistId: `${mockCurrentSlug}#a4`, status: 'maybe', updatedAt: 1 },
      { userId: 'u', slugArtistId: `${mockCurrentSlug}#a5`, status: 'will_go', updatedAt: 1 },
    ],
  });

  let added!: FriendSchedule;
  await act(async () => { added = await addFriend('t1'); });

  expect(added.interests).toEqual({ a4: 'maybe', a5: 'will_go' });
  expect(screen.getByText('Friend t1|no share|0')).toBeTruthy();
});

it('drops a dont_go that an older build cached for a friend', async () => {
  const cached = { ...friend('t1'), interests: { a1: 'dont_go', a2: 'maybe' } };
  await AsyncStorage.setItem(`social:friends:${mockCurrentSlug}`, JSON.stringify([cached]));
  await hydrateSocial(mockCurrentSlug);

  await render(<SocialProvider><Probe /></SocialProvider>);

  // a1 is the artist the probe counts: no friend pip for it.
  expect(screen.getByText('Friend t1|no share|0')).toBeTruthy();
});
