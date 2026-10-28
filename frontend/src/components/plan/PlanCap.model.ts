import { gapHeight } from './PlanGap.model';
import { CAP_GLYPH } from './planStyles';
import { getFestivalDayStart } from '../timeline/timelineLayout';
import type { DbEvent } from '../../types/backend';

// ── A day cap: what it shows ──────────────────────────────────────────────────
//
// A bare rail before the day's first set (a ring) or after its last (a square),
// with no time behind it. Once the last listed set has ended, and until the
// 06:00 day change, the end cap carries the now arrow, pointing at its square.

/** The caps are drawn as long as a gap of this many minutes. */
const CAP_MINUTES = 20;

export type PlanCapModel = {
  kind: 'cap';
  key: string;
  edge: 'start' | 'end';
  height: number;
  /** The now arrow's centre from the cap's top (the end square) while the day is over but not yet changed, else null. */
  nowY: number | null;
  /** The first set of the clash group right under it: the "Conflict" title it draws. */
  conflictTitle: DbEvent | null;
};

/** What the end cap needs to know to carry the arrow: the end of everything listed, the shown day, now. */
export type EndCapTime = { listedEnd: number; dayStart: number; now: number };

export function planCapModel(edge: 'start' | 'end', time: EndCapTime | null = null): PlanCapModel {
  const height = gapHeight(CAP_MINUTES);
  const dayOver = edge === 'end' && time !== null && time.now >= time.listedEnd && getFestivalDayStart(time.now) === time.dayStart;
  return { kind: 'cap', key: `cap-${edge}`, edge, height, nowY: dayOver ? height - CAP_GLYPH / 2 : null, conflictTitle: null };
}
