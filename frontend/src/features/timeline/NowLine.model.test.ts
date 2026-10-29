import { nowLineStyle } from './NowLine.model';

// ── The now line, as a model ──────────────────────────────────────────────────
//
// Shown only while now is inside the day's canvas (0 to 24 × 170 = 4080 px).

describe('nowLineStyle', () => {
  it('draws a 1 px line at now inside the day', () => {
    expect(nowLineStyle(1360)).toEqual({ left: 1360, width: 1, opacity: 1 });
  });

  it('hides it at 0, where a time before the day is clamped', () => {
    expect(nowLineStyle(0)).toEqual({ left: 0, width: 0, opacity: 0 });
  });

  it('hides it at and past the end of the day', () => {
    expect(nowLineStyle(4080).opacity).toBe(0);
    expect(nowLineStyle(5000).opacity).toBe(0);
  });

  it('shows it just inside either end', () => {
    expect(nowLineStyle(0.5).opacity).toBe(1);
    expect(nowLineStyle(4079).opacity).toBe(1);
  });
});
