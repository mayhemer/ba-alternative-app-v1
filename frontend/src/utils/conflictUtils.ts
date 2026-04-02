import type { DbEvent } from '../types/backend';

const EVENT_DURATION_MAX_FOR_CONFLICT_ELIGIBILITY_MS = 2 * 60 * 60 * 1000;

/** Returns true if two events' time ranges intersect (strict overlap). */
export function eventsOverlap(a: DbEvent, b: DbEvent): boolean {
  const durationA = a.dateTo - a.dateFrom;
  if (durationA > EVENT_DURATION_MAX_FOR_CONFLICT_ELIGIBILITY_MS) { return false; }

  const durationB = b.dateTo - b.dateFrom;
  if (durationB > EVENT_DURATION_MAX_FOR_CONFLICT_ELIGIBILITY_MS) { return false; }

  return a.dateFrom < b.dateTo && b.dateFrom < a.dateTo;
}
