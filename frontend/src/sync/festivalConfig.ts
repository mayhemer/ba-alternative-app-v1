// Festival date configuration.
// Used to determine the appropriate sync polling interval.
// Update these dates each year before a new edition goes live.
//
// Timestamps are Unix epoch milliseconds (Date.now() format).

export type FestivalConfig = {
  slug: string;
  startDate: number; // festival start (first day, 00:00 local time)
  endDate: number;   // festival end   (last day, 23:59 local time)
};

// Brutal Assault runs at Josefov fortress, CZ: the main programme is the first
// Wednesday of August through the Saturday, preceded by the Tuesday warm-up.
// The spans below cover the full schedule including that warm-up — Tue 00:00
// through Sat 23:59, five days.
export const FESTIVAL_CONFIGS: FestivalConfig[] = [
  {
    slug: 'ba2019',
    startDate: new Date('2019-08-06T00:00:00+02:00').getTime(),
    endDate:   new Date('2019-08-10T23:59:59+02:00').getTime(),
  },
  // No 2020 or 2021 edition — both were cancelled (COVID-19).
  {
    slug: 'ba2022',
    startDate: new Date('2022-08-02T00:00:00+02:00').getTime(),
    endDate:   new Date('2022-08-06T23:59:59+02:00').getTime(),
  },
  {
    slug: 'ba2023',
    startDate: new Date('2023-08-01T00:00:00+02:00').getTime(),
    endDate:   new Date('2023-08-05T23:59:59+02:00').getTime(),
  },
  {
    slug: 'ba2024',
    startDate: new Date('2024-08-06T00:00:00+02:00').getTime(),
    endDate:   new Date('2024-08-10T23:59:59+02:00').getTime(),
  },
  {
    slug: 'ba2025',
    startDate: new Date('2025-08-05T00:00:00+02:00').getTime(),
    endDate:   new Date('2025-08-09T23:59:59+02:00').getTime(),
  },
  {
    slug: 'ba2026',
    startDate: new Date('2026-08-04T00:00:00+02:00').getTime(),
    endDate:   new Date('2026-08-08T23:59:59+02:00').getTime(),
  },
  {
    slug: 'ba2027',
    startDate: new Date('2027-08-03T00:00:00+02:00').getTime(),
    endDate:   new Date('2027-08-07T23:59:59+02:00').getTime(),
  },
];

// Sync intervals in milliseconds.
//
// The during-festival poll is the single most-requested path in the backend:
// every running app hits it on this timer. At one minute it produced roughly
// three times the requests of a three-minute poll for no practical gain — a
// schedule change still surfaces within a few minutes either way.
export const SYNC_INTERVAL_BEFORE_FESTIVAL_MS = 30 * 60 * 1000; // 30 minutes
export const SYNC_INTERVAL_DURING_FESTIVAL_MS =  3 * 60 * 1000; //  3 minutes
export const SYNC_INTERVAL_DEFAULT_MS          =  5 * 60 * 1000; //  5 minutes (fallback)

export function getSyncInterval(slug: string): number {
  const now = Date.now();
  const config = FESTIVAL_CONFIGS.find((c) => c.slug === slug);

  if (config === undefined) {
    return SYNC_INTERVAL_DEFAULT_MS;
  }

  if (now >= config.startDate && now <= config.endDate) {
    return SYNC_INTERVAL_DURING_FESTIVAL_MS;
  }

  return SYNC_INTERVAL_BEFORE_FESTIVAL_MS;
}
