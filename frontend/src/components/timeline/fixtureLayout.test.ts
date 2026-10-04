import { getFestivalDayStart, VIEW_END_H, VIEW_START_H } from './timelineLayout';
import type { DbArtist, DbEvent } from '../../types/backend';

import artists2024 from '../../../tests/fixtures/generated/ba2024/artists.json';
import schedule2024 from '../../../tests/fixtures/generated/ba2024/schedule.json';
import artists2025 from '../../../tests/fixtures/generated/ba2025/artists.json';
import schedule2025 from '../../../tests/fixtures/generated/ba2025/schedule.json';

// ── Real schedules against the timeline's layout assumptions ──────────────────
//
// The timeline makes two assumptions about the data that nothing else checks:
//
//  - every event lies inside the scrollable window (08:30 → 04:00 next day);
//    anything outside is clipped, and a set clipped whole is simply not there;
//  - on the main programme, sets on one stage do not overlap. That is a property
//    of the data, not something the layout handles: the main timeline is drawn
//    without sub-rows, so overlapping sets would sit on top of each other.
//
// Both are checked against the captured editions, so a refreshed capture or a
// changed normalizer that breaks either shows up here rather than on a phone.
// The window is festival time (Europe/Prague), whatever zone the suite runs in.

const HOUR = 60 * 60 * 1000;

const EDITIONS = {
  ba2024: { artists: artists2024 as unknown as DbArtist[], events: schedule2024 as unknown as DbEvent[] },
  ba2025: { artists: artists2025 as unknown as DbArtist[], events: schedule2025 as unknown as DbEvent[] },
};

/**
 * Malformed input already in the captures, as "later / earlier" pairs: ba2024's
 * KAL stage has a 3½-hour IGRA / CYBERSHEEP slot from midnight that two other
 * KAL sets overlap. Main-programme data is expected never to overlap, so these
 * are listed only to hold every *other* set to the rule — a new entry here means
 * bad data, not a layout to support.
 */
const KNOWN_OVERLAPS: Record<keyof typeof EDITIONS, string[]> = {
  ba2024: [
    'SPIT MASK / IGRA / CYBERSHEEP',
    'IGRA / CYBERSHEEP / DESTRUCTION DERBY',
  ],
  ba2025: [],
};

describe.each(Object.keys(EDITIONS) as (keyof typeof EDITIONS)[])('%s', (slug) => {
  const { artists, events } = EDITIONS[slug];
  const byId = new Map(artists.map((a) => [a.artistId, a]));

  it('has every event inside the scrollable window', () => {
    const outside = events
      .filter((e) => {
        const dayStart = getFestivalDayStart(e.dateFrom);
        return (e.dateFrom - dayStart) / HOUR < VIEW_START_H || (e.dateTo - dayStart) / HOUR > VIEW_END_H;
      })
      .map((e) => `${byId.get(e.artistId)?.name ?? e.artistId} ${new Date(e.dateFrom).toISOString()}`);

    expect(outside).toEqual([]);
  });

  it('has no overlapping sets on one main-programme stage beyond the known ones', () => {
    const lanes = new Map<string, DbEvent[]>();
    for (const e of events) {
      if (byId.get(e.artistId)?.isPlayable !== true) {
        continue;
      }
      const key = `${e.categoryId}_${getFestivalDayStart(e.dateFrom)}`;
      lanes.set(key, [...(lanes.get(key) ?? []), e]);
    }

    const overlaps: string[] = [];
    for (const lane of lanes.values()) {
      lane.sort((a, b) => a.dateFrom - b.dateFrom);
      for (let i = 1; i < lane.length; i++) {
        if (lane[i].dateFrom < lane[i - 1].dateTo) {
          overlaps.push(`${byId.get(lane[i].artistId)!.name} / ${byId.get(lane[i - 1].artistId)!.name}`);
        }
      }
    }

    expect(overlaps.sort()).toEqual([...KNOWN_OVERLAPS[slug]].sort());
  });
});
