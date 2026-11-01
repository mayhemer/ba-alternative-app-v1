import { dayButtonModels, type DayButtonModel } from '../../features/timeline/DayButton.model';
import { daysWithClash } from './planUtils';
import type { ConflictEntry } from '../../lib/conflictUtils';
import { festivalToday } from '../../utils/festivalTime';

// ── My plan's day switcher: what it shows ─────────────────────────────────────
//
// The timeline's day buttons, with what the plan decides for them, all from the
// raw inputs: today from now (festivalToday, the rule the plan's list uses too);
// the shown day; and, only while "Show only conflicts" is on, the days with a
// Must-see clash. Those come from the conflict calculation itself
// (daysWithClash), the source the conflicts-only list follows, so a striped
// day is exactly a day that list has sets on.

export type PlanDaySwitcherInputs = {
  festivalDays: number[];
  /** The day My plan shows (usePlanShownDay). */
  shownDay: number;
  now: number;
  conflictsOnly: boolean;
  /** The conflict calculation's entries (ConflictProvider's). */
  entries: ConflictEntry[];
};

export type PlanDaySwitcherModel = {
  /** The festival day that holds now, or null outside the festival. */
  today: number | null;
  buttons: DayButtonModel[];
};

export function planDaySwitcherModel({ festivalDays, shownDay, now, conflictsOnly, entries }: PlanDaySwitcherInputs): PlanDaySwitcherModel {
  const today = festivalToday(festivalDays, now);
  const clashDays = conflictsOnly ? daysWithClash(entries) : undefined;
  return { today, buttons: dayButtonModels(festivalDays, { selected: shownDay, today, clashDays }) };
}
