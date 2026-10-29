import { formatDayLabel, formatTime } from '../../utils/festivalTime';
import type { DbEvent } from '../../types/backend';

// ── The conflict sheet's header: what it shows ────────────────────────────────
//
// When the clash group plays: the calendar date of its first set's start and
// its span, from the first set's start to the last one's end. After midnight
// the date is the next day, as any date is.

export function conflictHeaderWhen(group: DbEvent[]): string {
  const from = Math.min(...group.map((e) => e.dateFrom));
  const to = Math.max(...group.map((e) => e.dateTo));
  return `${formatDayLabel(from)}  ·  ${formatTime(from)}–${formatTime(to)}`;
}
