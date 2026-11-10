// ── Durations ─────────────────────────────────────────────────────────────────
//
// How My plan, the now pill and the lock-screen now card write a length of time.
// The same in English and Czech ("h", "min"), so not in i18n/strings.ts.

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
