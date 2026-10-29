import { CANVAS_WIDTH } from './timelineLayout';

// ── The now line: what it shows ───────────────────────────────────────────────
//
// A 1 px line at now's x on the day's canvas (useNowX), shown only while now is
// inside the day. Runs on the UI thread, as a worklet.

export type NowLineStyle = { left: number; width: number; opacity: number };

export function nowLineStyle(x: number): NowLineStyle {
  'worklet';
  // timeToX clamps a time before the day to 0, so 0 means "not today" too.
  const visible = x > 0 && x < CANVAS_WIDTH;
  return { left: x, width: visible ? 1 : 0, opacity: visible ? 1 : 0 };
}
