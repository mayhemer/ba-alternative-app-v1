import { pinchedLevel, pinchToast } from './PlanPinch.model';
import { setLanguageChoice } from '../../../i18n/language';

// ── The filter a pinch on My plan steps to ────────────────────────────────────
//
// Dimensions: the current filter (each of the four) and the pinch's direction.
// A pinch in narrows one step toward Must-see only, a pinch out widens one step
// toward All sets; Only conflicts sits past Must-see only, so a pinch out
// leaves it for Must-see only and a pinch in keeps it.

describe('pinchedLevel', () => {
  it.each([
    ['all', 'in', 'maybe'],
    ['maybe', 'in', 'must'],
    ['must', 'in', 'must'],
    ['conflicts', 'in', 'conflicts'],
    ['all', 'out', 'all'],
    ['maybe', 'out', 'all'],
    ['must', 'out', 'maybe'],
    ['conflicts', 'out', 'must'],
  ] as const)('%s, pinched %s → %s', (level, direction, expected) => {
    expect(pinchedLevel(level, direction)).toBe(expected);
  });
});

// The toast a pinch shows: the filter it leaves on, the same filter again too.
describe('pinchToast', () => {
  afterEach(() => { setLanguageChoice('system'); });

  it.each([
    ['all', 'Showing all sets'],
    ['maybe', 'Showing all my picks'],
    ['must', 'Showing only what I must see'],
    ['conflicts', 'Showing only conflicts'],
  ] as const)('%s → %s', (level, expected) => {
    expect(pinchToast(level)).toBe(expected);
  });

  it.each([
    ['all', 'Zobrazena všechna vystoupení'],
    ['maybe', 'Zobrazeno vše vybrané'],
    ['must', 'Zobrazeno jen co musím vidět'],
    ['conflicts', 'Zobrazeny jen konflikty'],
  ] as const)('in Czech: %s → %s', (level, expected) => {
    setLanguageChoice('cs');
    expect(pinchToast(level)).toBe(expected);
  });
});
