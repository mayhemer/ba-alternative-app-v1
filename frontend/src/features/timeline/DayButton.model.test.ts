import { dayButtonModels, dayPickAction, nowSettled } from './DayButton.model';

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

  it('switches screens on a tap of the shown day outside the festival: there is no now to scroll to', () => {
    expect(dayPickAction(WED, { selected: WED, today: null })).toBe('switch');
  });
});

// ── Tapping the shown day again ───────────────────────────────────────────────
//
// Dimensions: the button tapped (the shown day, another day) × whether it is
// today × whether now is settled on the screen (nowSettled, asked only for
// today's button while today is shown).

describe('dayPickAction, tapping the shown day again', () => {
  const settled = (): boolean => true;
  const notSettled = (): boolean => false;

  it('switches screens on a tap of the shown day that is not today', () => {
    expect(dayPickAction(FRI, { selected: FRI, today: THU }, notSettled)).toBe('switch');
  });

  it("scrolls to now on a tap of today's button while today is shown and now is not settled", () => {
    expect(dayPickAction(THU, { selected: THU, today: THU }, notSettled)).toBe('now');
  });

  it("switches screens on a tap of today's button while today is shown and now is settled", () => {
    expect(dayPickAction(THU, { selected: THU, today: THU }, settled)).toBe('switch');
  });

  it('picks another day whether or not now is settled', () => {
    expect(dayPickAction(FRI, { selected: THU, today: THU }, settled)).toBe('day');
    expect(dayPickAction(THU, { selected: FRI, today: THU }, settled)).toBe('day');
  });

  it("asks whether now is settled only for today's button while today is shown", () => {
    const probe = jest.fn((): boolean => true);
    dayPickAction(FRI, { selected: THU, today: THU }, probe);
    dayPickAction(FRI, { selected: FRI, today: THU }, probe);
    expect(probe).not.toHaveBeenCalled();
    dayPickAction(THU, { selected: THU, today: THU }, probe);
    expect(probe).toHaveBeenCalledTimes(1);
  });
});

// ── Whether now is settled on a screen ────────────────────────────────────────
//
// Positions along the screen's time axis, in content coordinates: a view 400
// long scrolled to 1000 shows 1000–1400; its central 80 % is 1040–1360.
// Dimensions: where now is drawn (inside the band, at each edge, just outside,
// not drawn at all) × whether a scroll to now would move the view.

describe('nowSettled', () => {
  const view = { scroll: 1000, size: 400 };
  const far = 3000;

  it('now in the middle of the view', () => {
    expect(nowSettled({ ...view, now: 1200, nowScroll: far })).toBe(true);
  });

  it('now at the band edges, 10 % and 90 % in', () => {
    expect(nowSettled({ ...view, now: 1040, nowScroll: far })).toBe(true);
    expect(nowSettled({ ...view, now: 1360, nowScroll: far })).toBe(true);
  });

  it('now just outside the band, though still on screen', () => {
    expect(nowSettled({ ...view, now: 1039, nowScroll: far })).toBe(false);
    expect(nowSettled({ ...view, now: 1361, nowScroll: far })).toBe(false);
  });

  it('now off screen, but a scroll to now would not move the view: the view cannot get closer', () => {
    expect(nowSettled({ ...view, now: 1395, nowScroll: 1000 })).toBe(true);
    expect(nowSettled({ ...view, now: 1395, nowScroll: 1000.5 })).toBe(true);
  });

  it('now off screen and a scroll to now would move the view', () => {
    expect(nowSettled({ ...view, now: 1395, nowScroll: 1002 })).toBe(false);
  });

  it('no now drawn: settled only where a scroll to now goes', () => {
    expect(nowSettled({ ...view, now: null, nowScroll: 1000 })).toBe(true);
    expect(nowSettled({ ...view, now: null, nowScroll: 0 })).toBe(false);
  });
});
