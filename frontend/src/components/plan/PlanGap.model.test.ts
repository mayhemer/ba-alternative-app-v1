import { gapHeight, planGapModel, GAP_LAYOUT } from './PlanGap.model';
import type { DbEvent } from '../../types/backend';

// ── A gap between sets, as a model ────────────────────────────────────────────
//
// Everything a gap shows — its height, its label, the blue fill and the now
// arrow — comes from one pair of times: where it starts, and the start of the set
// listed under it.

const MIN = 60 * 1000;

function at(hm: string): number {
  return Date.parse(`2025-08-07T${hm}:00+02:00`);
}

function setAt(hm: string): DbEvent {
  return { slug: 'test', eventId: `e${hm}`, dateFrom: at(hm), dateTo: at(hm) + 45 * MIN, artistId: 'a', stageId: 's', categoryId: 'c' };
}

describe('gapHeight', () => {
  it('is a floor plus linear growth, so 35 min and 2 h read clearly apart', () => {
    expect(gapHeight(5)).toBe(23);
    expect(gapHeight(35)).toBe(38);
    expect(gapHeight(120)).toBe(80);
  });

  it('never drops below the floor that fits the label', () => {
    expect(gapHeight(1)).toBeGreaterThanOrEqual(GAP_LAYOUT.minHeight);
  });

  it('is capped for very long breaks', () => {
    expect(gapHeight(400)).toBe(GAP_LAYOUT.maxHeight);
  });
});

describe('planGapModel', () => {
  it('says the length it is drawn for: a 2 h gap is as tall as 2 h and reads "2 h"', () => {
    const gap = planGapModel('g', at('20:30'), setAt('22:30'), at('12:00'), false);
    expect(gap.label).toBe('2 h');
    expect(gap.height).toBe(gapHeight(120));
  });

  it('has no fill and no arrow while now is outside it', () => {
    expect(planGapModel('g', at('18:40'), setAt('19:00'), at('12:00'), false)).toEqual({
      kind: 'gap', key: 'g', opening: false, current: false, label: '20 min', countdownToMaybe: false, height: 30, barTop: 0, progress: 0, nowY: null, conflictTitle: null,
    });
  });

  it('counts down to the set under it while now is inside it, the arrow at the tip of the fill', () => {
    const gap = planGapModel('g', at('20:30'), setAt('22:30'), at('21:10'), false);
    expect(gap.current).toBe(true);
    expect(gap.label).toBe('−1 h 20');
    expect(gap.height).toBe(80);
    expect(gap.progress).toBeCloseTo(40 / 120);
    expect(gap.nowY).toBeCloseTo((40 / 120) * 80);
  });

  it('keeps a current gap tall enough for its countdown', () => {
    const gap = planGapModel('g', at('18:40'), setAt('19:00'), at('18:45'), false);
    expect(gap.label).toBe('−15 min');
    expect(gap.height).toBe(GAP_LAYOUT.currentMinHeight);
  });

  it('is current from its first minute, empty and showing its whole length', () => {
    const gap = planGapModel('g', at('18:40'), setAt('19:00'), at('18:40'), false);
    expect(gap.current).toBe(true);
    expect(gap.progress).toBe(0);
    expect(gap.nowY).toBe(0);
    expect(gap.label).toBe('−20 min');
  });

  it('is no longer current the minute the set under it starts', () => {
    const gap = planGapModel('g', at('18:40'), setAt('19:00'), at('19:00'), false);
    expect(gap.current).toBe(false);
    expect(gap.label).toBe('20 min');
  });

  it('marks its countdown as one to a Maybe when a Maybe is listed under it', () => {
    const gap = planGapModel('g', at('20:30'), setAt('22:30'), at('21:10'), false, 'maybe');
    expect(gap.label).toBe('−1 h 20');
    expect(gap.countdownToMaybe).toBe(true);
  });

  it('marks no countdown to a Maybe under a Must-see, or while now is outside it', () => {
    expect(planGapModel('g', at('20:30'), setAt('22:30'), at('21:10'), false, 'will_go').countdownToMaybe).toBe(false);
    expect(planGapModel('g', at('20:30'), setAt('22:30'), at('12:00'), false, 'maybe').countdownToMaybe).toBe(false);
  });

  it('carries the day-start flag it was built with', () => {
    expect(planGapModel('opening', at('08:00'), setAt('14:00'), at('11:00'), true).opening).toBe(true);
  });

  it('starts the bar of a running gap at its top', () => {
    expect(planGapModel('g', at('20:30'), setAt('22:30'), at('21:10'), false).barTop).toBe(0);
  });

  it('starts the day-start break\'s bar below the start ring, the arrow at the tip of the shorter fill', () => {
    // 08:00 → 14:00 is 6 h: 160 pt tall (capped); at 11:00 half of it has gone.
    const gap = planGapModel('opening', at('08:00'), setAt('14:00'), at('11:00'), true);
    expect(gap.height).toBe(160);
    expect(gap.barTop).toBe(10);
    expect(gap.progress).toBeCloseTo(0.5);
    expect(gap.nowY).toBeCloseTo(85);
  });

  it('puts the arrow right under the start ring in the day-start break\'s first minute', () => {
    const gap = planGapModel('opening', at('08:00'), setAt('14:00'), at('08:00'), true);
    expect(gap.nowY).toBe(10);
  });
});
