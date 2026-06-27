import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSelectedSlug } from '../store/AppContext';
import { useAuth } from './AuthContext';
import {
  createShareLink,
  fetchSharedSchedule,
  revokeShareLink,
  buildShareUrl,
  type SharedInterestStatus,
} from '../adapters/baShareApiAdapter';
import {
  loadFriends,
  saveFriends,
  loadMyShare,
  saveMyShare,
  type FriendSchedule,
  type MyShare,
} from '../cache/socialCache';

// ── Types ─────────────────────────────────────────────────────────────────────

// One friend's pick of a given artist, used to render ambient indicators.
export type FriendPick = {
  token: string;
  label: string;
  avatarUrl?: string;
  status: SharedInterestStatus;
};

type SocialDataValue = {
  friends: FriendSchedule[];
  myShare: MyShare | null;
  // artistId → friends who picked that artist (drives facepile / pip / detail list)
  friendsByArtist: Record<string, FriendPick[]>;
  getFriend: (token: string) => FriendSchedule | undefined;
};

type SocialActionsValue = {
  // Mints (or reuses) my share link for the current edition. Requires being logged in.
  shareMine: () => Promise<MyShare>;
  revokeMine: () => Promise<void>;
  // Fetches a shared schedule by token and adds/updates it in the friends list.
  addFriend: (token: string) => Promise<FriendSchedule>;
  removeFriend: (token: string) => Promise<void>;
  refreshFriend: (token: string) => Promise<void>;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Flattens the server interest list to artistId → status, dropping 'none'.
function toFriendInterests(
  slug: string,
  interests: { slugArtistId: string; status: 'will_go' | 'maybe' | 'none' }[],
): Record<string, SharedInterestStatus> {
  const prefix = `${slug}#`;
  const result: Record<string, SharedInterestStatus> = {};
  for (const entry of interests) {
    if (entry.status === 'none') { continue; }
    const artistId = entry.slugArtistId.startsWith(prefix)
      ? entry.slugArtistId.slice(prefix.length)
      : entry.slugArtistId;
    result[artistId] = entry.status;
  }
  return result;
}

// ── Contexts ──────────────────────────────────────────────────────────────────

const SocialDataContext = createContext<SocialDataValue | null>(null);
const SocialActionsContext = createContext<SocialActionsValue | null>(null);

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const selectedSlug = useSelectedSlug();
  const { getAccessToken } = useAuth();

  const [friends, setFriends] = useState<FriendSchedule[]>([]);
  const [myShare, setMyShare] = useState<MyShare | null>(null);

  // Mirror current state into refs so actions stay stable across data changes.
  const friendsRef = useRef(friends);
  friendsRef.current = friends;
  const slugRef = useRef(selectedSlug);
  slugRef.current = selectedSlug;

  // Persisted friends are scoped per edition; reload whenever the slug changes.
  useEffect(() => {
    let cancelled = false;
    Promise.all([loadFriends(selectedSlug), loadMyShare(selectedSlug)]).then(
      ([loadedFriends, loadedShare]) => {
        if (cancelled) { return; }
        setFriends(loadedFriends);
        setMyShare(loadedShare);
      },
    );
    return () => { cancelled = true; };
  }, [selectedSlug]);

  // ── Friends ──────────────────────────────────────────────────────────────────

  const fetchFriend = useCallback(async (token: string): Promise<FriendSchedule> => {
    const data = await fetchSharedSchedule(token);
    return {
      token,
      label: data.label,
      avatarUrl: data.avatarUrl,
      slug: data.slug,
      interests: toFriendInterests(data.slug, data.interests),
      fetchedAt: Date.now(),
    };
  }, []);

  // Stores a friend under their own edition's list (a share link may belong to a
  // different edition than the one currently selected). Only mirrors into React
  // state when it matches the active edition.
  const upsertFriend = useCallback(async (friend: FriendSchedule): Promise<void> => {
    const isCurrent = friend.slug === slugRef.current;
    const base = isCurrent ? friendsRef.current : await loadFriends(friend.slug);
    const next = [...base.filter((f) => f.token !== friend.token), friend];
    await saveFriends(friend.slug, next);
    if (isCurrent) { setFriends(next); }
  }, []);

  const addFriend = useCallback(
    async (token: string): Promise<FriendSchedule> => {
      const friend = await fetchFriend(token);
      await upsertFriend(friend);
      return friend;
    },
    [fetchFriend, upsertFriend],
  );

  const refreshFriend = useCallback(
    async (token: string): Promise<void> => {
      const friend = await fetchFriend(token);
      await upsertFriend(friend);
    },
    [fetchFriend, upsertFriend],
  );

  const removeFriend = useCallback(async (token: string): Promise<void> => {
    const next = friendsRef.current.filter((f) => f.token !== token);
    setFriends(next);
    await saveFriends(slugRef.current, next);
  }, []);

  // ── My share ─────────────────────────────────────────────────────────────────

  const shareMine = useCallback(async (): Promise<MyShare> => {
    const slug = slugRef.current;
    // Reuse the cached link if we already minted one for this edition.
    const cached = await loadMyShare(slug);
    if (cached !== null) {
      setMyShare(cached);
      return cached;
    }
    const token = await getAccessToken();
    if (token === null) {
      throw new Error('Sign in to share your schedule');
    }
    const created = await createShareLink(slug, token);
    const share: MyShare = {
      token: created.token,
      url: buildShareUrl(created.token),
      label: created.label,
      avatarUrl: created.avatarUrl,
    };
    setMyShare(share);
    await saveMyShare(slug, share);
    return share;
  }, [getAccessToken]);

  const revokeMine = useCallback(async (): Promise<void> => {
    const slug = slugRef.current;
    const current = myShare ?? (await loadMyShare(slug));
    if (current === null) { return; }
    const token = await getAccessToken();
    if (token !== null) {
      await revokeShareLink(current.token, token).catch(() => undefined);
    }
    setMyShare(null);
    await saveMyShare(slug, null);
  }, [getAccessToken, myShare]);

  // ── Derived ──────────────────────────────────────────────────────────────────

  const friendsByArtist = useMemo<Record<string, FriendPick[]>>(() => {
    const map: Record<string, FriendPick[]> = {};
    for (const friend of friends) {
      for (const [artistId, status] of Object.entries(friend.interests)) {
        if (map[artistId] === undefined) { map[artistId] = []; }
        map[artistId].push({
          token: friend.token,
          label: friend.label,
          avatarUrl: friend.avatarUrl,
          status,
        });
      }
    }
    return map;
  }, [friends]);

  const getFriend = useCallback(
    (token: string): FriendSchedule | undefined => friends.find((f) => f.token === token),
    [friends],
  );

  const dataValue = useMemo<SocialDataValue>(
    () => ({ friends, myShare, friendsByArtist, getFriend }),
    [friends, myShare, friendsByArtist, getFriend],
  );

  const actionsValue = useMemo<SocialActionsValue>(
    () => ({ shareMine, revokeMine, addFriend, removeFriend, refreshFriend }),
    [shareMine, revokeMine, addFriend, removeFriend, refreshFriend],
  );

  return (
    <SocialActionsContext.Provider value={actionsValue}>
      <SocialDataContext.Provider value={dataValue}>
        {children}
      </SocialDataContext.Provider>
    </SocialActionsContext.Provider>
  );
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useSocialData(): SocialDataValue {
  const ctx = useContext(SocialDataContext);
  if (ctx === null) {
    throw new Error('useSocialData must be used inside SocialProvider');
  }
  return ctx;
}

export function useSocialActions(): SocialActionsValue {
  const ctx = useContext(SocialActionsContext);
  if (ctx === null) {
    throw new Error('useSocialActions must be used inside SocialProvider');
  }
  return ctx;
}
