import { festivalWeekTime } from './liveSimulation';

// ── Live simulation: every real week plays as the festival week ──────────────
//
// Dimensions: the real weekday (the week's first and last minute, a mid-week
// day); the real season against the festival's (winter time against summer
// time: the wall-clock time stays, the offset follows); the calendar day
// against the festival day (a day's small hours stay on their calendar day,
// though the festival counts them to the day before); a time inside the
// festival week itself.
//
// ba2025: its first festival day is Tuesday 5 August 2025, so its week runs
// Monday 4 – Sunday 10 August.

const FIRST_DAY = Date.parse('2025-08-05T06:00:00+02:00');

it('plays a real Wednesday afternoon in winter as the festival week\'s Wednesday, same wall-clock time', () => {
  expect(festivalWeekTime(Date.parse('2026-11-11T14:10:00+01:00'), FIRST_DAY))
    .toBe(Date.parse('2025-08-06T14:10:00+02:00'));
});

it('starts the week on Monday at midnight', () => {
  expect(festivalWeekTime(Date.parse('2026-11-09T00:00:00+01:00'), FIRST_DAY))
    .toBe(Date.parse('2025-08-04T00:00:00+02:00'));
});

it('ends the week on Sunday at the last minute', () => {
  expect(festivalWeekTime(Date.parse('2026-11-15T23:59:00+01:00'), FIRST_DAY))
    .toBe(Date.parse('2025-08-10T23:59:00+02:00'));
});

it('keeps a day\'s small hours on their calendar day', () => {
  expect(festivalWeekTime(Date.parse('2026-11-11T03:00:00+01:00'), FIRST_DAY))
    .toBe(Date.parse('2025-08-06T03:00:00+02:00'));
});

it('leaves a time inside the festival week where it is', () => {
  const thursdayEvening = Date.parse('2025-08-07T20:00:00+02:00');
  expect(festivalWeekTime(thursdayEvening, FIRST_DAY)).toBe(thursdayEvening);
});
