import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SharedInterestStatus } from '../adapters/baShareApiAdapter';

// ── Types ─────────────────────────────────────────────────────────────────────

// A friend's shared schedule, cached locally per festival edition. `interests`
// is flattened to artistId → status (none/unknown entries omitted).
export type FriendSchedule = {
  token: string;
  label: string;
  avatarUrl?: string;
  slug: string;
  interests: Record<string, SharedInterestStatus>;
  fetchedAt: number;
};

// My own minted share link for an edition.
export type MyShare = {
  token: string;
  url: string;
  label: string;
  avatarUrl?: string;
};

// ── Storage keys ────────────────────────────────────────────────────────────────

function friendsKey(slug: string): string {
  return `social:friends:${slug}`;
}

function myShareKey(slug: string): string {
  return `social:myshare:${slug}`;
}

// ── In memory ───────────────────────────────────────────────────────────────────
//
// Loaded by StartupGate (hydrateSocial, via hydrateLocalState) before the
// providers mount, and kept current by every save, so SocialProvider can start
// from them synchronously instead of loading in a mount effect.

const loadedFriends: Record<string, FriendSchedule[]> = {};
const loadedMyShare: Record<string, MyShare | null> = {};

/** Loads an edition's friends and own share into memory. */
export async function hydrateSocial(slug: string): Promise<void> {
  const [friends, share] = await Promise.all([loadFriends(slug), loadMyShare(slug)]);
  loadedFriends[slug] = friends;
  loadedMyShare[slug] = share;
}

/** The edition's friends as last loaded or saved; empty if never loaded. */
export function getLoadedFriends(slug: string): FriendSchedule[] {
  return loadedFriends[slug] ?? [];
}

/** The edition's own share as last loaded or saved; null if none or never loaded. */
export function getLoadedMyShare(slug: string): MyShare | null {
  return loadedMyShare[slug] ?? null;
}

// ── Friends ─────────────────────────────────────────────────────────────────────

export async function loadFriends(slug: string): Promise<FriendSchedule[]> {
  const raw = await AsyncStorage.getItem(friendsKey(slug));
  if (raw === null) { return []; }
  try {
    return JSON.parse(raw) as FriendSchedule[];
  } catch {
    return [];
  }
}

export async function saveFriends(slug: string, friends: FriendSchedule[]): Promise<void> {
  loadedFriends[slug] = friends;
  await AsyncStorage.setItem(friendsKey(slug), JSON.stringify(friends));
}

// ── My share ─────────────────────────────────────────────────────────────────────

export async function loadMyShare(slug: string): Promise<MyShare | null> {
  const raw = await AsyncStorage.getItem(myShareKey(slug));
  if (raw === null) { return null; }
  try {
    return JSON.parse(raw) as MyShare;
  } catch {
    return null;
  }
}

export async function saveMyShare(slug: string, share: MyShare | null): Promise<void> {
  loadedMyShare[slug] = share;
  if (share === null) {
    await AsyncStorage.removeItem(myShareKey(slug));
    return;
  }
  await AsyncStorage.setItem(myShareKey(slug), JSON.stringify(share));
}
