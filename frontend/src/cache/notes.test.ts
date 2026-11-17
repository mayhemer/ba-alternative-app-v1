import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getLocalNotes,
  hydrateNotes,
  mergeServerNotes,
  setNote,
  type LocalNote,
} from './notesCache';
import { setClockShift, setCurrentTimeMs } from '../utils/clock';
import type { DbUserNote } from '../types/backend';

// ── My notes: local-first, merged newer-updatedAt-wins ────────────────────────
//
// The same contract as the picks (interests.test.ts): a note is one value per
// artist, and the newer edit wins whole. A cleared note is an empty text with a
// date, never an absence, so the clear wins over an older text elsewhere.

let slugCounter = 0;
const freshSlug = (): string => `notetest${++slugCounter}`;

const T = (iso: string): number => Date.parse(iso);
const EARLIER = T('2026-08-05T10:00:00+02:00');
const LATER = T('2026-08-05T11:00:00+02:00');

function serverNote(slug: string, artistId: string, text: string, updatedAt: number): DbUserNote {
  return { userId: 'u1', slugArtistId: `${slug}#${artistId}`, text, updatedAt };
}

async function storedFor(slug: string): Promise<Record<string, LocalNote>> {
  const raw = await AsyncStorage.getItem(`user:notes:v1:${slug}`);
  return raw === null ? {} : JSON.parse(raw);
}

// ── Local writes ──────────────────────────────────────────────────────────────

describe('saving a note locally', () => {
  it('stamps it with the app clock', async () => {
    const slug = freshSlug();
    setCurrentTimeMs(LATER);

    const record = await setNote(slug, 'a1', 'Front left');

    expect(record).toEqual({ text: 'Front left', updatedAt: LATER });
  });

  it('persists, so a cold start keeps the note', async () => {
    const slug = freshSlug();
    setCurrentTimeMs(LATER);
    await setNote(slug, 'a1', 'Front left');

    expect(await hydrateNotes(slug)).toEqual({ a1: { text: 'Front left', updatedAt: LATER } });
  });

  it('is in memory at once, for the provider to start from', async () => {
    const slug = freshSlug();
    setCurrentTimeMs(LATER);
    await setNote(slug, 'a1', 'Front left');

    expect(getLocalNotes(slug)).toEqual({ a1: { text: 'Front left', updatedAt: LATER } });
  });

  it('keeps a cleared note as an empty text with its date', async () => {
    const slug = freshSlug();
    setCurrentTimeMs(EARLIER);
    await setNote(slug, 'a1', 'Front left');
    setCurrentTimeMs(LATER);
    await setNote(slug, 'a1', '');

    expect((await hydrateNotes(slug)).a1).toEqual({ text: '', updatedAt: LATER });
  });

  it('leaves the other artists\' notes alone', async () => {
    const slug = freshSlug();
    setCurrentTimeMs(EARLIER);
    await setNote(slug, 'a1', 'one');
    await setNote(slug, 'a2', 'two');

    expect(Object.keys(await storedFor(slug)).sort()).toEqual(['a1', 'a2']);
  });

  it('starts empty for an edition with no stored notes', async () => {
    expect(await hydrateNotes(freshSlug())).toEqual({});
  });

  it('starts empty when the stored value is corrupt', async () => {
    const slug = freshSlug();
    await AsyncStorage.setItem(`user:notes:v1:${slug}`, '{not json');

    expect(await hydrateNotes(slug)).toEqual({});
  });
});

// ── Merge ─────────────────────────────────────────────────────────────────────

describe('merging the server\'s copy', () => {
  it('adopts a note the device has never seen', async () => {
    const slug = freshSlug();
    await hydrateNotes(slug);

    const merged = await mergeServerNotes(slug, [serverNote(slug, 'a1', 'From the phone', LATER)]);

    expect(merged.a1).toEqual({ text: 'From the phone', updatedAt: LATER });
  });

  it('keeps a local note the server has never seen', async () => {
    const slug = freshSlug();
    setCurrentTimeMs(LATER);
    await setNote(slug, 'local-only', 'Written signed out');

    const merged = await mergeServerNotes(slug, []);

    expect(merged['local-only']).toEqual({ text: 'Written signed out', updatedAt: LATER });
  });

  it('lets the newer server edit win', async () => {
    const slug = freshSlug();
    setCurrentTimeMs(EARLIER);
    await setNote(slug, 'a1', 'old');

    const merged = await mergeServerNotes(slug, [serverNote(slug, 'a1', 'new', LATER)]);

    expect(merged.a1).toEqual({ text: 'new', updatedAt: LATER });
  });

  it('lets the newer local edit win', async () => {
    const slug = freshSlug();
    setCurrentTimeMs(LATER);
    await setNote(slug, 'a1', 'new');

    const merged = await mergeServerNotes(slug, [serverNote(slug, 'a1', 'old', EARLIER)]);

    expect(merged.a1).toEqual({ text: 'new', updatedAt: LATER });
  });

  it('lets a newer server clear remove an older local note', async () => {
    const slug = freshSlug();
    setCurrentTimeMs(EARLIER);
    await setNote(slug, 'a1', 'old');

    const merged = await mergeServerNotes(slug, [serverNote(slug, 'a1', '', LATER)]);

    expect(merged.a1).toEqual({ text: '', updatedAt: LATER });
  });

  it('lets a newer local clear stand over an older server note', async () => {
    const slug = freshSlug();
    setCurrentTimeMs(LATER);
    await setNote(slug, 'a1', '');

    const merged = await mergeServerNotes(slug, [serverNote(slug, 'a1', 'old', EARLIER)]);

    expect(merged.a1).toEqual({ text: '', updatedAt: LATER });
  });

  it('keeps the local note when the timestamps are identical', async () => {
    const slug = freshSlug();
    setCurrentTimeMs(LATER);
    await setNote(slug, 'a1', 'local');

    const merged = await mergeServerNotes(slug, [serverNote(slug, 'a1', 'server', LATER)]);

    expect(merged.a1.text).toBe('local');
  });

  it('skips a malformed composite key rather than inventing an artist', async () => {
    const slug = freshSlug();
    await hydrateNotes(slug);

    const merged = await mergeServerNotes(slug, [
      { userId: 'u1', slugArtistId: 'no-separator', text: 'x', updatedAt: LATER },
    ]);

    expect(merged).toEqual({});
  });

  it('reads the artist id from the first separator only', async () => {
    const slug = freshSlug();
    await hydrateNotes(slug);

    const merged = await mergeServerNotes(slug, [
      { userId: 'u1', slugArtistId: `${slug}#a#1`, text: 'x', updatedAt: LATER },
    ]);

    expect(Object.keys(merged)).toEqual(['a#1']);
  });

  it('takes a text that is not a string as a cleared note', async () => {
    const slug = freshSlug();
    await hydrateNotes(slug);

    const merged = await mergeServerNotes(slug, [
      { userId: 'u1', slugArtistId: `${slug}#a1`, text: 42 as unknown as string, updatedAt: LATER },
    ]);

    expect(merged.a1).toEqual({ text: '', updatedAt: LATER });
  });

  it('persists the merge, so the next cold start starts from it', async () => {
    const slug = freshSlug();
    setCurrentTimeMs(EARLIER);
    await setNote(slug, 'a1', 'mine');

    await mergeServerNotes(slug, [serverNote(slug, 'a2', 'theirs', LATER)]);

    expect(await storedFor(slug)).toEqual({
      a1: { text: 'mine', updatedAt: EARLIER },
      a2: { text: 'theirs', updatedAt: LATER },
    });
  });
});

// ── Under a time mode ─────────────────────────────────────────────────────────

describe('a note saved while the app shows another time', () => {
  afterEach(() => {
    setClockShift(null);
    jest.useRealTimers();
  });

  it('is stamped with the real time, which the server\'s timestamps are compared with', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(LATER);
    setClockShift(() => EARLIER);
    const slug = freshSlug();

    const record = await setNote(slug, 'a1', 'x');

    expect(record).toEqual({ text: 'x', updatedAt: LATER });
  });
});
