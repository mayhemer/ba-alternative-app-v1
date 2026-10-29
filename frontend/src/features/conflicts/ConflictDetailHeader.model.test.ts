import { conflictHeaderWhen } from './ConflictDetailHeader.model';
import type { DbEvent } from '../../types/backend';

// ── The conflict sheet's header, as a model ───────────────────────────────────
//
// The calendar date of the group's first start, and the span from the first
// start to the last end, in festival time, whatever order the sets come in.

const at = (iso: string): number => Date.parse(iso);
const set = (from: string, to: string): DbEvent =>
  ({ slug: 't', eventId: from, artistId: 'a', stageId: 's', categoryId: 'c', dateFrom: at(from), dateTo: at(to) });

describe('conflictHeaderWhen', () => {
  it('spans from the first start to the last end, in any order', () => {
    expect(conflictHeaderWhen([
      set('2025-08-06T14:30:00+02:00', '2025-08-06T15:05:00+02:00'),
      set('2025-08-06T14:00:00+02:00', '2025-08-06T14:40:00+02:00'),
    ])).toBe('Wed 6  ·  14:00–15:05');
  });

  it('dates a group after midnight to the next day', () => {
    expect(conflictHeaderWhen([
      set('2025-08-07T00:30:00+02:00', '2025-08-07T01:15:00+02:00'),
      set('2025-08-07T00:35:00+02:00', '2025-08-07T01:30:00+02:00'),
    ])).toBe('Thu 7  ·  00:30–01:30');
  });

  it('keeps the start\'s date for a group that runs past midnight', () => {
    expect(conflictHeaderWhen([
      set('2025-08-06T23:30:00+02:00', '2025-08-07T00:30:00+02:00'),
      set('2025-08-07T00:00:00+02:00', '2025-08-07T00:45:00+02:00'),
    ])).toBe('Wed 6  ·  23:30–00:45');
  });
});
