import { formatDayMonth, formatWeekday } from '../../utils/festivalTime';

// ── A festival day button: what it shows ──────────────────────────────────────
//
// Shared by the timeline's day switcher and My plan's. Everything a button shows
// comes from its day and three inputs: the day its screen shows (filled accent),
// today (the red notch on top) and the days to mark with the clash stripe (My
// plan, while only conflicts are shown).

export type DayButtonModel = {
  /** `day-<day>`: its key in a row of buttons and in render counts. */
  key: string;
  /** Unix ms of the day's 06:00. */
  day: number;
  /** "Thu". */
  weekday: string;
  /** "7.8.". */
  dayMonth: string;
  /** Filled accent: the day its screen shows. */
  selected: boolean;
  /** The red notch: the festival day that holds now. */
  today: boolean;
  /** The clash stripe on its right edge. */
  clash: boolean;
};

type DayButtonState = {
  /** The day the screen shows. */
  selected: number;
  /** The festival day that holds now, or null outside the festival (festivalToday). */
  today: number | null;
  clashDays?: ReadonlySet<number>;
};

/** One button per festival day, in order. */
export function dayButtonModels(days: readonly number[], { selected, today, clashDays }: DayButtonState): DayButtonModel[] {
  return days.map((day) => ({
    key: `day-${day}`,
    day,
    weekday: formatWeekday(day),
    dayMonth: formatDayMonth(day),
    selected: day === selected,
    today: day === today,
    clash: clashDays?.has(day) === true,
  }));
}

/**
 * What a tap on a day's button asks for: tapping today's button while today is
 * shown scrolls to now; any other tap picks that day.
 */
export function dayPickAction(day: number, { selected, today }: Omit<DayButtonState, 'clashDays'>): 'now' | 'day' {
  return day === selected && day === today ? 'now' : 'day';
}
