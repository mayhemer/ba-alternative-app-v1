import { getFestivalDayStart } from '../timeline/timelineLayout';
import { formatDayTitle } from './planStrings';

// ── The day title: what it shows ──────────────────────────────────────────────
//
// The shown day's weekday and date, toned by where the day sits relative to
// today: today, a past or a future festival day, or any day outside the festival.

export const TITLE_HEIGHT = 32;

export type DayTone = 'today' | 'past' | 'future' | 'outside';

export type PlanTitleModel = { kind: 'title'; key: 'title'; height: number; tone: DayTone; weekday: string; date: string };

/** `now` is the wall clock; `duringFestival` whether today is a festival day. */
export function planDayTitleModel(dayStart: number, now: number, duringFestival: boolean): PlanTitleModel {
  const today = getFestivalDayStart(now);
  let tone: DayTone = 'outside';
  if (duringFestival) {
    if (dayStart === today) {
      tone = 'today';
    } else {
      tone = dayStart < today ? 'past' : 'future';
    }
  }
  return { kind: 'title', key: 'title', height: TITLE_HEIGHT, tone, ...formatDayTitle(dayStart) };
}
