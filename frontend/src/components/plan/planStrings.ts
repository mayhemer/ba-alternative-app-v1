import { toFestivalClock } from '../../utils/festivalTime';
import { DEFAULT_LANG } from '../../utils/localization';

// ── My plan copy ──────────────────────────────────────────────────────────────
//
// Every string My plan and the now pill show lives here, so a later i18n pass is
// a drop-in. The screen speaks through icons, numbers and bars; the few words
// are short labels. Czech copy runs longer, so layouts truncate names and never
// wrap statuses. The app shows English today (DEFAULT_LANG).

export type PlanStrings = {
  title: string;
  live: string;
  done: string;
  start: string;
  till: string;
  conflict: string;
  showMaybe: string;
  conflictsOnly: string;
  endOfDay: string;
  empty: string;
  emptyConflicts: string;
  filters: string;
  close: string;
  conflictsLabel: (count: number) => string;
};

const EN: PlanStrings = {
  title: 'My plan',
  live: 'LIVE',
  done: 'done',
  start: 'START',
  till: 'till',
  conflict: 'Conflict',
  showMaybe: 'Show Maybe picks',
  conflictsOnly: 'Show only conflicts',
  endOfDay: 'End of the day',
  empty: 'Nothing planned for this day',
  emptyConflicts: 'No conflicts on this day',
  filters: 'Filters',
  close: 'Close',
  conflictsLabel: (count) => `${count} ${count === 1 ? 'conflict' : 'conflicts'}`,
};

const CS: PlanStrings = {
  title: 'Můj plán',
  live: 'HRAJE',
  done: 'odehráno',
  start: 'ZAČÍNÁ',
  till: 'do',
  conflict: 'Konflikt',
  showMaybe: 'Zobrazit výběry Možná',
  conflictsOnly: 'Zobrazit jen konflikty',
  endOfDay: 'Konec dne',
  empty: 'Na tento den nic v plánu',
  emptyConflicts: 'V tento den žádné konflikty',
  filters: 'Filtry',
  close: 'Zavřít',
  conflictsLabel: (count) => `${count} ${czechConflictWord(count)}`,
};

/** Czech plural: 1 konflikt, 2–4 konflikty, 5+ (and 0) konfliktů. */
function czechConflictWord(count: number): string {
  if (count === 1) { return 'konflikt'; }
  if (count >= 2 && count <= 4) { return 'konflikty'; }
  return 'konfliktů';
}

export function planStrings(lang: string = DEFAULT_LANG): PlanStrings {
  return lang === 'cs' ? CS : EN;
}

// ── Durations ─────────────────────────────────────────────────────────────────

const MINUTE_MS = 60 * 1000;

/** "37 min", "1 h 20", "3 h" — always "min", never "m". */
export function formatDuration(ms: number): string {
  const minutes = Math.round(ms / MINUTE_MS);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${String(rest).padStart(2, '0')}`;
}

/** Time left, with a real minus sign (U+2212): "−37 min". */
export function formatRemaining(ms: number): string {
  return `−${formatDuration(ms)}`;
}

// ── Day title ─────────────────────────────────────────────────────────────────

const WEEKDAYS: Record<'en' | 'cs', string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  cs: ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'],
};

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Thursday" + "7 Aug" (en) / "Čtvrtek" + "7. 8." (cs), in festival time. */
export function formatDayTitle(dayStart: number, lang: string = DEFAULT_LANG): { weekday: string; date: string } {
  const wall = toFestivalClock(dayStart);
  const day = wall.getUTCDate();
  const month = wall.getUTCMonth();
  if (lang === 'cs') {
    return { weekday: WEEKDAYS.cs[wall.getUTCDay()], date: `${day}. ${month + 1}.` };
  }
  return { weekday: WEEKDAYS.en[wall.getUTCDay()], date: `${day} ${MONTHS_EN[month]}` };
}
