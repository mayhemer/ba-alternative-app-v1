import type { DbEvent } from '../types/backend';

/** Returns true if two events' time ranges intersect (strict overlap). */
export function eventsOverlap(a: DbEvent, b: DbEvent): boolean {
  return a.dateFrom < b.dateTo && b.dateFrom < a.dateTo;
}
