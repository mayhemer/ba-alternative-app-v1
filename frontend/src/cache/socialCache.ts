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
  if (share === null) {
    await AsyncStorage.removeItem(myShareKey(slug));
    return;
  }
  await AsyncStorage.setItem(myShareKey(slug), JSON.stringify(share));
}
