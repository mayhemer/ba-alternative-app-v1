import { dayButtonModels, dayPickAction } from './DayButton.model';

// ── The festival day buttons, as models ───────────────────────────────────────
//
// Dimensions:
//   festival — now before the first day, on a day (its 06:00 start, midday, the
//              05:59 before the next day), after the last day; no days at all
//   selection — the selected day is today, or another day
//   marks     — no clash days given, or some
// Everything a button shows comes from its day and those three inputs.

const at = (iso: string): number => Date.parse(iso);

const WED = at('2025-08-06T06:00:00+02:00');
const THU = at('2025-08-07T06:00:00+02:00');
const FRI = at('2025-08-08T06:00:00+02:00');
const SAT = at('2025-08-09T06:00:00+02:00');
const DAYS = [WED, THU, FRI, SAT];

describe('dayButtonModels', () => {
  it('names each day and marks the selected one, today and the clash days', () => {
    expect(dayButtonModels([WED, THU, FRI], { selected: FRI, today: THU, clashDays: new Set([WED]) })).toEqual([
      { key: `day-${WED}`, day: WED, weekday: 'Wed', dayMonth: '6.8.', selected: false, today: false, clash: true },
      { key: `day-${THU}`, day: THU, weekday: 'Thu', dayMonth: '7.8.', selected: false, today: true, clash: false },
      { key: `day-${FRI}`, day: FRI, weekday: 'Fri', dayMonth: '8.8.', selected: true, today: false, clash: false },
    ]);
  });

  it('selects today when today is shown', () => {
    const [thu] = dayButtonModels([THU], { selected: THU, today: THU });
    expect(thu.selected).toBe(true);
    expect(thu.today).toBe(true);
  });

  it('marks no day as today outside the festival', () => {
    expect(dayButtonModels(DAYS, { selected: WED, today: null }).map((b) => b.today)).toEqual([false, false, false, false]);
  });

  it('marks no clash when no clash days are given', () => {
    expect(dayButtonModels(DAYS, { selected: WED, today: null }).map((b) => b.clash)).toEqual([false, false, false, false]);
  });
});

describe('dayPickAction', () => {
  it("scrolls to now on a tap of today's button while today is shown", () => {
    expect(dayPickAction(THU, { selected: THU, today: THU })).toBe('now');
  });

  it("picks today on a tap of today's button while another day is shown", () => {
    expect(dayPickAction(THU, { selected: FRI, today: THU })).toBe('day');
  });

  it('picks another day while today is shown', () => {
    expect(dayPickAction(FRI, { selected: THU, today: THU })).toBe('day');
  });

  it('picks the shown day again outside the festival: there is no now to scroll to', () => {
    expect(dayPickAction(WED, { selected: WED, today: null })).toBe('day');
  });
});
