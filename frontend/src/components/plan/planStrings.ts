import { DEFAULT_LANG } from '../../utils/localization';

// ── My plan copy ──────────────────────────────────────────────────────────────
//
// Every string My plan and the now pill show lives here, so a later i18n pass is
// a drop-in. The screen speaks through icons, numbers and bars; the few words
// are short labels. Czech copy runs longer, so layouts truncate names and never
// wrap statuses. The app shows English today (DEFAULT_LANG).

type PlanStrings = {
  title: string;
  live: string;
  done: string;
  start: string;
  conflict: string;
  showMaybe: string;
  conflictsOnly: string;
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
  conflict: 'Conflict',
  showMaybe: 'Show Maybe picks',
  conflictsOnly: 'Show only conflicts',
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
  conflict: 'Konflikt',
  showMaybe: 'Zobrazit výběry Možná',
  conflictsOnly: 'Zobrazit jen konflikty',
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

/** Narrow no-break space (U+202F): keeps a number and its unit apart at half a space's width. */
export const NARROW_SPACE = '\u202F';

/** "37 min", "1 h 20", "3 h" — always "min", never "m". `space` joins numbers and units. */
export function formatDuration(ms: number, space = ' '): string {
  const minutes = Math.round(ms / MINUTE_MS);
  if (minutes < 60) {
    return `${minutes}${space}min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) {
    return `${hours}${space}h`;
  }
  return `${hours}${space}h${space}${String(rest).padStart(2, '0')}`;
}

/** Time left, with a real minus sign (U+2212): "−37 min". */
export function formatRemaining(ms: number, space = ' '): string {
  return `−${formatDuration(ms, space)}`;
}
