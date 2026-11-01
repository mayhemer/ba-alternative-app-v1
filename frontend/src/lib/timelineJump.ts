import { getFestivalDayStart } from '../utils/festivalTime';
import type { DbArtist, DbEvent } from '../types/backend';

// ── Where a set is on the timelines ───────────────────────────────────────────
//
// A set is drawn on the support timeline when its artist is not a band, and on
// the festival day its start falls in (06:00 → 06:00), so a set at 00:35 is on
// the day before. Shared by everything that jumps to a set: the artist sheet's
// set rows and the now pill.

export type TimelineJump = { support: boolean; day: number };

export function timelineJump(artist: DbArtist, event: DbEvent): TimelineJump {
  return { support: !artist.isPlayable, day: getFestivalDayStart(event.dateFrom) };
}
