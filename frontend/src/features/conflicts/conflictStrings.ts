import { DEFAULT_LANG } from '../../utils/localization';

// ── Conflict copy ─────────────────────────────────────────────────────────────
//
// The words for a clash, wherever it shows: the conflict sheet, the drawer's
// conflict count and My plan's rows. The app shows English today (DEFAULT_LANG).

type ConflictStrings = {
  conflict: string;
  conflictsLabel: (count: number) => string;
};

const EN: ConflictStrings = {
  conflict: 'Conflict',
  conflictsLabel: (count) => `${count} ${count === 1 ? 'conflict' : 'conflicts'}`,
};

const CS: ConflictStrings = {
  conflict: 'Konflikt',
  conflictsLabel: (count) => `${count} ${czechConflictWord(count)}`,
};

/** Czech plural: 1 konflikt, 2–4 konflikty, 5+ (and 0) konfliktů. */
function czechConflictWord(count: number): string {
  if (count === 1) { return 'konflikt'; }
  if (count >= 2 && count <= 4) { return 'konflikty'; }
  return 'konfliktů';
}

export function conflictStrings(lang: string = DEFAULT_LANG): ConflictStrings {
  return lang === 'cs' ? CS : EN;
}
