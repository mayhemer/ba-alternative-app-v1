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
 * What a tap on a day's button asks for (shared by the timeline's switcher and
 * My plan's):
 *   - another day than the shown one: pick it ('day');
 *   - the shown day, not today: switch between My plan and the timeline ('switch');
 *   - today's button while today is shown: scroll to now ('now'), or switch once
 *     now is settled on the screen (`nowSettled`, asked only then; none given
 *     counts as not settled).
 */
export function dayPickAction(
  day: number,
  { selected, today }: Omit<DayButtonState, 'clashDays'>,
  nowSettled: () => boolean = () => false,
): 'day' | 'now' | 'switch' {
  if (day !== selected) {
    return 'day';
  }
  if (day !== today) {
    return 'switch';
  }
  return nowSettled() ? 'switch' : 'now';
}

// ── Whether now is settled on a screen ────────────────────────────────────────

/** The central part of the view that counts as "now is in view": 80 %, 10 % in from each edge. */
export const NOW_BAND = 0.8;

/**
 * Where now is on a scrolled screen, along its time axis in content
 * coordinates (the timeline's x, My plan's y).
 */
export type NowView = {
  /** Where now is drawn; null when the screen draws no now mark. */
  now: number | null;
  /** The scroll offset. */
  scroll: number;
  /** How much of the axis is visible. */
  size: number;
  /** Where a scroll to now goes, as far as the view can scroll. */
  nowScroll: number;
};

/**
 * Whether today's button should switch screens rather than scroll to now: now
 * is drawn inside the view's central band, or a scroll to now would not move
 * the view (it cannot get any closer).
 */
export function nowSettled({ now, scroll, size, nowScroll }: NowView): boolean {
  const margin = (size * (1 - NOW_BAND)) / 2;
  if (now !== null && now >= scroll + margin && now <= scroll + size - margin) {
    return true;
  }
  return Math.abs(nowScroll - scroll) < 1;
}
