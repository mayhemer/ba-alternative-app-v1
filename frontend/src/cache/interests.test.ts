import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  hydrateInterests,
  mergeServerInterests,
  setInterest,
  type LocalInterest,
} from './cacheService';
import { setCurrentTimeMs } from '../utils/clock';
import type { DbUserInterest } from '../types/backend';

// ── Interests: local-first, merged latest-updatedAt-wins ──────────────────────
//
// This is the only path in the app that can silently *lose* a user's picks, and
// its correctness is entirely about timestamps — which is why it is tested here
// rather than through the UI: staging two conflicting edits with precise clocks
// is trivial in a unit test and impractical on a device.

let slugCounter = 0;
const freshSlug = (): string => `interesttest${++slugCounter}`;

const T = (iso: string): number => Date.parse(iso);
const EARLIER = T('2026-08-05T10:00:00+02:00');
const LATER = T('2026-08-05T11:00:00+02:00');

function serverEntry(
  slug: string,
  artistId: string,
  status: DbUserInterest['status'],
  updatedAt: number,
): DbUserInterest {
  return { userId: 'u1', slugArtistId: `${slug}#${artistId}`, status, updatedAt };
}

async function storedFor(slug: string): Promise<Record<string, LocalInterest>> {
  const raw = await AsyncStorage.getItem(`user:interests:${slug}`);
  return raw === null ? {} : JSON.parse(raw);
}

// ── Local writes ──────────────────────────────────────────────────────────────

describe('setting an interest locally', () => {
  it('stamps it with the app clock', async () => {
    const slug = freshSlug();
    setCurrentTimeMs(LATER);

    const record = await setInterest(slug, 'a1', 'must_see');

    // The timestamp is what the merge arbitrates on, so it must come from the
    // seam rather than a raw Date.now() the tests cannot control.
    expect(record).toEqual({ status: 'must_see', updatedAt: LATER });
  });

  it('persists so a cold start keeps the pick', async () => {
    const slug = freshSlug();
    setCurrentTimeMs(LATER);
    await setInterest(slug, 'a1', 'maybe');

    // hydrateInterests is what startup calls; it reads storage, not memory.
    expect(await hydrateInterests(slug)).toEqual({
      a1: { status: 'maybe', updatedAt: LATER },
    });
  });

  it('keeps a "none" record rather than dropping the artist', async () => {
    const slug = freshSlug();
    setCurrentTimeMs(EARLIER);
    await setInterest(slug, 'a1', 'must_see');
    setCurrentTimeMs(LATER);
    await setInterest(slug, 'a1', 'none');

    // Un-starring has to be a dated fact, not an absence — otherwise the next
    // merge sees no local opinion and the server's stale star wins it back.
    expect((await hydrateInterests(slug)).a1).toEqual({ status: 'none', updatedAt: LATER });
  });

  it('leaves other artists alone', async () => {
    const slug = freshSlug();
    setCurrentTimeMs(EARLIER);
    await setInterest(slug, 'a1', 'must_see');
    await setInterest(slug, 'a2', 'maybe');

    const stored = await storedFor(slug);
    expect(Object.keys(stored).sort()).toEqual(['a1', 'a2']);
  });
});

// ── Merge ─────────────────────────────────────────────────────────────────────

describe('merging the server\'s copy', () => {
  it('adopts an entry the device has never seen', async () => {
    const slug = freshSlug();
    await hydrateInterests(slug);

    const merged = await mergeServerInterests(slug, [
      serverEntry(slug, 'a1', 'will_go', LATER),
    ]);

    expect(merged.a1).toEqual({ status: 'must_see', updatedAt: LATER });
  });

  it('keeps a local pick the server has never seen', async () => {
    const slug = freshSlug();
    setCurrentTimeMs(LATER);
    await setInterest(slug, 'local-only', 'must_see');

    const merged = await mergeServerInterests(slug, []);

    // The offline case: picks made with no account must survive signing in.
    expect(merged['local-only']).toEqual({ status: 'must_see', updatedAt: LATER });
  });

  it('lets the newer server edit win', async () => {
    const slug = freshSlug();
    setCurrentTimeMs(EARLIER);
    await setInterest(slug, 'a1', 'maybe');

    const merged = await mergeServerInterests(slug, [
      serverEntry(slug, 'a1', 'will_go', LATER),
    ]);

    expect(merged.a1).toEqual({ status: 'must_see', updatedAt: LATER });
  });

  it('lets the newer local edit win', async () => {
    const slug = freshSlug();
    setCurrentTimeMs(LATER);
    await setInterest(slug, 'a1', 'must_see');

    const merged = await mergeServerInterests(slug, [
      serverEntry(slug, 'a1', 'maybe', EARLIER),
    ]);

    expect(merged.a1).toEqual({ status: 'must_see', updatedAt: LATER });
  });

  it('keeps the local record when the timestamps are identical', async () => {
    const slug = freshSlug();
    setCurrentTimeMs(LATER);
    await setInterest(slug, 'a1', 'must_see');

    const merged = await mergeServerInterests(slug, [
      serverEntry(slug, 'a1', 'maybe', LATER),
    ]);

    // The comparison is strictly greater-than, so a tie is not a change. Worth
    // pinning: flipping it to >= would make every sync overwrite local state.
    expect(merged.a1.status).toBe('must_see');
  });

  it.each([
    ['will_go', 'must_see'],
    ['maybe', 'maybe'],
    ['none', 'none'],
  ] as const)('maps server %s to local %s', async (server, local) => {
    const slug = freshSlug();
    await hydrateInterests(slug);

    const merged = await mergeServerInterests(slug, [
      serverEntry(slug, 'a1', server, LATER),
    ]);

    expect(merged.a1.status).toBe(local);
  });

  it('skips a malformed composite key rather than inventing an artist', async () => {
    const slug = freshSlug();
    await hydrateInterests(slug);

    const merged = await mergeServerInterests(slug, [
      { userId: 'u1', slugArtistId: 'no-separator', status: 'will_go', updatedAt: LATER },
    ]);

    expect(merged).toEqual({});
  });

  it('reads the artist id from the first separator only', async () => {
    const slug = freshSlug();
    await hydrateInterests(slug);

    const merged = await mergeServerInterests(slug, [
      { userId: 'u1', slugArtistId: `${slug}#a#1`, status: 'will_go', updatedAt: LATER },
    ]);

    expect(Object.keys(merged)).toEqual(['a#1']);
  });

  it('persists the merge, so the next cold start starts from it', async () => {
    const slug = freshSlug();
    setCurrentTimeMs(EARLIER);
    await setInterest(slug, 'a1', 'maybe');

    await mergeServerInterests(slug, [serverEntry(slug, 'a2', 'will_go', LATER)]);

    expect(await storedFor(slug)).toEqual({
      a1: { status: 'maybe', updatedAt: EARLIER },
      a2: { status: 'must_see', updatedAt: LATER },
    });
  });

  it('merges several artists in one pass without cross-contamination', async () => {
    const slug = freshSlug();
    setCurrentTimeMs(LATER);
    await setInterest(slug, 'keep-local', 'must_see');
    setCurrentTimeMs(EARLIER);
    await setInterest(slug, 'take-server', 'maybe');

    const merged = await mergeServerInterests(slug, [
      serverEntry(slug, 'keep-local', 'maybe', EARLIER),
      serverEntry(slug, 'take-server', 'will_go', LATER),
      serverEntry(slug, 'server-only', 'maybe', LATER),
    ]);

    expect(merged['keep-local'].status).toBe('must_see');
    expect(merged['take-server'].status).toBe('must_see');
    expect(merged['server-only'].status).toBe('maybe');
  });
});
