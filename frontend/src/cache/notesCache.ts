import AsyncStorage from '@react-native-async-storage/async-storage';
import { realTimeMs } from '../utils/clock';
import type { DbUserNote } from '../types/backend';

// ── My notes, kept on the device ──────────────────────────────────────────────
//
// One note per artist and edition, local-first like the picks: written here at
// once, sent to the server when signed in, and merged with the server's copy by
// the newer updatedAt (NoteContext). A cleared note is an empty text with its
// date, never an absence, so the clear wins over an older text on another device.

export type LocalNote = {
  text: string;      // '' = cleared
  updatedAt: number; // real time (Unix ms), compared with the server's
};

function notesKey(slug: string): string {
  return `user:notes:v1:${slug}`;
}

// Loaded by StartupGate (via hydrateLocalState) before the providers mount and
// kept current by every write, so NoteProvider starts from it synchronously.
const loaded: Record<string, Record<string, LocalNote>> = {};

/** The edition's notes as last loaded or written; empty if never loaded. */
export function getLocalNotes(slug: string): Record<string, LocalNote> {
  return loaded[slug] ?? {};
}

/** Loads an edition's notes from storage into memory. Corrupt data reads as none. */
export async function hydrateNotes(slug: string): Promise<Record<string, LocalNote>> {
  const raw = await AsyncStorage.getItem(notesKey(slug));
  let map: Record<string, LocalNote> = {};
  if (raw !== null) {
    try {
      map = JSON.parse(raw) as Record<string, LocalNote>;
    } catch {
      map = {};
    }
  }
  loaded[slug] = map;
  return map;
}

async function persist(slug: string, map: Record<string, LocalNote>): Promise<void> {
  loaded[slug] = map;
  await AsyncStorage.setItem(notesKey(slug), JSON.stringify(map));
}

/** Saves one artist's note, stamped with the real time. '' clears it. */
export async function setNote(slug: string, artistId: string, text: string): Promise<LocalNote> {
  const record: LocalNote = { text, updatedAt: realTimeMs() };
  await persist(slug, { ...getLocalNotes(slug), [artistId]: record });
  return record;
}

/**
 * Merges the server's notes into the device's: per artist, the newer updatedAt
 * wins; a tie keeps the device's. A text that is not a string reads as cleared.
 */
export async function mergeServerNotes(
  slug: string,
  serverNotes: DbUserNote[],
): Promise<Record<string, LocalNote>> {
  const merged: Record<string, LocalNote> = { ...getLocalNotes(slug) };

  for (const item of serverNotes) {
    // Composite SK is "{slug}#{artistId}"
    const separatorIndex = item.slugArtistId.indexOf('#');
    if (separatorIndex === -1) { continue; }
    const artistId = item.slugArtistId.slice(separatorIndex + 1);

    const existing = merged[artistId];
    if (existing === undefined || item.updatedAt > existing.updatedAt) {
      merged[artistId] = { text: typeof item.text === 'string' ? item.text : '', updatedAt: item.updatedAt };
    }
  }

  await persist(slug, merged);
  return merged;
}
