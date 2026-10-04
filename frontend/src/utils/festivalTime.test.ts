import { FESTIVAL_TIME_ZONE, festivalUtcOffsetMs, fromFestivalClock, toFestivalClock } from './festivalTime';

// ── Festival time against the time-zone database ──────────────────────────────
//
// festivalTime computes Prague's offset from the EU summer-time rule instead of
// asking Intl. Node ships full ICU, so here the rule can be checked against the
// real database.

const HOUR = 60 * 60 * 1000;

const offsetFormat = new Intl.DateTimeFormat('en-US', { timeZone: FESTIVAL_TIME_ZONE, timeZoneName: 'shortOffset' });

/** The database's offset, from its "GMT+2" style name. */
function icuOffsetMs(utcMs: number): number {
  const name = offsetFormat.formatToParts(new Date(utcMs)).find((p) => p.type === 'timeZoneName')!.value;
  return Number(/GMT([+-]\d+)/.exec(name)![1]) * HOUR;
}

it('agrees with the time-zone database every three hours, 2019 to 2030', () => {
  const mismatches: string[] = [];
  for (let t = Date.UTC(2019, 0, 1); t < Date.UTC(2031, 0, 1); t += 3 * HOUR) {
    if (festivalUtcOffsetMs(t) !== icuOffsetMs(t)) {
      mismatches.push(new Date(t).toISOString());
    }
  }
  expect(mismatches).toEqual([]);
});

it('changes exactly at 01:00 UTC on the last Sundays of March and October', () => {
  for (const change of [Date.parse('2027-03-28T01:00:00Z'), Date.parse('2027-10-31T01:00:00Z')]) {
    expect(festivalUtcOffsetMs(change - 1)).toBe(icuOffsetMs(change - 1));
    expect(festivalUtcOffsetMs(change)).toBe(icuOffsetMs(change));
    expect(festivalUtcOffsetMs(change)).not.toBe(festivalUtcOffsetMs(change - 1));
  }
});

it('reads Prague\'s wall clock through the UTC fields', () => {
  const wall = toFestivalClock(Date.parse('2025-08-07T00:30:00+02:00'));
  expect([wall.getUTCDate(), wall.getUTCHours(), wall.getUTCMinutes()]).toEqual([7, 0, 30]);

  const winter = toFestivalClock(Date.parse('2025-01-15T23:30:00+01:00'));
  expect([winter.getUTCDate(), winter.getUTCHours()]).toEqual([15, 23]);
});

it('turns a wall-clock time back into the instant', () => {
  for (const iso of ['2025-08-06T06:00:00+02:00', '2025-01-15T06:00:00+01:00', '2027-08-03T23:45:00+02:00']) {
    const t = Date.parse(iso);
    expect(fromFestivalClock(toFestivalClock(t).getTime())).toBe(t);
  }
});
