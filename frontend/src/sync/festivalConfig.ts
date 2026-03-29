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

// Brutal Assault typically runs for ~5 days in August at Josefov fortress, CZ.
// Placeholder dates — update before each edition.
export const FESTIVAL_CONFIGS: FestivalConfig[] = [
  {
    slug: 'ba2024',
    startDate: new Date('2024-08-07T00:00:00+02:00').getTime(),
    endDate:   new Date('2024-08-11T23:59:59+02:00').getTime(),
  },
  {
    slug: 'ba2025',
    startDate: new Date('2025-08-06T00:00:00+02:00').getTime(),
    endDate:   new Date('2025-08-10T23:59:59+02:00').getTime(),
  },
  {
    slug: 'ba2026',
    startDate: new Date('2026-08-05T00:00:00+02:00').getTime(),
    endDate:   new Date('2026-08-09T23:59:59+02:00').getTime(),
  },
];

// Sync intervals in milliseconds
export const SYNC_INTERVAL_BEFORE_FESTIVAL_MS = 30 * 60 * 1000; // 30 minutes
export const SYNC_INTERVAL_DURING_FESTIVAL_MS =      60 * 1000; //  1 minute
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
